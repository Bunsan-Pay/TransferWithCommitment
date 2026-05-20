import type { GetEip712DomainReturnType } from "viem";

import type { SignedBundleDomain } from "./signedDomain";

const ZERO_SALT =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

/**
 * OpenZeppelin EIP712 の `_buildDomainSeparator` は name/version/chainId/verifyingContract のみ。
 * viem の `getEip712Domain` は `salt: bytes32(0)` を返し、`hashTypedData` が salt 付き domain 型になると
 * オンチェーンの domain separator と一致しなくなるため、ゼロ salt は署名前に除く。
 */
export function domainForTypedDataSign(
  raw: GetEip712DomainReturnType["domain"],
): SignedBundleDomain {
  if (
    raw.salt !== undefined &&
    typeof raw.salt === "string" &&
    raw.salt.toLowerCase() === ZERO_SALT
  ) {
    const { salt: _s, ...rest } = raw;
    return rest as SignedBundleDomain;
  }
  return raw as SignedBundleDomain;
}
