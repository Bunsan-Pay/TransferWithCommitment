// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IState {
    event CommitmentUsed(address indexed payer, bytes32 indexed commitment);
    /**
     * @notice Returns the state of an commitment
     * @param payer Payer's address
     * @param commitment Unique commitment
     */
    function commitmentState(address payer, bytes32 commitment) external view returns (bool);
}
