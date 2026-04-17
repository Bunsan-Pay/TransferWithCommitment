"use client";

import { isSupportedChain } from "eth-twc-sdk-js/utils";
import { useMemo } from "react";
import { usePublicClient } from "wagmi";

/**
 * 現在の `usePublicClient()` のチェーンが `supportedChains` に含まれるか。
 * クライアント未取得時は `false`。
 */
export function useIsSupportedChain(): boolean {
  const publicClient = usePublicClient();
  return useMemo(() => {
    if (!publicClient) return false;
    return isSupportedChain(publicClient);
  }, [publicClient]);
}
