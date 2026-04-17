// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {State} from "../../src/State/State.sol";

/// @dev Exposes `replayGuard` behavior for unit tests.
contract StateHarness is State {
    uint256 public touchCount;

    function touchReplayGuard(address from, bytes32 commitment) external replayGuard(from, commitment) {
        touchCount++;
    }
}
