// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "./SelfTransfer/ISelfTransfer.sol";
import "./SignatureTransfer/ISignatureTransfer.sol";
import "./State/IState.sol";

interface ITransferWithCommitment is IState, ISelfTransfer, ISignatureTransfer {}
