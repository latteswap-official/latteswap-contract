// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interfaces/IBoosterConfig.sol";

contract BoosterConfig is IBoosterConfig, OwnableUpgradeable, ReentrancyGuardUpgradeable {
  using SafeERC20Upgradeable for IERC20Upgradeable;
  using SafeMathUpgradeable for uint256;

  struct BoosterNFTInfo {
    address nftAddress;
    uint256 tokenId;
  }

  struct BoosterEnergyInfo {
    uint256 maxEnergy;
    uint256 currentEnergy;
    uint256 boostBps;
  }

  struct BoosterNFTParams {
    address nftAddress;
    uint256 nftTokenId;
    uint256 maxEnergy;
    uint256 boostBps;
  }

  struct BoosterAllowance {
    address nftAddress;
    uint256 nftTokenId;
    bool allowance;
  }

  struct BoosterAllowanceParams {
    address stakingToken;
    BoosterAllowance[] allowance;
  }

  mapping(address => mapping(uint256 => BoosterEnergyInfo)) public override energyInfo;

  mapping(address => mapping(address => mapping(uint256 => bool))) public override boosterNftAllowance;

  mapping(address => bool) public override stakeTokenAllowance;

  mapping(address => bool) public override callerAllowance;

  event UpdateCurrentEnergy(
    address indexed nftAddress,
    uint256 indexed nftTokenId,
    uint256 indexed updatedCurrentEnergy
  );
  event SetStakeTokenAllowance(address indexed stakingToken, bool isAllowed);
  event SetBoosterNFTEnergyInfo(
    address indexed nftAddress,
    uint256 indexed nftTokenId,
    uint256 maxEnergy,
    uint256 currentEnergy,
    uint256 boostBps
  );
  event SetCallerAllowance(address indexed caller, bool isAllowed);
  event SetBoosterNFTAllowance(
    address indexed stakeToken,
    address indexed nftAddress,
    uint256 indexed nftTokenId,
    bool isAllowed
  );

  /// @notice only eligible caller can continue the execution
  modifier onlyCaller() {
    require(callerAllowance[msg.sender], "BoosterConfig::onlyCaller::only eligible caller");
    _;
  }

  function initialize() external initializer {
    OwnableUpgradeable.__Ownable_init();
    ReentrancyGuardUpgradeable.__ReentrancyGuard_init();
  }

  /// @notice function for updating a curreny energy of the specified nft
  /// @dev Only eligible caller can freely update an energy
  /// @param _nftAddress a composite key for nft
  /// @param _nftTokenId a composite key for nft
  /// @param _updatedCurrentEnergy an updated curreny energy for the nft
  function updateCurrentEnergy(
    address _nftAddress,
    uint256 _nftTokenId,
    uint256 _updatedCurrentEnergy
  ) external override onlyCaller {
    require(_nftAddress != address(0), "BoosterConfig::updateCurrentEnergy::_nftAddress must not be address(0)");
    BoosterEnergyInfo storage energy = energyInfo[_nftAddress][_nftTokenId];
    energy.currentEnergy = _updatedCurrentEnergy;

    emit UpdateCurrentEnergy(_nftAddress, _nftTokenId, _updatedCurrentEnergy);
  }

  /// @notice set stake token allowance
  /// @dev only owner can call this function
  /// @param _stakeToken a specified token
  /// @param _isAllowed a flag indicating the allowance of a specified token
  function setStakeTokenAllowance(address _stakeToken, bool _isAllowed) external onlyOwner {
    require(_stakeToken != address(0), "BoosterConfig::setStakeTokenAllowance::_stakeToken must not be address(0)");
    stakeTokenAllowance[_stakeToken] = _isAllowed;

    emit SetStakeTokenAllowance(_stakeToken, _isAllowed);
  }

  /// @notice set caller allowance - only eligible caller can call a function
  /// @dev only eligible callers can call this function
  /// @param _caller a specified caller
  /// @param _isAllowed a flag indicating the allowance of a specified token
  function setCallerAllowance(address _caller, bool _isAllowed) external onlyOwner {
    require(_caller != address(0), "BoosterConfig::setCallerAllowance::_caller must not be address(0)");
    callerAllowance[_caller] = _isAllowed;

    emit SetCallerAllowance(_caller, _isAllowed);
  }

  /// @notice A function for setting booster NFT energy info as a batch
  /// @param _params a list of BoosterNFTParams [{nftAddress, nftTokenId, maxEnergy, boostBps}]
  function setBatchBoosterNFTEnergyInfo(BoosterNFTParams[] calldata _params) external onlyOwner {
    for (uint256 i = 0; i < _params.length; ++i) {
      _setBoosterNFTEnergyInfo(_params[i]);
    }
  }

  /// @notice A function for setting booster NFT energy info
  /// @param _param a BoosterNFTParams {nftAddress, nftTokenId, maxEnergy, boostBps}
  function setBoosterNFTEnergyInfo(BoosterNFTParams calldata _param) external onlyOwner {
    _setBoosterNFTEnergyInfo(_param);
  }

  /// @dev An internal function for setting booster NFT energy info
  /// @param _param a BoosterNFTParams {nftAddress, nftTokenId, maxEnergy, boostBps}
  function _setBoosterNFTEnergyInfo(BoosterNFTParams calldata _param) internal {
    energyInfo[_param.nftAddress][_param.nftTokenId] = BoosterEnergyInfo({
      maxEnergy: _param.maxEnergy,
      currentEnergy: _param.maxEnergy,
      boostBps: _param.boostBps
    });

    emit SetBoosterNFTEnergyInfo(
      _param.nftAddress,
      _param.nftTokenId,
      _param.maxEnergy,
      _param.maxEnergy,
      _param.boostBps
    );
  }

  /// @dev A function setting if a particular stake token should allow a specified nft to be boosted
  /// @param _param a BoosterAllowanceParams {stakingToken, [{nftAddress, nftTokenId,allowance;}]}
  function setStakingTokenBoosterAllowance(BoosterAllowanceParams calldata _param) external onlyOwner {
    for (uint256 i = 0; i < _param.allowance.length; ++i) {
      require(
        stakeTokenAllowance[_param.stakingToken],
        "BoosterConfig::setStakingTokenBoosterAllowance:: bad staking token"
      );
      boosterNftAllowance[_param.stakingToken][_param.allowance[i].nftAddress][_param.allowance[i].nftTokenId] = _param
        .allowance[i]
        .allowance;

      emit SetBoosterNFTAllowance(
        _param.stakingToken,
        _param.allowance[i].nftAddress,
        _param.allowance[i].nftTokenId,
        _param.allowance[i].allowance
      );
    }
  }
}
