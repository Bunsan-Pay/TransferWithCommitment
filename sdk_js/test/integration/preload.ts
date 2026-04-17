/**
 * 結合テスト用: `TWC_ADDRESS` を注入した config を先に登録する。
 * `bun test --preload ./test/integration/preload.ts ...` でのみ使用。
 */
import { mock } from "bun:test";
import { anvil } from "viem/chains";

const addr = process.env.TWC_ADDRESS;
if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) {
  throw new Error(
    "integration preload: set TWC_ADDRESS to deployed TransferWithCommitment (run scripts/test-sdk-js-integration.sh)",
  );
}

mock.module(new URL("../../config.ts", import.meta.url).pathname, () => {
  const ZERO_TRANSFER_ADDRESS =
    "0x0000000000000000000000000000000000000000" as const;
  const transferWithCommitmentAddress = addr as `0x${string}`;
  return {
    ZERO_TRANSFER_ADDRESS,
    transferWithCommitmentAddress,
    supportedChains: [anvil],
    assertTransferContractConfigured(): void {
      if (
        transferWithCommitmentAddress.toLowerCase() === ZERO_TRANSFER_ADDRESS
      ) {
        throw new Error(
          "transferWithCommitmentAddress is not configured (zero address).",
        );
      }
    },
  };
});
