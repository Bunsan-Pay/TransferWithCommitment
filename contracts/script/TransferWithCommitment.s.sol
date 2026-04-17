// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {TransferWithCommitment} from "../src/TransferWithCommitment.sol";

/// @dev Example deploy script — adjust name/version and broadcast as needed.
contract TransferWithCommitmentScript is Script {
    function run() external {
        vm.startBroadcast();
        new TransferWithCommitment("TransferWithCommitment", "1");
        vm.stopBroadcast();
    }
}
