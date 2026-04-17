// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "./SignatureTransfer/SignatureTransfer.sol";
import "./SelfTransfer/SelfTransfer.sol";

contract TransferWithCommitment is SelfTransfer, SignatureTransfer {
    constructor(string memory name, string memory version) SignatureTransfer(name, version) {}
}
