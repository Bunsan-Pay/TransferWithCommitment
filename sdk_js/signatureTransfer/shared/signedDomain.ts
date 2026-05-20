import { type } from "arktype";
import { address, bytes32, uint256 } from "../../types/utils";

const chainIdAsDomain = type("number").or(uint256);

// viem の getEip712Domain は chainId を Number、salt を bytes32 で返しうる。
// domainForTypedDataSign はゼロ salt を除くため、バンドル上の salt は無いことがある — optional と一致させる。
export const signedDomainSchema = type({
  name: type("string"),
  version: type("string"),
  chainId: chainIdAsDomain,
  verifyingContract: address,
  salt: bytes32.optional(),
});

/** Bundled EIP-712 `domain` shape (matches {@link signedDomainSchema}); optional `salt` after zero-strip. */
export type SignedBundleDomain = typeof signedDomainSchema.infer;

/** @deprecated Use {@link SignedBundleDomain}. Preserved so existing imports keep compiling. */
export type Eip712SignedDomain = SignedBundleDomain;
