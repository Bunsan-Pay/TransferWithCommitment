// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {StateHarness} from "../helpers/StateHarness.sol";
import {IState} from "../../src/State/IState.sol";

contract StateTest is Test {
    StateHarness internal harness;

    function setUp() public {
        harness = new StateHarness();
    }

    /// @notice `commitmentState` — unused commitment returns false
    function test_commitmentState_returnsFalseWhenUnused() public view {
        bytes32 c = keccak256("c1");
        assertFalse(harness.commitmentState(address(this), c));
    }

    /// @notice `replayGuard` / `commitmentUsed` — first use sets bit, emits `CommitmentUsed`
    function test_replayGuard_marksCommitmentAndEmits() public {
        address from = address(0xBEEF);
        bytes32 c = keccak256("commit");
        vm.expectEmit(true, true, true, true);
        emit IState.CommitmentUsed(from, c);
        harness.touchReplayGuard(from, c);
        assertTrue(harness.commitmentState(from, c));
        assertEq(harness.touchCount(), 1);
    }

    /// @notice `replayGuard` — second use with same (from, commitment) reverts
    function test_replayGuard_revertsOnReplay() public {
        address from = address(0xCAFE);
        bytes32 c = keccak256("once");
        harness.touchReplayGuard(from, c);
        vm.expectRevert(bytes("TransferWithCommitment: commitment is used"));
        harness.touchReplayGuard(from, c);
    }

    /// @notice Different commitments for same address are independent
    function test_commitmentState_differentCommitmentsIndependent() public {
        address from = address(0xA);
        bytes32 c1 = keccak256("a");
        bytes32 c2 = keccak256("b");
        harness.touchReplayGuard(from, c1);
        assertTrue(harness.commitmentState(from, c1));
        assertFalse(harness.commitmentState(from, c2));
    }
}
