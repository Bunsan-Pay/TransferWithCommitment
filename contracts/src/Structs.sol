// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

struct TransferDetail {
    address to; // Payee's address
    address token; // Token address
    uint256 value; // Amount to be transferred
}

struct CommittedTransferDetail {
    address to; // Payee's address
    address token; // Token address
    uint256 value; // Amount to be transferred
    bytes32 commitment; // Unique commitment
}
