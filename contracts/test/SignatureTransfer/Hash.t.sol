// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Hash} from "../../src/SignatureTransfer/Hash.sol";
import {TransferDetail, CommittedTransferDetail} from "../../src/Structs.sol";

contract HashTest is Test {
    /// @dev Routes through `external` so `Hash` helpers receive ABI `calldata` (required for `internal` + calldata).
    function hashBatchTransferDetailsExternal(TransferDetail[] calldata details) external pure returns (bytes32) {
        return Hash.hashBatchTransferDetails(details);
    }

    function hashBatchCommittedTransferDetailsExternal(CommittedTransferDetail[] calldata details)
        external
        pure
        returns (bytes32)
    {
        return Hash.hashBatchCommittedTransferDetails(details);
    }

    /// @notice `hashBatchTransferDetails` — deterministic aggregate over `TransferDetail[]`
    function test_hashBatchTransferDetails_empty() public view {
        TransferDetail[] memory details = new TransferDetail[](0);
        bytes32 h = this.hashBatchTransferDetailsExternal(details);
        assertEq(h, keccak256(abi.encodePacked(new bytes32[](0))));
    }

    /// @notice `hashBatchTransferDetails` — matches manual per-detail encoding
    function test_hashBatchTransferDetails_matchesPerDetailHashes() public view {
        TransferDetail[] memory details = new TransferDetail[](2);
        details[0] = TransferDetail({to: address(1), token: address(2), value: 3});
        details[1] = TransferDetail({to: address(4), token: address(5), value: 6});
        bytes32 d0 =
            keccak256(abi.encode(Hash.TRANSFER_DETAIL_TYPEHASH, details[0].to, details[0].token, details[0].value));
        bytes32 d1 =
            keccak256(abi.encode(Hash.TRANSFER_DETAIL_TYPEHASH, details[1].to, details[1].token, details[1].value));
        bytes32[] memory packed = new bytes32[](2);
        packed[0] = d0;
        packed[1] = d1;
        bytes32 expected = keccak256(abi.encodePacked(packed));
        assertEq(this.hashBatchTransferDetailsExternal(details), expected);
    }

    /// @notice `hashBatchCommittedTransferDetails` — empty array
    function test_hashBatchCommittedTransferDetails_empty() public view {
        CommittedTransferDetail[] memory details = new CommittedTransferDetail[](0);
        bytes32 h = this.hashBatchCommittedTransferDetailsExternal(details);
        assertEq(h, keccak256(abi.encodePacked(new bytes32[](0))));
    }

    /// @notice `hashBatchCommittedTransferDetails` — matches manual encoding
    function test_hashBatchCommittedTransferDetails_matchesPerDetailHashes() public view {
        bytes32 c = keccak256("commit");
        CommittedTransferDetail[] memory details = new CommittedTransferDetail[](1);
        details[0] = CommittedTransferDetail({to: address(1), token: address(2), value: 3, commitment: c});
        bytes32 inner = keccak256(
            abi.encode(Hash.COMMITTED_TRANSFER_DETAIL_TYPEHASH, details[0].to, details[0].token, details[0].value, c)
        );
        bytes32[] memory packed = new bytes32[](1);
        packed[0] = inner;
        assertEq(this.hashBatchCommittedTransferDetailsExternal(details), keccak256(abi.encodePacked(packed)));
    }
}
