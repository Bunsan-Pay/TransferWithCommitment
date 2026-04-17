import { arbitrum, mainnet, polygon, sepolia } from "viem/chains";
import { TEST_VERIFIER_CONTRACT } from "./fixtures";

/** `mock.module` 向け。本番 `config.ts` と同じ assert ロジック */
export function mockConfigModule() {
  const ZERO_TRANSFER_ADDRESS =
    "0x0000000000000000000000000000000000000000" as const;
  const transferWithCommitmentAddress =
    TEST_VERIFIER_CONTRACT as `0x${string}`;
  return {
    ZERO_TRANSFER_ADDRESS,
    transferWithCommitmentAddress,
    supportedChains: [mainnet, sepolia, polygon, arbitrum],
    assertTransferContractConfigured(): void {
      if (
        transferWithCommitmentAddress.toLowerCase() === ZERO_TRANSFER_ADDRESS
      ) {
        throw new Error(
          "transferWithCommitmentAddress is not configured (zero address). Set it in config.ts or build-time replacement.",
        );
      }
    },
  };
}
