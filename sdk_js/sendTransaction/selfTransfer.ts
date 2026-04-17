import type { Hex, PublicClient, WalletClient } from "viem";
import {
  assertTransferContractConfigured,
  transferWithCommitmentAddress,
} from "../config";
import { transferWithCommitmentAbi } from "../types/abi";
import type {
  SingleTransferArgs,
  UniCommitTransfersArgs,
  BatchTransferWithCommitArgs,
} from "../types/args/selfTransfer";
import { arktype } from "../types/args/selfTransfer";
import { assertPublicWalletSameSupportedChain } from "../utils";

export const transfer = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: SingleTransferArgs,
) => {
  assertTransferContractConfigured();
  assertPublicWalletSameSupportedChain(publicClient, wallet);
  arktype.singleTransfer.assert(args);
  const { request } = await publicClient.simulateContract({
    address: transferWithCommitmentAddress,
    abi: transferWithCommitmentAbi,
    functionName: "transfer",
    args: [args.token, args.to, args.value, args.commitment],
    account,
  });
  const hash = await wallet.writeContract(request);
  return hash;
};

export const unifiedTransfer = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: UniCommitTransfersArgs,
) => {
  assertTransferContractConfigured();
  assertPublicWalletSameSupportedChain(publicClient, wallet);
  arktype.uniCommitTransfers.assert(args);
  const { request } = await publicClient.simulateContract({
    address: transferWithCommitmentAddress,
    abi: transferWithCommitmentAbi,
    functionName: "transfer",
    args: [args.details, args.commitment],
    account,
  });
  const hash = await wallet.writeContract(request);
  return hash;
};

export const batchTransfer = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: BatchTransferWithCommitArgs,
) => {
  assertTransferContractConfigured();
  assertPublicWalletSameSupportedChain(publicClient, wallet);
  arktype.batchTransferWithCommit.assert(args);
  const { request } = await publicClient.simulateContract({
    address: transferWithCommitmentAddress,
    abi: transferWithCommitmentAbi,
    functionName: "transfer",
    args: [args.details],
    account,
  });
  const hash = await wallet.writeContract(request);
  return hash;
};
