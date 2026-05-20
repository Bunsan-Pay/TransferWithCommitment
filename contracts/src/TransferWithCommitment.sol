// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;
import "./ITransferWithCommitment.sol";
import "./SignatureTransfer/SignatureTransfer.sol";
import "./SelfTransfer/SelfTransfer.sol";

contract TransferWithCommitment is ITransferWithCommitment, SelfTransfer, SignatureTransfer {
    constructor(string memory name, string memory version) SignatureTransfer(name, version) {}
}
