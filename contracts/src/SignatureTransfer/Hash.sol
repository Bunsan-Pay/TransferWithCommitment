// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;
import "../Structs.sol";

library Hash {
    // keccak256("TransferWithCommit(address from,address to,address token,address executor,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 commitment)")
    bytes32 public constant TRANSFER_WITH_COMMIT_TYPEHASH =
        0xc912cc151d552cccfc1b7e01c01813079a180595f06bc31b49bb9776bcbaf9e7;
    // keccak256("UniCommitTransfers(address from,address executor,TransferDetail[] details,uint256 validAfter,uint256 validBefore,bytes32 commitment)TransferDetail(address to,address token,uint256 value)")
    bytes32 public constant UNI_COMMIT_TRANSFER_TYPEHASH =
        0xf5592802ae1a0ebc83eae180371f77e623087c28f0910e80c75784ff90fa7783;
    // keccak256("BatchTransferWithCommit(address from,address executor,CommittedTransferDetail[] details,uint256 validAfter,uint256 validBefore,bytes32 batchCommitment)CommittedTransferDetail(address to,address token,uint256 value,bytes32 commitment)")
    bytes32 public constant BATCH_TRANSFER_WITH_COMMIT_TYPEHASH =
        0x106e0055ba0f813d8dae754dbffed12d3ebda71c6660603ea71b58df3210e94b;
    // keccak256("TransferDetail(address to,address token,uint256 value)")
    bytes32 public constant TRANSFER_DETAIL_TYPEHASH =
        0xf28c27030b5e54646e0eb1076a80d92c751231b70611de6bd5b43383d1ceceab;
    // keccak256("CommittedTransferDetail(address to,address token,uint256 value,bytes32 commitment)")
    bytes32 public constant COMMITTED_TRANSFER_DETAIL_TYPEHASH =
        0x1b040f87c324efbeabedc6b62a0a8e0f02ca3e786f7f73ae0875b0648e0afe6c;

    function hashTransferDetail(TransferDetail calldata detail) internal pure returns (bytes32 result) {
        result = keccak256(abi.encode(TRANSFER_DETAIL_TYPEHASH, detail.to, detail.token, detail.value));
    }

    function hashBatchTransferDetails(TransferDetail[] calldata details) internal pure returns (bytes32 result) {
        bytes32[] memory hashes = new bytes32[](details.length);
        for (uint256 i = 0; i < details.length; i++) {
            hashes[i] = hashTransferDetail(details[i]);
        }
        result = keccak256(abi.encodePacked(hashes));
    }

    function hashCommittedTransferDetail(CommittedTransferDetail calldata detail)
        internal
        pure
        returns (bytes32 result)
    {
        result = keccak256(
            abi.encode(COMMITTED_TRANSFER_DETAIL_TYPEHASH, detail.to, detail.token, detail.value, detail.commitment)
        );
    }

    function hashBatchCommittedTransferDetails(CommittedTransferDetail[] calldata details)
        internal
        pure
        returns (bytes32 result)
    {
        bytes32[] memory hashes = new bytes32[](details.length);
        for (uint256 i = 0; i < details.length; i++) {
            hashes[i] = hashCommittedTransferDetail(details[i]);
        }
        result = keccak256(abi.encodePacked(hashes));
    }
}
