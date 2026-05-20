// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;
import "./ISelfTransfer.sol";
import "../Events.sol";
import "../State/State.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SelfTransfer is ISelfTransfer, State, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /**
     * @notice A single transfer that includes a commitment
     * @param token Token address
     * @param to Payee's address
     * @param value Amount to be transferred
     * @param commitment Unique commitment
     */
    function transfer(address token, address to, uint256 value, bytes32 commitment) external nonReentrant {
        _transferWithGuard(token, to, value, commitment);
    }

    /**
     * @notice Multiple transfers containing a single commitment
     * @param details Array of transfer details
     * @param commitment Unique commitment
     */
    function transfer(TransferDetail[] calldata details, bytes32 commitment)
        external
        nonReentrant
        replayGuard(msg.sender, commitment)
    {
        require(details.length > 0, "TransferWithCommitment: The length of `details` must be at least 1");
        for (uint256 i = 0; i < details.length; i++) {
            _transfer(details[i].token, details[i].to, details[i].value, commitment);
        }
    }

    /**
     * @notice A batch transfer containing unique commitments associated with each transfer
     * @param details Batch transfers containing a commitment for each transaction
     */
    function transfer(CommittedTransferDetail[] calldata details) external nonReentrant {
        require(details.length > 0, "TransferWithCommitment: The length of `details` must be at least 1");
        for (uint256 i = 0; i < details.length; i++) {
            _transferWithGuard(details[i].token, details[i].to, details[i].value, details[i].commitment);
        }
    }

    function _transferWithGuard(address token, address to, uint256 value, bytes32 commitment)
        internal
        replayGuard(msg.sender, commitment)
    {
        _transfer(token, to, value, commitment);
    }

    function _transfer(address token, address to, uint256 value, bytes32 commitment) private {
        IERC20 tokenContract = IERC20(token);
        if (tokenContract.allowance(msg.sender, address(this)) < value) {
            revert AllowanceNotEnough(token, msg.sender, value);
        }
        tokenContract.safeTransferFrom(msg.sender, to, value);
        emit TransferWithCommitmentSent(msg.sender, to, token, value, commitment);
    }
}
