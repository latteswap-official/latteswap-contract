// SPDX-License-Identifier: GPL-3.0
//        .-.                               .-.
//       / (_)         /      /       .--.-'
//      /      .-. ---/------/---.-. (  (_)`)    (  .-.   .-.
//     /      (  |   /      /  ./.-'_ `-.  /  .   )(  |   /  )
//  .-/.    .-.`-'-'/      /   (__.'_    )(_.' `-'  `-'-'/`-'
// (_/ `-._.                       (_.--'               /

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../periphery/library/SafeToken.sol";

contract SquidGame is Ownable, ReentrancyGuard {
  using SafeToken for address;
  using SafeMath for uint256;

  struct Round {
    bytes32 entropy;
    uint256 minKill;
    uint256 difficulty;
    uint256 killAt;
  }

  /// @dev constants
  uint256 public constant MAX_PLAYERS = 100;
  uint256 public constant HOUR = 1 hours;

  address public latte;
  address public token;
  uint256 public ticketPrice;

  uint256 public epoch;
  uint256 public startHour;
  uint256 public hourCursor;

  Round[] public roundInfo;
  mapping(uint256 => address[]) public pokes;
  mapping(address => uint256) public userLastPoke;
  mapping(address => uint256) public userNonce;
  mapping(uint256 => uint256) public epochHourCursor;

  constructor(
    uint256 _startTimestamp,
    address _latte,
    uint256 _ticketPrice,
    address _token,
    Round[] memory _roundInfo
  ) public {
    require(_startTimestamp >= block.timestamp.add(HOUR.mul(24)), "bad _startTimestamp");

    uint256 _flooredStartHour = _timestampFloorHour(_startTimestamp);

    startHour = _flooredStartHour;
    hourCursor = _flooredStartHour;

    token = _token;
    latte = _latte;
    ticketPrice = _ticketPrice;

    for (uint256 i = 0; i < _roundInfo.length; i++) {
      require(_roundInfo[i].difficulty > 0 && _roundInfo[i].difficulty <= 2**128, "bad diffculty");
      roundInfo.push(_roundInfo[i]);
    }
  }

  function buy() external nonReentrant {
    uint256 _flooredStartHour = _timestampFloorHour(startHour);

    require(block.timestamp < startHour.add(HOUR), "started");
    require(pokes[_flooredStartHour].length < MAX_PLAYERS, "max players");
    require(userLastPoke[msg.sender] == 0, "already in");

    token.safeTransferFrom(msg.sender, address(this), ticketPrice);

    pokes[_flooredStartHour].push(msg.sender);
    userLastPoke[msg.sender] = _flooredStartHour;
  }

  function draw(uint256 _salt) public view returns (uint256) {
    bytes32 _entropy = roundInfo[epoch].entropy;
    require(_entropy != bytes32(0), "no entropy");
    bytes memory data = abi.encodePacked(_entropy, address(this), msg.sender, userNonce[msg.sender], _salt);
    return uint256(keccak256(data));
  }

  function kill() external nonReentrant {
    require(roundInfo[epoch].killAt == 0, "killed");

    uint256 _flooredStartHour = _timestampFloorHour(startHour);
    uint256 _minKill = roundInfo[epoch].minKill;
    if (_minKill < pokes[_flooredStartHour].length) {
      uint256 _killable = pokes[_flooredStartHour].length.sub(_minKill);
      for (uint256 i = 0; i < _killable; i++) {
        pokes[_flooredStartHour].pop();
      }
    }
    roundInfo[epoch].killAt = block.timestamp;
    epoch = epoch + 1;
  }

  function poke(uint256 _salt) external nonReentrant {
    uint256 _value = draw(_salt);
    userNonce[msg.sender] = userNonce[msg.sender] + 1;
    uint256 _difficulty = roundInfo[epoch].difficulty;
    require(_value <= uint256(-1).div(_difficulty), "bad _salt");

    uint256 _ceilStartHour = _timestampCeilHour(block.timestamp);

    pokes[_ceilStartHour].push(msg.sender);
    userLastPoke[msg.sender] = _ceilStartHour;
  }

  function _timestampCeilHour(uint256 _timestamp) internal pure returns (uint256) {
    return _timestamp.div(HOUR).add(1).mul(HOUR);
  }

  function _timestampFloorHour(uint256 _timestamp) internal pure returns (uint256) {
    return _timestamp.div(HOUR).mul(HOUR);
  }
}
