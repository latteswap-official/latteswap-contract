// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;

library LinkList {
  address public constant start = address(1);
  address public constant end = address(1);
  address public constant empty = address(0);

  struct List {
    uint256 llSize;
    mapping(address => address) next;
  }

  function init(List storage list) internal returns (List memory) {
    list.next[start] = end;

    return list;
  }

  function has(List storage list, address addr) internal view returns (bool) {
    return list.next[addr] != empty;
  }

  function add(List storage list, address addr) internal returns (List memory) {
    require(!has(list, addr), "LinkList::add:: addr is already in the list");
    list.next[addr] = list.next[start];
    list.next[start] = addr;
    list.llSize++;

    return list;
  }

  function remove(
    List storage list,
    address addr,
    address prevAddr
  ) internal returns (List memory) {
    require(has(list, addr), "LinkList::remove:: addr not whitelisted yet");
    require(list.next[prevAddr] == addr, "LinkList::remove:: wrong prevConsumer");
    list.next[prevAddr] = list.next[addr];
    list.next[addr] = empty;
    list.llSize--;

    return list;
  }

  function getAll(List storage list) internal view returns (address[] memory) {
    address[] memory addrs = new address[](list.llSize);
    address curr = list.next[start];
    for (uint256 i = 0; curr != end; i++) {
      addrs[i] = curr;
      curr = list.next[curr];
    }
    return addrs;
  }

  function getPreviousOf(List storage list, address addr) internal view returns (address) {
    address curr = list.next[start];
    require(curr != empty, "LinkList::getPreviousOf:: please init the linkedlist first");
    for (uint256 i = 0; curr != end; i++) {
      if (list.next[curr] == addr) return curr;
      curr = list.next[curr];
    }
    return end;
  }

  function getNextOf(List storage list, address curr) internal view returns (address) {
    return list.next[curr];
  }

  function length(List storage list) internal view returns (uint256) {
    return list.llSize;
  }
}
