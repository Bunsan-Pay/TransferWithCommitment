"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { Hex } from "viem";
import { sendTx as sendSelfBatch } from "eth-twc-sdk-js/selfTransfer/batch";
import { sendTx as sendSelfSingle } from "eth-twc-sdk-js/selfTransfer/single";
import { sendTx as sendSelfUnified } from "eth-twc-sdk-js/selfTransfer/unified";
import type { SelfTransferBatchArgs } from "eth-twc-sdk-js/selfTransfer/batch";
import type { SelfTransferSingleArgs } from "eth-twc-sdk-js/selfTransfer/single";
import type { SelfTransferUnifiedArgs } from "eth-twc-sdk-js/selfTransfer/unified";
import { useConnection, usePublicClient, useWalletClient } from "wagmi";

import { narrowWriteClients } from "./clients.ts";

export function useSelfTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, SelfTransferSingleArgs>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (args: SelfTransferSingleArgs) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return sendSelfSingle(pc, wc, addr, args);
    },
  });
}

/** UniCommitTransfers 経路と同じ `transfer([details], commitment)` */
export function useSelfUnifiedTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, SelfTransferUnifiedArgs>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (args: SelfTransferUnifiedArgs) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return sendSelfUnified(pc, wc, addr, args);
    },
  });
}

export function useSelfBatchTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, SelfTransferBatchArgs>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (args: SelfTransferBatchArgs) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return sendSelfBatch(pc, wc, addr, args);
    },
  });
}
