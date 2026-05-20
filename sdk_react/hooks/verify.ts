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

export function useVerifyTransfer(
  txHash: Hex | undefined,
  args: VerifyTransferArgs | undefined,
  options?: Omit<UseQueryOptions<null, Error, null>, "queryKey" | "queryFn">,
): UseQueryResult<null, Error> {
  const publicClient = usePublicClient();
  const { enabled: enabledOption, ...queryOptions } = options ?? {};

  return useQuery({
    ...queryOptions,
    queryKey: [
      "twc",
      "verify",
      txHash ?? null,
      args?.from ?? null,
      args?.token ?? null,
      args?.to ?? null,
      args != null ? args.value.toString() : null,
      args?.commitment ?? null,
    ],
    queryFn: async () => {
      if (!publicClient) throw new Error("TWC: public client is not available");
      if (!txHash) throw new Error("TWC: tx hash is required");
      if (!args) throw new Error("TWC: verify args are required");
      await verify(publicClient, txHash, args);
      return null;
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
