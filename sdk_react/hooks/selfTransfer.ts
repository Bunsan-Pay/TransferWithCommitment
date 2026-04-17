"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import * as selfTransfer from "eth-twc-sdk-js/sendTransaction/selfTransfer";
import type {
  BatchTransferWithCommitArgs,
  SingleTransferArgs,
  UniCommitTransfersArgs,
} from "eth-twc-sdk-js/types/args/selfTransfer";
import type { Hex } from "viem";
import { useConnection, usePublicClient, useWalletClient } from "wagmi";

import { narrowWriteClients } from "./clients.ts";

export function useSelfTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, SingleTransferArgs>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (args: SingleTransferArgs) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return selfTransfer.transfer(pc, wc, addr, args);
    },
  });
}

export function useSelfUnifiedTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, UniCommitTransfersArgs>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (args: UniCommitTransfersArgs) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return selfTransfer.unifiedTransfer(pc, wc, addr, args);
    },
  });
}

export function useSelfBatchTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, BatchTransferWithCommitArgs>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (args: BatchTransferWithCommitArgs) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return selfTransfer.batchTransfer(pc, wc, addr, args);
    },
  });
}
