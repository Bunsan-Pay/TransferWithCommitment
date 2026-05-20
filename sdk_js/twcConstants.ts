/**
 * Canonical CREATE2 / EIP-712 parameters for TransferWithCommitment.
 * Must stay in lockstep with `contracts/script/TransferWithCommitmentCreate2.s.sol`
 * and `contracts/TWC_CREATE2.md`.
 * (Singleton factory address lives in contracts / deployment docs only — not part of the SDK surface.)
 */

/** `keccak256("TransferWithCommitment/default/1")` */
export const TRANSFER_WITH_COMMITMENT_CREATE2_SALT =
  "0x779ff8f20f474ffe5281ee6d24a20a25c33cbac9e89a282d33b494d0458dfdc2" as const;

export const EIP712_DOMAIN_NAME = "TransferWithCommitment" as const;
export const EIP712_DOMAIN_VERSION = "1" as const;

/** Deterministic address for default Foundry profile + default constructor args. */
export const transferWithCommitmentAddress =
  "0x5C260DD537A9c23Bbd42493e59F3CeA7da2DbC71" as const;
