import { arbitrum, mainnet, polygon, sepolia } from "viem/chains";

import { TEST_VERIFIER_CONTRACT } from "./fixtures.ts";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** preload の `eth-twc-sdk-js/config` モックと共有。テストで上書き可能。 */
export const sdkConfigState = {
  transferWithCommitmentAddress: TEST_VERIFIER_CONTRACT as `0x${string}`,
};

export function resetSdkConfigAddress(): void {
  sdkConfigState.transferWithCommitmentAddress =
    TEST_VERIFIER_CONTRACT as `0x${string}`;
}

export function setSdkConfigAddressZero(): void {
  sdkConfigState.transferWithCommitmentAddress = ZERO;
}

export function buildMockSdkConfigModule() {
  return {
    ZERO_TRANSFER_ADDRESS: ZERO,
    get transferWithCommitmentAddress() {
      return sdkConfigState.transferWithCommitmentAddress;
    },
    supportedChains: [mainnet, sepolia, polygon, arbitrum],
    assertTransferContractConfigured(): void {
      if (
        sdkConfigState.transferWithCommitmentAddress.toLowerCase() ===
        ZERO.toLowerCase()
      ) {
        throw new Error(
          "transferWithCommitmentAddress is not configured (zero address). Set it in config.ts or build-time replacement.",
        );
      }
    },
  };
}
