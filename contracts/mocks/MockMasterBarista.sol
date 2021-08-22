// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../library/LinkList.sol";
import "../farm/interfaces/ILATTE.sol";
import "../farm/interfaces/IBeanBag.sol";
import "../farm/interfaces/IMasterBarista.sol";
import "../farm/interfaces/IMasterBaristaCallback.sol";

/// @notice MockMasterBarista is a smart contract for distributing LATTE by asking user to stake the BEP20-based token.
contract MockMasterBarista is IMasterBarista, Ownable, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;
  using LinkList for LinkList.List;
  using Address for address;

  // Info of each user.
  struct UserInfo {
    uint256 amount; // How many Staking tokens the user has provided.
    uint256 rewardDebt; // Reward debt. See explanation below.
    uint256 bonusDebt; // Last block that user exec something to the pool.
    address fundedBy;
  }

  // Info of each pool.
  struct PoolInfo {
    uint256 allocPoint; // How many allocation points assigned to this pool.
    uint256 lastRewardBlock; // Last block number that LATTE distribution occurs.
    uint256 accLattePerShare; // Accumulated LATTE per share, times 1e12. See below.
    uint256 accLattePerShareTilBonusEnd; // Accumated LATTE per share until Bonus End.
    uint256 allocBps; // Pool allocation in BPS, if it's not a fixed bps pool, leave it 0
  }

  // LATTE token.
  ILATTE public latte;
  // BEAN token.
  IBeanBag public bean;
  // Dev address.
  address public override devAddr;
  uint256 public override devFeeBps;
  // LATTE per block.
  uint256 public lattePerBlock;
  // Bonus muliplier for early users.
  uint256 public bonusMultiplier;
  // Block number when bonus LATTE period ends.
  uint256 public bonusEndBlock;
  // Bonus lock-up in BPS
  uint256 public bonusLockUpBps;

  // Info of each pool.
  // PoolInfo[] public poolInfo;
  // Pool link list
  LinkList.List public pools;
  // Pool Info
  mapping(address => PoolInfo) public poolInfo;
  // Info of each user that stakes Staking tokens.
  mapping(address => mapping(address => UserInfo)) public override userInfo;
  // Total allocation poitns. Must be the sum of all allocation points in all pools.
  uint256 public totalAllocPoint;
  // The block number when LATTE mining starts.
  uint256 public startBlock;

  // Does the pool allows some contracts to fund for an account
  mapping(address => bool) public stakeTokenCallerAllowancePool;

  // list of contracts that the pool allows to fund
  mapping(address => LinkList.List) public stakeTokenCallerContracts;

  event AddPool(address stakeToken, uint256 allocPoint, uint256 totalAllocPoint);
  event SetPool(address stakeToken, uint256 allocPoint, uint256 totalAllocPoint);
  event RemovePool(address stakeToken, uint256 allocPoint, uint256 totalAllocPoint);
  event Deposit(address indexed funder, address indexed fundee, address indexed stakeToken, uint256 amount);
  event Withdraw(address indexed funder, address indexed fundee, address indexed stakeToken, uint256 amount);
  event EmergencyWithdraw(address indexed user, address indexed stakeToken, uint256 amount);
  event BonusChanged(uint256 bonusMultiplier, uint256 bonusEndBlock, uint256 bonusLockUpBps);
  event PoolAllocChanged(address indexed pool, uint256 allocBps);
  event SetStakeTokenCallerAllowancePool(address indexed stakeToken, bool isAllowed);
  event AddStakeTokenCallerContract(address indexed stakeToken, address indexed caller);
  event RemoveStakeTokenCallerContract(address indexed stakeToken, address indexed caller);
  event MintExtraReward(address indexed sender, address indexed stakeToken, address indexed to, uint256 amount);

  /// @dev Constructor to create LatteMasterBarista instance + add pool(0)
  /// @param _latte The address of LATTE
  /// @param _devAddr The address that will LATTE dev fee
  /// @param _lattePerBlock The initial emission rate
  /// @param _startBlock The block that LATTE will start to release
  constructor(
    ILATTE _latte,
    IBeanBag _bean,
    address _devAddr,
    uint256 _lattePerBlock,
    uint256 _startBlock
  ) public {
    bonusMultiplier = 0;
    latte = _latte;
    bean = _bean;
    devAddr = _devAddr;
    devFeeBps = 1500;
    lattePerBlock = _lattePerBlock;
    startBlock = _startBlock;
    pools.init();

    // add LATTE->LATTE pool
    pools.add(address(_latte));
    poolInfo[address(_latte)] = PoolInfo({
      allocPoint: 1000,
      lastRewardBlock: startBlock,
      accLattePerShare: 0,
      accLattePerShareTilBonusEnd: 0,
      allocBps: 4000
    });
    totalAllocPoint = 1000;
  }

  /// @dev only permitted funder can continue the execution
  /// @dev eg. if a pool accepted funders, then msg.sender needs to be those funders, otherwise it will be reverted
  /// @dev --  if a pool doesn't accepted any funders, then msg.sender needs to be the one with beneficiary (eoa account)
  /// @param _beneficiary is an address this funder funding for
  /// @param _stakeToken a stake token
  modifier onlyPermittedTokenFunder(address _beneficiary, address _stakeToken) {
    require(_isFunder(_beneficiary, _stakeToken), "MasterBarista::onlyPermittedTokenFunder: caller is not permitted");
    _;
  }

  /// @notice only permitted funder can continue the execution
  /// @dev eg. if a pool accepted funders (from setStakeTokenCallerAllowancePool), then msg.sender needs to be those funders, otherwise it will be reverted
  /// @dev --  if a pool doesn't accepted any funders, then msg.sender needs to be the one with beneficiary (eoa account)
  /// @param _beneficiary is an address this funder funding for
  /// @param _stakeTokens a set of stake token (when doing batch)
  modifier onlyPermittedTokensFunder(address _beneficiary, address[] calldata _stakeTokens) {
    for (uint256 i = 0; i < _stakeTokens.length; i++) {
      require(
        _isFunder(_beneficiary, _stakeTokens[i]),
        "MasterBarista::onlyPermittedTokensFunder: caller is not permitted"
      );
    }
    _;
  }

  /// @dev only stake token caller contract can continue the execution (stakeTokenCaller must be a funder contract)
  /// @param _stakeToken a stakeToken to be validated
  modifier onlyStakeTokenCallerContract(address _stakeToken) {
    require(
      stakeTokenCallerContracts[_stakeToken].has(_msgSender()),
      "MasterBarista::onlyStakeTokenCallerContract: bad caller"
    );
    _;
  }

  /// @notice set funder allowance for a stake token pool
  /// @param _stakeToken a stake token to allow funder
  /// @param _isAllowed a parameter just like in doxygen (must be followed by parameter name)
  function setStakeTokenCallerAllowancePool(address _stakeToken, bool _isAllowed) external onlyOwner {
    stakeTokenCallerAllowancePool[_stakeToken] = _isAllowed;

    emit SetStakeTokenCallerAllowancePool(_stakeToken, _isAllowed);
  }

  /// @notice Setter function for adding stake token contract caller
  /// @param _stakeToken a pool for adding a corresponding stake token contract caller
  /// @param _caller a stake token contract caller
  function addStakeTokenCallerContract(address _stakeToken, address _caller) external onlyOwner {
    require(
      stakeTokenCallerAllowancePool[_stakeToken],
      "MasterBarista::addStakeTokenCallerContract: the pool doesn't allow a contract caller"
    );
    LinkList.List storage list = stakeTokenCallerContracts[_stakeToken];
    if (list.getNextOf(LinkList.start) == LinkList.empty) {
      list.init();
    }
    list.add(_caller);
    emit AddStakeTokenCallerContract(_stakeToken, _caller);
  }

  /// @notice Setter function for removing stake token contract caller
  /// @param _stakeToken a pool for removing a corresponding stake token contract caller
  /// @param _caller a stake token contract caller
  function removeStakeTokenCallerContract(address _stakeToken, address _caller) external onlyOwner {
    require(
      stakeTokenCallerAllowancePool[_stakeToken],
      "MasterBarista::removeStakeTokenCallerContract: the pool doesn't allow a contract caller"
    );
    LinkList.List storage list = stakeTokenCallerContracts[_stakeToken];
    list.remove(_caller, pools.getPreviousOf(_stakeToken));

    emit RemoveStakeTokenCallerContract(_stakeToken, _caller);
  }

  /// @dev Update dev address by the previous dev.
  /// @param _devAddr The new dev address
  function setDev(address _devAddr) external {
    require(_msgSender() == devAddr, "MasterBarista::setDev::only prev dev can changed dev address");
    devAddr = _devAddr;
  }

  /// @dev Set LATTE per block.
  /// @param _lattePerBlock The new emission rate for LATTE
  function setLattePerBlock(uint256 _lattePerBlock) external onlyOwner {
    massUpdatePools();
    lattePerBlock = _lattePerBlock;
  }

  /// @dev Set a specified pool's alloc BPS
  /// @param _allocBps The new alloc Bps
  /// @param _stakeToken pid
  function setPoolAllocBps(address _stakeToken, uint256 _allocBps) external onlyOwner {
    require(
      _stakeToken != address(0) && _stakeToken != address(1),
      "MasterBarista::setPoolAllocBps::_stakeToken must not be address(0) or address(1)"
    );
    require(pools.has(_stakeToken), "MasterBarista::setPoolAllocBps::pool hasn't been set");
    require(_allocBps > 1000, "MasterBarista::setPoolallocBps::_allocBps must > 1000");
    address curr = pools.next[LinkList.start];
    uint256 accumAllocBps = 0;
    while (curr != LinkList.end) {
      if (poolInfo[curr].allocBps > 0) {
        accumAllocBps = accumAllocBps.add(poolInfo[curr].allocBps);
      }
      curr = pools.getNextOf(curr);
    }
    require(accumAllocBps.add(_allocBps) < 10000, "MasterBarista::setPoolallocBps::accumAllocBps must < 10000");
    massUpdatePools();
    poolInfo[_stakeToken].allocBps = _allocBps;
    updatePoolsAlloc();
    emit PoolAllocChanged(_stakeToken, _allocBps);
  }

  /// @dev Set Bonus params. Bonus will start to accu on the next block that this function executed.
  /// @param _bonusMultiplier The new multiplier for bonus period.
  /// @param _bonusEndBlock The new end block for bonus period
  /// @param _bonusLockUpBps The new lock up in BPS
  function setBonus(
    uint256 _bonusMultiplier,
    uint256 _bonusEndBlock,
    uint256 _bonusLockUpBps
  ) external onlyOwner {
    require(_bonusEndBlock > block.number, "MasterBarista::setBonus::bad bonusEndBlock");
    require(_bonusMultiplier > 1, "MasterBarista::setBonus::bad bonusMultiplier");
    require(_bonusLockUpBps <= 10000, "MasterBarista::setBonus::bad bonusLockUpBps");

    massUpdatePools();

    bonusMultiplier = _bonusMultiplier;
    bonusEndBlock = _bonusEndBlock;
    bonusLockUpBps = _bonusLockUpBps;

    emit BonusChanged(bonusMultiplier, bonusEndBlock, bonusLockUpBps);
  }

  /// @dev Add a pool. Can only be called by the owner.
  /// @param _stakeToken The token that needed to be staked to earn LATTE.
  /// @param _allocPoint The allocation point of a new pool.
  function addPool(address _stakeToken, uint256 _allocPoint) external override onlyOwner {
    require(
      _stakeToken != address(0) && _stakeToken != address(1),
      "MasterBarista::addPool::_stakeToken must not be address(0) or address(1)"
    );
    require(!pools.has(_stakeToken), "MasterBarista::addPool::_stakeToken duplicated");

    massUpdatePools();

    uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
    totalAllocPoint = totalAllocPoint.add(_allocPoint);
    pools.add(_stakeToken);
    poolInfo[_stakeToken] = PoolInfo({
      allocPoint: _allocPoint,
      lastRewardBlock: lastRewardBlock,
      accLattePerShare: 0,
      accLattePerShareTilBonusEnd: 0,
      allocBps: 0
    });

    updatePoolsAlloc();

    emit AddPool(_stakeToken, _allocPoint, totalAllocPoint);
  }

  /// @dev Update the given pool's LATTE allocation point. Can only be called by the owner.
  /// @param _stakeToken The pool id to be updated
  /// @param _allocPoint The new allocPoint
  function setPool(address _stakeToken, uint256 _allocPoint) external override onlyOwner {
    require(
      _stakeToken != address(0) && _stakeToken != address(1),
      "MasterBarista::setPool::_stakeToken must not be address(0) or address(1)"
    );
    require(pools.has(_stakeToken), "MasterBarista::setPool::_stakeToken not in the list");

    massUpdatePools();

    totalAllocPoint = totalAllocPoint.sub(poolInfo[_stakeToken].allocPoint).add(_allocPoint);
    uint256 prevAllocPoint = poolInfo[_stakeToken].allocPoint;
    poolInfo[_stakeToken].allocPoint = _allocPoint;

    if (prevAllocPoint != _allocPoint) {
      updatePoolsAlloc();
    }

    emit SetPool(_stakeToken, _allocPoint, totalAllocPoint);
  }

  /// @dev Remove pool. Can only be called by the owner.
  /// @param _stakeToken The stake token pool to be removed
  function removePool(address _stakeToken) external override onlyOwner {
    require(_stakeToken != address(latte), "MasterBarista::removePool::can't remove LATTE pool");
    require(pools.has(_stakeToken), "MasterBarista::removePool::pool not add yet");
    require(IERC20(_stakeToken).balanceOf(address(this)) == 0, "MasterBarista::removePool::pool not empty");

    massUpdatePools();

    totalAllocPoint = totalAllocPoint.sub(poolInfo[_stakeToken].allocPoint);

    pools.remove(_stakeToken, pools.getPreviousOf(_stakeToken));
    poolInfo[_stakeToken].allocPoint = 0;
    poolInfo[_stakeToken].lastRewardBlock = 0;
    poolInfo[_stakeToken].accLattePerShare = 0;
    poolInfo[_stakeToken].accLattePerShareTilBonusEnd = 0;
    poolInfo[_stakeToken].allocBps = 0;

    updatePoolsAlloc();

    emit RemovePool(_stakeToken, 0, totalAllocPoint);
  }

  /// @dev Update pools' alloc point
  function updatePoolsAlloc() internal {
    address curr = pools.next[LinkList.start];
    uint256 points = 0;
    uint256 accumAllocBps = 0;
    while (curr != LinkList.end) {
      if (poolInfo[curr].allocBps > 0) {
        accumAllocBps = accumAllocBps.add(poolInfo[curr].allocBps);
        curr = pools.getNextOf(curr);
        continue;
      }

      points = points.add(poolInfo[curr].allocPoint);
      curr = pools.getNextOf(curr);
    }

    // re-adjust an allocpoints for those pool having an allocBps
    if (points != 0) {
      _updatePoolAlloc(accumAllocBps, points);
    }
  }

  // @dev internal function for updating pool based on accumulated bps and points
  function _updatePoolAlloc(uint256 _accumAllocBps, uint256 _accumNonBpsPoolPoints) internal {
    // n = kp/(1-k),
    // where  k is accumAllocBps
    // p is sum of points of other pools
    address curr = pools.next[LinkList.start];
    uint256 num = _accumNonBpsPoolPoints.mul(_accumAllocBps);
    uint256 denom = uint256(10000).sub(_accumAllocBps);
    uint256 adjustedPoints = num.div(denom);
    uint256 poolPoints;
    while (curr != LinkList.end) {
      if (poolInfo[curr].allocBps == 0) {
        curr = pools.getNextOf(curr);
        continue;
      }
      poolPoints = adjustedPoints.mul(poolInfo[curr].allocBps).div(_accumAllocBps);
      totalAllocPoint = totalAllocPoint.sub(poolInfo[curr].allocPoint).add(poolPoints);
      poolInfo[curr].allocPoint = poolPoints;
      curr = pools.getNextOf(curr);
    }
  }

  /// @dev Return the length of poolInfo
  function poolLength() external view override returns (uint256) {
    return pools.length();
  }

  /// @dev Return reward multiplier over the given _from to _to block.
  /// @param _lastRewardBlock The last block that rewards have been paid
  /// @param _currentBlock The current block
  function getMultiplier(uint256 _lastRewardBlock, uint256 _currentBlock) private view returns (uint256) {
    if (_currentBlock <= bonusEndBlock) {
      return _currentBlock.sub(_lastRewardBlock).mul(bonusMultiplier);
    }
    if (_lastRewardBlock >= bonusEndBlock) {
      return _currentBlock.sub(_lastRewardBlock);
    }
    // This is the case where bonusEndBlock is in the middle of _lastRewardBlock and _currentBlock block.
    return bonusEndBlock.sub(_lastRewardBlock).mul(bonusMultiplier).add(_currentBlock.sub(bonusEndBlock));
  }

  /// @notice validating if a msg sender is a funder
  /// @param _beneficiary if a stake token does't allow stake token contract caller, checking if a msg sender is the same with _beneficiary
  /// @param _stakeToken a stake token for checking a validity
  /// @return boolean result of validating if a msg sender is allowed to be a funder
  function _isFunder(address _beneficiary, address _stakeToken) internal view returns (bool) {
    if (stakeTokenCallerAllowancePool[_stakeToken]) return stakeTokenCallerContracts[_stakeToken].has(_msgSender());
    return _beneficiary == _msgSender();
  }

  /// @dev View function to see pending LATTEs on frontend.
  /// @param _stakeToken The stake token
  /// @param _user The address of a user
  function pendingLatte(address _stakeToken, address _user) external view override returns (uint256) {
    PoolInfo storage pool = poolInfo[_stakeToken];
    UserInfo storage user = userInfo[_stakeToken][_user];
    uint256 accLattePerShare = pool.accLattePerShare;
    uint256 totalStakeToken = IERC20(_stakeToken).balanceOf(address(this));
    if (block.number > pool.lastRewardBlock && totalStakeToken != 0) {
      uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
      uint256 latteReward = multiplier.mul(lattePerBlock).mul(pool.allocPoint).div(totalAllocPoint);
      accLattePerShare = accLattePerShare.add(latteReward.mul(1e12).div(totalStakeToken));
    }
    return user.amount.mul(accLattePerShare).div(1e12).sub(user.rewardDebt);
  }

  /// @dev Update reward vairables for all pools. Be careful of gas spending!
  function massUpdatePools() public {
    address curr = pools.next[LinkList.start];
    while (curr != LinkList.end) {
      updatePool(curr);
      curr = pools.getNextOf(curr);
    }
  }

  /// @dev Update reward variables of the given pool to be up-to-date.
  /// @param _stakeToken The stake token address of the pool to be updated
  function updatePool(address _stakeToken) public override {
    PoolInfo storage pool = poolInfo[_stakeToken];
    if (block.number <= pool.lastRewardBlock) {
      return;
    }
    uint256 totalStakeToken = IERC20(_stakeToken).balanceOf(address(this));
    if (totalStakeToken == 0) {
      pool.lastRewardBlock = block.number;
      return;
    }
    uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
    uint256 latteReward = multiplier.mul(lattePerBlock).mul(pool.allocPoint).div(totalAllocPoint);
    latte.mint(devAddr, latteReward.mul(devFeeBps).div(10000));
    latte.mint(address(bean), latteReward);
    pool.accLattePerShare = pool.accLattePerShare.add(latteReward.mul(1e12).div(totalStakeToken));
    // Clear bonus & update accLattePerShareTilBonusEnd.
    if (block.number <= bonusEndBlock) {
      latte.lock(devAddr, latteReward.mul(bonusLockUpBps).mul(15).div(1000000));
      pool.accLattePerShareTilBonusEnd = pool.accLattePerShare;
    }
    if (block.number > bonusEndBlock && pool.lastRewardBlock < bonusEndBlock) {
      uint256 latteBonusPortion = bonusEndBlock
        .sub(pool.lastRewardBlock)
        .mul(bonusMultiplier)
        .mul(lattePerBlock)
        .mul(pool.allocPoint)
        .div(totalAllocPoint);
      latte.lock(devAddr, latteBonusPortion.mul(bonusLockUpBps).mul(15).div(1000000));
      pool.accLattePerShareTilBonusEnd = pool.accLattePerShareTilBonusEnd.add(
        latteBonusPortion.mul(1e12).div(totalStakeToken)
      );
    }

    pool.lastRewardBlock = block.number;
  }

  /// @dev Deposit token to get LATTE.
  /// @param _stakeToken The stake token to be deposited
  /// @param _amount The amount to be deposited
  function deposit(
    address _for,
    address _stakeToken,
    uint256 _amount
  ) external override onlyPermittedTokenFunder(_for, _stakeToken) nonReentrant {
    require(
      _stakeToken != address(0) && _stakeToken != address(1),
      "MasterBarista::setPool::_stakeToken must not be address(0) or address(1)"
    );
    require(_stakeToken != address(latte), "MasterBarista::deposit::use depositLatte instead");
    require(pools.has(_stakeToken), "MasterBarista::deposit::no pool");

    PoolInfo storage pool = poolInfo[_stakeToken];
    UserInfo storage user = userInfo[_stakeToken][_for];

    if (user.fundedBy != address(0)) require(user.fundedBy == msg.sender, "MasterBarista::deposit::bad sof");

    updatePool(_stakeToken);

    if (user.amount > 0) _harvest(_for, _stakeToken);
    if (user.fundedBy == address(0)) user.fundedBy = msg.sender;
    if (_amount > 0) {
      IERC20(_stakeToken).safeTransferFrom(address(_msgSender()), address(this), _amount);
      user.amount = user.amount.add(_amount);
    }

    user.rewardDebt = user.amount.mul(pool.accLattePerShare).div(1e12);
    user.bonusDebt = user.amount.mul(pool.accLattePerShareTilBonusEnd).div(1e12);

    emit Deposit(_msgSender(), _for, _stakeToken, _amount);
  }

  /// @dev Withdraw token from LatteMasterBarista.
  /// @param _stakeToken The token to be withdrawn
  /// @param _amount The amount to be withdrew
  function withdraw(
    address _for,
    address _stakeToken,
    uint256 _amount
  ) external override nonReentrant {
    require(
      _stakeToken != address(0) && _stakeToken != address(1),
      "MasterBarista::setPool::_stakeToken must not be address(0) or address(1)"
    );
    require(_stakeToken != address(latte), "MasterBarista::withdraw::use withdrawLatte instead");
    require(pools.has(_stakeToken), "MasterBarista::withdraw::no pool");

    PoolInfo storage pool = poolInfo[_stakeToken];
    UserInfo storage user = userInfo[_stakeToken][_for];

    require(user.fundedBy == msg.sender, "MasterBarista::withdraw::only funder");
    require(user.amount >= _amount, "MasterBarista::withdraw::not good");

    updatePool(_stakeToken);
    _harvest(_for, _stakeToken);

    if (_amount > 0) {
      user.amount = user.amount.sub(_amount);
    }
    user.rewardDebt = user.amount.mul(pool.accLattePerShare).div(1e12);
    user.bonusDebt = user.amount.mul(pool.accLattePerShareTilBonusEnd).div(1e12);
    if (user.amount == 0) user.fundedBy = address(0);
    IERC20(_stakeToken).safeTransfer(_msgSender(), _amount);

    emit Withdraw(_msgSender(), _for, _stakeToken, user.amount);
  }

  /// @dev Deposit LATTE to get even more LATTE.
  /// @param _amount The amount to be deposited
  function depositLatte(address _for, uint256 _amount)
    external
    override
    onlyPermittedTokenFunder(_for, address(latte))
    nonReentrant
  {
    PoolInfo storage pool = poolInfo[address(latte)];
    UserInfo storage user = userInfo[address(latte)][_for];

    if (user.fundedBy != address(0)) require(user.fundedBy == msg.sender, "MasterBarista::depositLatte::bad sof");

    updatePool(address(latte));

    if (user.amount > 0) _harvest(_for, address(latte));
    if (user.fundedBy == address(0)) user.fundedBy = msg.sender;
    if (_amount > 0) {
      IERC20(address(latte)).safeTransferFrom(address(_msgSender()), address(this), _amount);
      user.amount = user.amount.add(_amount);
    }
    user.rewardDebt = user.amount.mul(pool.accLattePerShare).div(1e12);
    user.bonusDebt = user.amount.mul(pool.accLattePerShareTilBonusEnd).div(1e12);

    bean.mint(_for, _amount);

    emit Deposit(_msgSender(), _for, address(latte), _amount);
  }

  /// @dev Withdraw LATTE
  /// @param _amount The amount to be withdrawn
  function withdrawLatte(address _for, uint256 _amount) external override nonReentrant {
    PoolInfo storage pool = poolInfo[address(latte)];
    UserInfo storage user = userInfo[address(latte)][_for];

    require(user.fundedBy == msg.sender, "MasterBarista::withdrawLatte::only funder");
    require(user.amount >= _amount, "MasterBarista::withdrawLatte::not good");

    updatePool(address(latte));
    _harvest(_for, address(latte));

    if (_amount > 0) {
      user.amount = user.amount.sub(_amount);
      IERC20(address(latte)).safeTransfer(address(_msgSender()), _amount);
    }
    user.rewardDebt = user.amount.mul(pool.accLattePerShare).div(1e12);
    user.bonusDebt = user.amount.mul(pool.accLattePerShareTilBonusEnd).div(1e12);
    if (user.amount == 0) user.fundedBy = address(0);

    bean.burn(_for, _amount);

    emit Withdraw(_msgSender(), _for, address(latte), user.amount);
  }

  /// @dev Harvest LATTE earned from a specific pool.
  /// @param _stakeToken The pool's stake token
  function harvest(address _for, address _stakeToken) external override nonReentrant {
    PoolInfo storage pool = poolInfo[_stakeToken];
    UserInfo storage user = userInfo[_stakeToken][_for];

    updatePool(_stakeToken);
    _harvest(_for, _stakeToken);

    user.rewardDebt = user.amount.mul(pool.accLattePerShare).div(1e12);
    user.bonusDebt = user.amount.mul(pool.accLattePerShareTilBonusEnd).div(1e12);
  }

  /// @dev Harvest LATTE earned from pools.
  /// @param _stakeTokens The list of pool's stake token to be harvested
  function harvest(address _for, address[] calldata _stakeTokens) external override nonReentrant {
    for (uint256 i = 0; i < _stakeTokens.length; i++) {
      PoolInfo storage pool = poolInfo[_stakeTokens[i]];
      UserInfo storage user = userInfo[_stakeTokens[i]][_for];
      updatePool(_stakeTokens[i]);
      _harvest(_for, _stakeTokens[i]);
      user.rewardDebt = user.amount.mul(pool.accLattePerShare).div(1e12);
      user.bonusDebt = user.amount.mul(pool.accLattePerShareTilBonusEnd).div(1e12);
    }
  }

  /// @dev Internal function to harvest LATTE
  /// @param _for The beneficiary address
  /// @param _stakeToken The pool's stake token
  function _harvest(address _for, address _stakeToken) internal {
    PoolInfo memory pool = poolInfo[_stakeToken];
    UserInfo memory user = userInfo[_stakeToken][_for];
    require(user.fundedBy == msg.sender, "MasterBarista::_harvest::only funder");
    require(user.amount > 0, "MasterBarista::_harvest::nothing to harvest");
    uint256 pending = user.amount.mul(pool.accLattePerShare).div(1e12).sub(user.rewardDebt);
    require(pending <= latte.balanceOf(address(bean)), "MasterBarista::_harvest::wait what.. not enough LATTE");
    uint256 bonus = user.amount.mul(pool.accLattePerShareTilBonusEnd).div(1e12).sub(user.bonusDebt);
    bean.safeLatteTransfer(_for, pending);
    if (stakeTokenCallerContracts[_stakeToken].has(_msgSender())) {
      _onBeforeLock(_msgSender(), _stakeToken, _for, pending);
    }
    latte.lock(_for, bonus.mul(bonusLockUpBps).div(10000));
  }

  /// @dev Observer function for those contract implementing onBeforeLock, execute an onBeforelock statement
  /// @param _caller that perhaps implement an onBeforeLock observing function
  /// @param _stakeToken parameter for sending a staoke token
  /// @param _for the user this callback will be used
  /// @param _pending pending amount
  function _onBeforeLock(
    address _caller,
    address _stakeToken,
    address _for,
    uint256 _pending
  ) internal {
    if (!_caller.isContract()) {
      return;
    }
    (bool success, ) = _caller.call(
      abi.encodeWithSelector(IMasterBaristaCallback.masterBaristaCall.selector, _stakeToken, _for, _pending)
    );
    require(success, "MasterBarista::_onBeforeLock:: failed to execute masterBaristaCall");
  }

  /// @dev Withdraw without caring about rewards. EMERGENCY ONLY.
  /// @param _for if the msg sender is a funder, can emergency withdraw a fundee
  /// @param _stakeToken The pool's stake token
  function emergencyWithdraw(address _for, address _stakeToken) external override nonReentrant {
    UserInfo storage user = userInfo[_stakeToken][_for];
    require(user.fundedBy == msg.sender, "MasterBarista::emergencyWithdraw::only funder");
    IERC20(_stakeToken).safeTransfer(address(_for), user.amount);

    emit EmergencyWithdraw(_for, _stakeToken, user.amount);

    // Burn BEAN if user emergencyWithdraw LATTE
    if (_stakeToken == address(latte)) {
      bean.burn(_msgSender(), user.amount);
    }

    // Reset user info
    user.amount = 0;
    user.rewardDebt = 0;
    user.bonusDebt = 0;
    user.fundedBy = address(0);
  }

  /// @dev This is a function for mining an extra amount of latte, should be called only by stake token caller contract (boosting purposed)
  /// @param _stakeToken a stake token address for validating a msg sender
  /// @param _amount amount to be minted
  function mintExtraReward(
    address _stakeToken,
    address _to,
    uint256 _amount
  ) external override onlyStakeTokenCallerContract(_stakeToken) {
    latte.mint(_to, _amount);
    latte.mint(devAddr, _amount.mul(devFeeBps).div(1e4));

    emit MintExtraReward(_msgSender(), _stakeToken, _to, _amount);
  }
}
