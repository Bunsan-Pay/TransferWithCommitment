# TransferWithCommitment — deterministic CREATE2 address

Deployment uses [EIP-2470](https://eips.ethereum.org/EIPS/eip-2470) `SingletonFactory` at `0xce0042B868300000d44A59004Da54A005ffdcf9f` via [script/TransferWithCommitmentCreate2.s.sol](script/TransferWithCommitmentCreate2.s.sol).

## Canonical parameters (must match SDKs and off-chain signers)

| Parameter         | Value                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `CREATE2_SALT`    | `keccak256("TransferWithCommitment/default/1")` = `0x779ff8f20f474ffe5281ee6d24a20a25c33cbac9e89a282d33b494d0458dfdc2` |
| `EIP712_NAME`     | `TransferWithCommitment`                                                                                               |
| `EIP712_VERSION`  | `1`                                                                                                                    |
| Singleton factory | `0xce0042B868300000d44A59004Da54A005ffdcf9f`                                                                           |

**Compiler / build:** `foundry.toml` — `solc_version = "0.8.26"`, `optimizer = true`, `viaIR = true`. Any change to salt, name/version, Solidity, or optimizer settings changes the init code and therefore the address.

## Expected address (current build)

With the repo’s default Foundry profile and constructor args above:

`0x5C260DD537A9c23Bbd42493e59F3CeA7da2DbC71`

## Recompute locally

```shell
cd contracts
forge build --quiet
BYTECODE=$(forge inspect TransferWithCommitment bytecode)
ARGS=$(cast abi-encode "constructor(string,string)" "TransferWithCommitment" "1")
INIT=$(cast concat-hex "$BYTECODE" "$ARGS")
SALT=$(cast keccak $(cast from-utf8 "TransferWithCommitment/default/1"))
cast create2 --deployer 0xce0042B868300000d44A59004Da54A005ffdcf9f --salt "$SALT" --init-code "$INIT"
```

If this output differs from the table above, update SDK constants and this document together.
