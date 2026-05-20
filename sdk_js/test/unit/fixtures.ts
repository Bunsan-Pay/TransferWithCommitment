import { arbitrum, mainnet, polygon, sepolia } from "viem/chains";
import type { GetEip712DomainReturnType } from "viem";

/** 単体テスト用の非ゼロコントラクトアドレス（`config` モックと整合） */
export const TEST_VERIFIER_CONTRACT =
  "0x2222222222222222222222222222222222222222" as const;

export const ADDR = "0x1111111111111111111111111111111111111111" as const;
export const ADDR_B = "0x3333333333333333333333333333333333333333" as const;
export const COMMIT =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

export const SALT_ZERO =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export function testDomain(
  verifyingContract: `0x${string}` = TEST_VERIFIER_CONTRACT,
  chainId: number = mainnet.id,
): GetEip712DomainReturnType["domain"] {
  return {
    name: "TransferWithCommitment",
    version: "1",
    chainId,
    verifyingContract,
    salt: SALT_ZERO,
  };
}
