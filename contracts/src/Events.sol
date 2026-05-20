// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @notice This event is published when done the transfer correctfully
 * @param from Payer's address
 * @param to Payee's address
 * @param token Token address
 * @param value Amount to be transferred
 * @param commitment Unique commitment
 */
event TransferWithCommitmentSent(
    address indexed from, address indexed to, address indexed token, uint256 value, bytes32 commitment
);
/**
 * @param token Token address
 * @param from Payer's address
 * @param value Amount to be transferred
 */
error AllowanceNotEnough(address token, address from, uint256 value);
