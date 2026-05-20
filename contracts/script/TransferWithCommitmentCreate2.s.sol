// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console2} from "forge-std/Script.sol";
import {TransferWithCommitment} from "../src/TransferWithCommitment.sol";
import {ISingletonFactory} from "../src/interfaces/ISingletonFactory.sol";

/// @title Deploy `TransferWithCommitment` via EIP-2470 Singleton Factory (CREATE2)
///
/// @notice Address determinism
/// - The deployed address depends on: `CREATE2_SALT`, constructor `name` / `version`, and the
///   compiler output (`foundry.toml`: solc, optimizer, viaIR). Change any of these and the address changes.
///
/// @notice EIP-712
/// - `name` and `version` become the EIP-712 domain separator; they must match what off-chain signers use.
///
/// @notice Environment (optional; defaults shown)
/// - `CREATE2_SALT` — hex-encoded `bytes32`. Default: `keccak256("TransferWithCommitment/default/1")`.
/// - `EIP712_NAME` — default `"TransferWithCommitment"`.
/// - `EIP712_VERSION` — default `"1"`.
///
/// @notice Chain requirement
/// - The singleton factory must exist at `SINGLETON_FACTORY` on the target chain.
contract TransferWithCommitmentCreate2Script is Script {
    address internal constant SINGLETON_FACTORY = 0xce0042B868300000d44A59004Da54A005ffdcf9f;

    bytes32 internal constant DEFAULT_SALT = keccak256("TransferWithCommitment/default/1");

    function run() external {
        bytes32 salt = vm.envOr("CREATE2_SALT", DEFAULT_SALT);
        // Explicit `string(...)` so `vm.envOr` resolves to the string overload (not bytes).
        string memory name = vm.envOr("EIP712_NAME", string("TransferWithCommitment"));
        string memory version = vm.envOr("EIP712_VERSION", string("1"));

        bytes memory initCode = abi.encodePacked(type(TransferWithCommitment).creationCode, abi.encode(name, version));

        vm.startBroadcast();
        address deployed = ISingletonFactory(SINGLETON_FACTORY).deploy(initCode, salt);
        vm.stopBroadcast();

        console2.log("Singleton factory:", SINGLETON_FACTORY);
        console2.log("TransferWithCommitment (CREATE2):", deployed);
    }
}
