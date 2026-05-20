// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {TransferWithCommitment} from "../../src/TransferWithCommitment.sol";

/// @dev Exposes `_hashTypedDataV4` for constructing EIP-712 digests in tests.
contract TransferWithCommitmentDigest is TransferWithCommitment {
    constructor(string memory name, string memory version) TransferWithCommitment(name, version) {}

    function hashTypedDataV4(bytes32 structHash) external view returns (bytes32) {
        return _hashTypedDataV4(structHash);
    }
}
