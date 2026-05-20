// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Test} from "forge-std/Test.sol";
import {TransferWithCommitment} from "../src/TransferWithCommitment.sol";

/// @notice `TransferWithCommitment` — deployment wires `SelfTransfer` + `SignatureTransfer` (immutable EIP-712 domain).
contract TransferWithCommitmentTest is Test {
    /// @notice Constructor delegates to `SignatureTransfer` — EIP-712 domain only (no owner / verifier)
    function test_constructor_initializesEip712DomainOnly() public {
        TransferWithCommitment twc = new TransferWithCommitment("MyDomain", "2");
        (, string memory name, string memory version,,,,) = twc.eip712Domain();
        assertEq(name, "MyDomain");
        assertEq(version, "2");
    }
}
