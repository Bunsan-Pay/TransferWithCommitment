"use client";

import { useQuery } from "@tanstack/react-query";
import { transferWithCommitmentAddress } from "eth-twc-sdk-js/config";
import { usePublicClient } from "wagmi";

/**
 * 接続中チェーンで、canonical TWC アドレスにコントラクトコードがあるか（`eth_getCode`）。
 * クライアント未取得・読み込み中は `false`。
 */
export function useIsTransferWithCommitmentDeployed(): boolean {
  const publicClient = usePublicClient();
  const { data } = useQuery({
    queryKey: [
      "twc",
      "deployed",
      publicClient?.chain?.id ?? null,
      transferWithCommitmentAddress,
    ],
    queryFn: async () => {
      if (!publicClient) return false;
      const code = await publicClient.getCode({
        address: transferWithCommitmentAddress,
      });
      return code !== undefined && code !== "0x";
    },
    enabled: Boolean(publicClient),
  });
  return data === true;
}

/** @deprecated Use {@link useIsTransferWithCommitmentDeployed}. */
export const useIsSupportedChain = useIsTransferWithCommitmentDeployed;
