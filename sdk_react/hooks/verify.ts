"use client";

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  getTransferWithCommitmentSentEventLogs,
  verify,
} from "eth-twc-sdk-js/verify";
import type { Hex, Log } from "viem";
import { usePublicClient } from "wagmi";

/** Args for `verify` — same shape as the third argument to `eth-twc-sdk-js/verify`. */
export type VerifyTransferArgs = Parameters<typeof verify>[2];

/**
 * `verify` 引数の安定したフィンガープリント（TanStack Query の queryKey 用）。
 * 手動でフィールド列挙せず、`VerifyTransferArgs` のキーをソートして JSON 化する（bigint は文字列化）。
 */
function verifyArgsQueryKeyPart(
  args: VerifyTransferArgs | undefined,
): string | null {
  if (!args) return null;
  const keys = Object.keys(args as object).sort() as (keyof VerifyTransferArgs)[];
  const sorted: Record<string, string> = {};
  for (const key of keys) {
    const v = args[key];
    sorted[String(key)] = typeof v === "bigint" ? v.toString() : String(v);
  }
  return JSON.stringify(sorted);
}

export function useVerifyTransfer(
  txHash: Hex | undefined,
  args: VerifyTransferArgs | undefined,
  options?: Omit<UseQueryOptions<void, Error, void>, "queryKey" | "queryFn">,
): UseQueryResult<void, Error> {
  const publicClient = usePublicClient();
  const { enabled: enabledOption, ...queryOptions } = options ?? {};

  return useQuery({
    ...queryOptions,
    queryKey: ["twc", "verify", txHash ?? null, verifyArgsQueryKeyPart(args)],
    queryFn: async () => {
      if (!publicClient) throw new Error("TWC: public client is not available");
      if (!txHash) throw new Error("TWC: tx hash is required");
      if (!args) throw new Error("TWC: verify args are required");
      await verify(publicClient, txHash, args);
    },
    enabled:
      Boolean(publicClient && txHash && args) && (enabledOption ?? true),
  });
}

export function useTransferWithCommitmentSentLogs(
  txHash: Hex | undefined,
  options?: Omit<UseQueryOptions<Log[], Error, Log[]>, "queryKey" | "queryFn">,
): UseQueryResult<Log[], Error> {
  const publicClient = usePublicClient();
  const { enabled: enabledOption, ...queryOptions } = options ?? {};

  return useQuery({
    ...queryOptions,
    queryKey: ["twc", "transferWithCommitmentSent", txHash ?? null],
    queryFn: async () => {
      if (!publicClient) throw new Error("TWC: public client is not available");
      if (!txHash) throw new Error("TWC: tx hash is required");
      return getTransferWithCommitmentSentEventLogs(publicClient, txHash);
    },
    enabled: Boolean(publicClient && txHash) && (enabledOption ?? true),
  });
}
