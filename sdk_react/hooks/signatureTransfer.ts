"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import * as signatureTransfer from "eth-twc-sdk-js/sendTransaction/signatureTransfer";
import type {
  SignedBatchTransferWithCommit,
  SignedCancelAuthorization,
  SignedTransferWithCommit,
  SignedUniCommitTransfers,
} from "eth-twc-sdk-js/types/signedData";
import type { Hex } from "viem";
import { useConnection, usePublicClient, useWalletClient } from "wagmi";

import { narrowWriteClients } from "./clients.ts";

export function useSendAuthorizedSingleTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, SignedTransferWithCommit>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (signed: SignedTransferWithCommit) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return signatureTransfer.singleTransfer(pc, wc, addr, signed);
    },
  });
}

export function useSendAuthorizedUnifiedTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, SignedUniCommitTransfers>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (signed: SignedUniCommitTransfers) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return signatureTransfer.unifiedTransfer(pc, wc, addr, signed);
    },
  });
}

export function useSendAuthorizedBatchTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, SignedBatchTransferWithCommit>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (signed: SignedBatchTransferWithCommit) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return signatureTransfer.batchTransfer(pc, wc, addr, signed);
    },
  });
}

export function useSendCancelAuthorization(
  options?: Omit<
    UseMutationOptions<Hex, Error, SignedCancelAuthorization>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (signed: SignedCancelAuthorization) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return signatureTransfer.cancelAuthorization(pc, wc, addr, signed);
    },
  });
}
