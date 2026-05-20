"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { SignedBatchTransfer } from "eth-twc-sdk-js/signatureTransfer/batch";
import type { SignedCancelAuthorization } from "eth-twc-sdk-js/signatureTransfer/cancelAuthorization";
import type { SignedSingleTransfer } from "eth-twc-sdk-js/signatureTransfer/single";
import type { SignedUnifiedTransfer } from "eth-twc-sdk-js/signatureTransfer/unified";
import { sendTx as sendAuthorizedBatch } from "eth-twc-sdk-js/signatureTransfer/batch";
import { sendTx as sendCancelAuthorization } from "eth-twc-sdk-js/signatureTransfer/cancelAuthorization";
import { sendTx as sendAuthorizedSingle } from "eth-twc-sdk-js/signatureTransfer/single";
import { sendTx as sendAuthorizedUnified } from "eth-twc-sdk-js/signatureTransfer/unified";
import type { Hex } from "viem";
import { useConnection, usePublicClient, useWalletClient } from "wagmi";

import { narrowWriteClients } from "./clients.ts";

export function useSendAuthorizedSingleTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, SignedSingleTransfer>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (signed: SignedSingleTransfer) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return sendAuthorizedSingle(pc, wc, addr, signed);
    },
  });
}

export function useSendAuthorizedUnifiedTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, SignedUnifiedTransfer>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (signed: SignedUnifiedTransfer) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return sendAuthorizedUnified(pc, wc, addr, signed);
    },
  });
}

export const useSendAuthorizedUniCommitTransfers =
  useSendAuthorizedUnifiedTransfer;

export function useSendAuthorizedBatchTransfer(
  options?: Omit<
    UseMutationOptions<Hex, Error, SignedBatchTransfer>,
    "mutationFn"
  >,
) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useConnection();

  return useMutation({
    ...options,
    mutationFn: async (signed: SignedBatchTransfer) => {
      const [pc, wc, addr] = narrowWriteClients(
        publicClient,
        walletClient,
        address,
      );
      return sendAuthorizedBatch(pc, wc, addr, signed);
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
      return sendCancelAuthorization(pc, wc, addr, signed);
    },
  });
}
