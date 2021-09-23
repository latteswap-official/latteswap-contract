// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interfaces/ILatteSwapFactory.sol";
import "./interfaces/ILatteSwapPair.sol";
import "./interfaces/ILatteSwapRouter.sol";
import './interfaces/IWBNB.sol';

import "./libraries/LatteSwapMath.sol";
import "./libraries/SafeToken.sol";

contract LatteSwapOptimalDeposit is ReentrancyGuardUpgradeable {
  using SafeToken for address;
  using SafeMathUpgradeable for uint256;

  ILatteSwapFactory public factory;
  ILatteSwapRouter public router;
  address public WBNB;

  /// @dev Create a new add two-side optimal strategy instance.
  /// @param _router The Router smart contract.
  function initialize(ILatteSwapRouter _router, address _WBNB) external initializer {
    ReentrancyGuardUpgradeable.__ReentrancyGuard_init();

    factory = ILatteSwapFactory(_router.factory());
    router = _router;
    WBNB = _WBNB;
  }

  /// @dev Compute swap amount to optimal deposit
  /// @param amtA amount of tokenA desired to deposit
  /// @param amtB amonut of tokenB desired to deposit
  /// @param resA amount of tokenA in reserve
  /// @param resB amount of tokenB in reserve
  function calSwapAmount(
    uint256 amtA,
    uint256 amtB,
    uint256 resA,
    uint256 resB
  ) internal pure returns (uint256 swapAmt, bool isReversed) {
    if (amtA.mul(resB) >= amtB.mul(resA)) {
      swapAmt = _calSwapAmount(amtA, amtB, resA, resB);
      isReversed = false;
    } else {
      swapAmt = _calSwapAmount(amtB, amtA, resB, resA);
      isReversed = true;
    }
  }

  /// @dev Compute swap amount helper
  /// @param amtA amount of tokenA desired to deposit
  /// @param amtB amonut of tokenB desired to deposit
  /// @param resA amount of tokenA in reserve
  /// @param resB amount of tokenB in reserve
  function _calSwapAmount(
    uint256 amtA,
    uint256 amtB,
    uint256 resA,
    uint256 resB
  ) internal pure returns (uint256) {
    require(amtA.mul(resB) >= amtB.mul(resA), "Reversed");

    uint256 a = 998;
    uint256 b = uint256(1998).mul(resA);
    uint256 _c = (amtA.mul(resB)).sub(amtB.mul(resA));
    uint256 c = _c.mul(1000).div(amtB.add(resB)).mul(resA);

    uint256 d = a.mul(c).mul(4);
    uint256 e = LatteSwapMath.sqrt(b.mul(b).add(d));

    uint256 numerator = e.sub(b);
    uint256 denominator = a.mul(2);

    return numerator.div(denominator);
  }
  
  function _optimalAddLiquidity(
      address tokenA,
      address tokenB,
      uint amtA,
      uint amtB,
      uint minLiquidity,
      address to,
      uint deadline
  ) internal returns (uint amountA, uint amountB, uint liquidity){
    // 1. Find out what token pair we are dealing with.
    ILatteSwapPair lpToken = ILatteSwapPair(factory.getPair(tokenA, tokenB));
    // 2. Approve router to do their stuffs
    tokenA.safeApprove(address(router), uint256(-1));
    tokenB.safeApprove(address(router), uint256(-1));
    // 3. Compute the optimal amount of tokenA and tokenB to be converted.
    uint256 swapAmt;
    bool isReversed;
    {
      (uint256 r0, uint256 r1, ) = lpToken.getReserves();
      (uint256 tokenAReserve, uint256 tokenBReserve) = lpToken.token0() == tokenA ? (r0, r1) : (r1, r0);
      (swapAmt, isReversed) = calSwapAmount(
        amtA,
        amtB,
        tokenAReserve,
        tokenBReserve
      );
    }
    // 4. Convert between tokenA and tokenB
    address[] memory path = new address[](2);
    (path[0], path[1]) = isReversed ? (tokenB, tokenA) : (tokenA, tokenB);
    // 5. Swap according to path
    if (swapAmt > 0) router.swapExactTokensForTokens(swapAmt, 0, path, address(this), deadline);
    // 6. Add liquidity and return all LP tokens to the sender.
    (amountA, amountB, liquidity) = router.addLiquidity(
      tokenA,
      tokenB,
      tokenA.myBalance(),
      tokenB.myBalance(),
      0,
      0,
      to,
      deadline
    );
    require(liquidity >= minLiquidity, "LatteSwapOptimalDeposit::execute:: insufficient LP tokens received");
    require(
      lpToken.transfer(msg.sender, lpToken.balanceOf(address(this))),
      "LatteSwapOptimalDeposit::execute:: failed to transfer LP token to msg.sender"
    );
    // 7. Reset approve to 0 for safety reason
    tokenA.safeApprove(address(router), 0);
    tokenB.safeApprove(address(router), 0);
  }

  function optimalAddLiquidity(
      address tokenA,
      address tokenB,
      uint amtA,
      uint amtB,
      uint minLiquidity,
      address to,
      uint deadline
  ) external nonReentrant returns (uint amountA, uint amountB, uint liquidity){
    (amountA, amountB, liquidity) = _optimalAddLiquidity(
      tokenA, 
      tokenB, 
      amtA, 
      amtB, 
      minLiquidity, 
      to, 
      deadline
    );
  }
  
  function optimalAddLiquidityBNB(
    address token,
    uint amount,
    uint minLiquidity,
    address to,
    uint deadline
  ) external payable nonReentrant returns (uint amountToken, uint amountBNB, uint liquidity){
    // 1. Wrap BNB
    if (msg.value != 0) {
      IWBNB(WBNB).deposit{ value: msg.value }();
    }
    // 2. optimal add liquidity using WBNB
    (amountToken, amountBNB, liquidity) = _optimalAddLiquidity(
      token, 
      WBNB, 
      amount, 
      msg.value, 
      minLiquidity, 
      to, 
      deadline
    );
  }

  receive() external payable {}
}
