import { arbitrum, mainnet, polygon, sepolia, avalanche } from "viem/chains";

/** 未設定のままでは署名・送信・検証用 API は利用できない */
export const ZERO_TRANSFER_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

export const transferWithCommitmentAddress: `0x${string}` =
  ZERO_TRANSFER_ADDRESS;

export const supportedChains = [mainnet, sepolia, polygon, arbitrum, avalanche];

/** コントラクトアドレスがゼロアドレスのときに呼ぶ（各 API の先頭で使用） */
export const assertTransferContractConfigured = (): void => {
  if (transferWithCommitmentAddress.toLowerCase() === ZERO_TRANSFER_ADDRESS) {
    throw new Error(
      "transferWithCommitmentAddress is not configured (zero address). Set it in config.ts or build-time replacement.",
    );
  }
};
