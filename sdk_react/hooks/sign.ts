"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { sign as signBatch } from "eth-twc-sdk-js/signatureTransfer/batch";
import { sign as signCancel } from "eth-twc-sdk-js/signatureTransfer/cancelAuthorization";
import { sign as signSingle } from "eth-twc-sdk-js/signatureTransfer/single";
import { sign as signUnified } from "eth-twc-sdk-js/signatureTransfer/unified";
import type {
  SignedBatchTransfer,
  SignatureTransferBatchArgs,
} from "eth-twc-sdk-js/signatureTransfer/batch";
import type {
  CancelAuthorizationArgs,
  SignedCancelAuthorization,
} from "eth-twc-sdk-js/signatureTransfer/cancelAuthorization";
import type {
  SignatureTransferSingleArgs,
  SignedSingleTransfer,
} from "eth-twc-sdk-js/signatureTransfer/single";
import type {
  SignatureTransferUnifiedArgs,
  SignedUnifiedTransfer,
} from "eth-twc-sdk-js/signatureTransfer/unified";
import { useConnection, usePublicClient, useWalletClient } from "wagmi";

import { narrowWriteClients } from "./clients.ts";

export function useSignSingleTransfer(
  options?: Omit<
    UseMutationOptions<SignedSingleTransfer, Error, SignatureTransferSingleArgs>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (args: SignatureTransferSingleArgs) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return signSingle(pc, wc, addr, args);
    },
  });
}

/** UniCommitTransfers EIP-712（公開名 unified）を署名する */
export function useSignUnifiedTransfer(
  options?: Omit<
    UseMutationOptions<
      SignedUnifiedTransfer,
      Error,
      SignatureTransferUnifiedArgs
    >,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (args: SignatureTransferUnifiedArgs) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return signUnified(pc, wc, addr, args);
    },
  });
}

/** 別名保持: 旧 hooks 利用者の移行パスとして */
export const useSignUniCommitTransfers = useSignUnifiedTransfer;

export function useSignBatchTransfer(
  options?: Omit<
    UseMutationOptions<SignedBatchTransfer, Error, SignatureTransferBatchArgs>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (args: SignatureTransferBatchArgs) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return signBatch(pc, wc, addr, args);
    },
  });
}

/** 別名保持: 旧名前 `BatchTransferWithCommit` と対応 */
export const useSignBatchTransferWithCommit = useSignBatchTransfer;

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
      return signCancel(pc, wc, addr, args);
    },
  });
}
