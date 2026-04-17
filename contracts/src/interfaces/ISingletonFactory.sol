// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @dev EIP-2470 Singleton Factory — same address on chains where the factory is deployed.
///      https://eips.ethereum.org/EIPS/eip-2470
interface ISingletonFactory {
    function deploy(bytes memory initCode, bytes32 salt) external returns (address payable createdContract);
}
