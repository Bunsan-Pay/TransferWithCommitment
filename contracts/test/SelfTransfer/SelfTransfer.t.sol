// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {TransferWithCommitment} from "../../src/TransferWithCommitment.sol";
import {TransferDetail, CommittedTransferDetail} from "../../src/Structs.sol";
import "../../src/Events.sol";

/// @dev Self-call transfer paths (`SelfTransfer`) via `TransferWithCommitment`.
contract SelfTransferTest is Test {
    TransferWithCommitment internal twc;
    ERC20Mock internal token;
    address internal user = address(0x1111);
    address internal recipient = address(0x2222);

    function setUp() public {
        twc = new TransferWithCommitment("TWC", "1");
        token = new ERC20Mock();
        token.mint(user, 1_000 ether);
        vm.prank(user);
        token.approve(address(twc), type(uint256).max);
    }

    /// @notice `transfer(token, to, value, commitment)` — success path emits event and moves tokens
    function test_transfer_single_emitsAndTransfers() public {
        bytes32 c = keccak256("c0");
        uint256 amount = 10 ether;
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(user, recipient, address(token), amount, c);
        vm.prank(user);
        twc.transfer(address(token), recipient, amount, c);
        assertEq(token.balanceOf(recipient), amount);
    }

    /// @notice `_transferWithGuard` / `replayGuard` — same commitment cannot be reused
    function test_transfer_single_revertsOnReplay() public {
        bytes32 c = keccak256("replay");
        vm.startPrank(user);
        twc.transfer(address(token), recipient, 1 ether, c);
        vm.expectRevert(bytes("TransferWithCommitment: commitment is used"));
        twc.transfer(address(token), recipient, 1 ether, c);
        vm.stopPrank();
    }

    /// @notice `_transfer` — insufficient allowance reverts `AllowanceNotEnough`
    function test_transfer_revertsWhenAllowanceTooLow() public {
        address poor = address(0x3333);
        token.mint(poor, 5 ether);
        vm.prank(poor);
        token.approve(address(twc), 1 ether);
        bytes32 c = keccak256("low");
        vm.prank(poor);
        vm.expectRevert(abi.encodeWithSelector(AllowanceNotEnough.selector, address(token), poor, 5 ether));
        twc.transfer(address(token), recipient, 5 ether, c);
    }

    /// @notice `transfer(TransferDetail[], commitment)` — batch with one commitment, multiple emits
    function test_transfer_batchSameCommitment() public {
        bytes32 c = keccak256("batch");
        TransferDetail[] memory details = new TransferDetail[](2);
        details[0] = TransferDetail({to: recipient, token: address(token), value: 2 ether});
        details[1] = TransferDetail({to: address(0x4444), token: address(token), value: 3 ether});
        vm.startPrank(user);
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(user, recipient, address(token), 2 ether, c);
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(user, address(0x4444), address(token), 3 ether, c);
        twc.transfer(details, c);
        vm.stopPrank();
    }

    /// @notice `transfer(TransferDetail[], commitment)` — replay of commitment reverts
    function test_transfer_batchRevertsOnReplay() public {
        bytes32 c = keccak256("once-batch");
        TransferDetail[] memory details = new TransferDetail[](1);
        details[0] = TransferDetail({to: recipient, token: address(token), value: 1 ether});
        vm.startPrank(user);
        twc.transfer(details, c);
        vm.expectRevert(bytes("TransferWithCommitment: commitment is used"));
        twc.transfer(details, c);
        vm.stopPrank();
    }

    /// @notice `transfer(CommittedTransferDetail[])` — per-detail commitments
    function test_transfer_committedBatch() public {
        bytes32 c1 = keccak256("c1");
        bytes32 c2 = keccak256("c2");
        CommittedTransferDetail[] memory details = new CommittedTransferDetail[](2);
        details[0] = CommittedTransferDetail({to: recipient, token: address(token), value: 1 ether, commitment: c1});
        details[1] =
            CommittedTransferDetail({to: address(0x5555), token: address(token), value: 2 ether, commitment: c2});
        vm.startPrank(user);
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(user, recipient, address(token), 1 ether, c1);
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(user, address(0x5555), address(token), 2 ether, c2);
        twc.transfer(details);
        vm.stopPrank();
    }

    /// @notice `transfer(TransferDetail[], commitment)` — empty `details` reverts
    function test_transfer_revertsEmptyUnifiedDetails() public {
        bytes32 c = keccak256("empty-uni");
        TransferDetail[] memory details = new TransferDetail[](0);
        vm.prank(user);
        vm.expectRevert(bytes("TransferWithCommitment: The length of `details` must be at least 1"));
        twc.transfer(details, c);
    }

    /// @notice `transfer(CommittedTransferDetail[])` — empty `details` reverts
    function test_transfer_revertsEmptyCommittedDetails() public {
        CommittedTransferDetail[] memory details = new CommittedTransferDetail[](0);
        vm.prank(user);
        vm.expectRevert(bytes("TransferWithCommitment: The length of `details` must be at least 1"));
        twc.transfer(details);
    }

    /// @notice `transfer(CommittedTransferDetail[])` — duplicate commitment in batch reverts on second leg
    function test_transfer_committedBatch_revertsDuplicateCommitment() public {
        bytes32 c = keccak256("dup");
        CommittedTransferDetail[] memory details = new CommittedTransferDetail[](2);
        details[0] = CommittedTransferDetail({to: recipient, token: address(token), value: 1 ether, commitment: c});
        details[1] =
            CommittedTransferDetail({to: address(0x6666), token: address(token), value: 1 ether, commitment: c});
        vm.prank(user);
        vm.expectRevert(bytes("TransferWithCommitment: commitment is used"));
        twc.transfer(details);
    }
}
