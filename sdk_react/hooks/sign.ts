"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import * as sign from "eth-twc-sdk-js/sign";
import type {
  BatchTransferWithCommitArgs,
  CancelAuthorizationArgs,
  SingleTransferArgs,
  UniCommitTransfersArgs,
} from "eth-twc-sdk-js/types/args/signatureTransfer";
import type {
  SignedBatchTransferWithCommit,
  SignedCancelAuthorization,
  SignedTransferWithCommit,
  SignedUniCommitTransfers,
} from "eth-twc-sdk-js/types/signedData";
import { useConnection, usePublicClient, useWalletClient } from "wagmi";

import { narrowWriteClients } from "./clients.ts";

export function useSignSingleTransfer(
  options?: Omit<
    UseMutationOptions<SignedTransferWithCommit, Error, SingleTransferArgs>,
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
      return sign.singleTransfer(pc, wc, addr, args);
    },
  });
}

export function useSignUniCommitTransfers(
  options?: Omit<
    UseMutationOptions<SignedUniCommitTransfers, Error, UniCommitTransfersArgs>,
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
      return sign.uniCommitTransfers(pc, wc, addr, args);
    },
  });
}

export function useSignBatchTransferWithCommit(
  options?: Omit<
    UseMutationOptions<
      SignedBatchTransferWithCommit,
      Error,
      BatchTransferWithCommitArgs
    >,
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
      return sign.batchTransferWithCommit(pc, wc, addr, args);
    },
  });
}

export function useSignCancelAuthorization(
  options?: Omit<
    UseMutationOptions<
      SignedCancelAuthorization,
      Error,
      CancelAuthorizationArgs
    >,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (args: CancelAuthorizationArgs) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return sign.cancelAuthorization(pc, wc, addr, args);
    },
  });
}
