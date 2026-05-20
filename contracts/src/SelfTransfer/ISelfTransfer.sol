// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;
import "../Structs.sol";
import "../State/IState.sol";

interface ISelfTransfer is IState {
    /**
     *
     * @param token Token address
     * @param to Payee's address
     * @param value Amount to be transferred
     * @param commitment Unique commitment
     */
    function transfer(address token, address to, uint256 value, bytes32 commitment) external;

    /**
     *
     * @param details Array of transfer details
     * @param commitment Unique commitment
     */
    function transfer(TransferDetail[] calldata details, bytes32 commitment) external;
    /**
     *
     * @param details Batch transfers containing a commitment for each transaction
     */
    function transfer(CommittedTransferDetail[] calldata details) external;
}
