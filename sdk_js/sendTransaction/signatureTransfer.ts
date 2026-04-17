import type { PublicClient, WalletClient, Hex } from "viem";
import {
  assertTransferContractConfigured,
  transferWithCommitmentAddress,
} from "../config";
import { transferWithCommitmentAbi } from "../types/abi";
import type {
  SignedTransferWithCommit,
  SignedUniCommitTransfers,
  SignedBatchTransferWithCommit,
  SignedCancelAuthorization,
} from "../types/signedData";
import type {
  committedTransferDetail,
  transferDetail,
} from "../types/transferDetail";
import {
  assertPublicWalletSameSupportedChain,
  assertSignedDomainMatchesClientAndConfig,
} from "../utils";

const assertSignatureTransferContext = (
  publicClient: PublicClient,
  wallet: WalletClient,
  signedData: {
    domain: {
      chainId: number | bigint;
      verifyingContract: `0x${string}`;
    };
  },
) => {
  assertTransferContractConfigured();
  assertPublicWalletSameSupportedChain(publicClient, wallet);
  assertSignedDomainMatchesClientAndConfig(
    publicClient,
    signedData.domain,
    transferWithCommitmentAddress,
  );
};

export const singleTransfer = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  signedData: SignedTransferWithCommit,
) => {
  assertSignatureTransferContext(publicClient, wallet, signedData);
  const { request } = await publicClient.simulateContract({
    address: transferWithCommitmentAddress,
    abi: transferWithCommitmentAbi,
    functionName: "transferWithAuthorization",
    args: [
      signedData.from,
      signedData.to,
      signedData.token,
      signedData.value,
      signedData.validAfter,
      signedData.validBefore,
      signedData.commitment,
      signedData.signature,
    ],
    account,
  });
  const hash = await wallet.writeContract(request);
  return hash;
};

export const unifiedTransfer = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  signedData: SignedUniCommitTransfers,
) => {
  assertSignatureTransferContext(publicClient, wallet, signedData);
  const { request } = await publicClient.simulateContract({
    address: transferWithCommitmentAddress,
    abi: transferWithCommitmentAbi,
    functionName: "transferWithAuthorization",
    args: [
      signedData.from,
      signedData.details.map((detail: typeof transferDetail.infer) => ({
        to: detail.to,
        token: detail.token,
        value: detail.value,
      })),
      signedData.validAfter,
      signedData.validBefore,
      signedData.commitment,
      signedData.signature,
    ],
    account,
  });
  const hash = await wallet.writeContract(request);
  return hash;
};

export const batchTransfer = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  signedData: SignedBatchTransferWithCommit,
) => {
  assertSignatureTransferContext(publicClient, wallet, signedData);
  const { request } = await publicClient.simulateContract({
    address: transferWithCommitmentAddress,
    abi: transferWithCommitmentAbi,
    functionName: "transferWithAuthorization",
    args: [
      signedData.from,
      signedData.details.map(
        (detail: typeof committedTransferDetail.infer) => ({
          to: detail.to,
          token: detail.token,
          value: detail.value,
          commitment: detail.commitment,
        }),
      ),
      signedData.validAfter,
      signedData.validBefore,
      signedData.signature,
    ],
    account,
  });
  const hash = await wallet.writeContract(request);
  return hash;
};

export const cancelAuthorization = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  signedData: SignedCancelAuthorization,
) => {
  assertSignatureTransferContext(publicClient, wallet, signedData);
  const { request } = await publicClient.simulateContract({
    address: transferWithCommitmentAddress,
    abi: transferWithCommitmentAbi,
    functionName: "cancelAuthorization",
    args: [signedData.authorizer, signedData.commitment, signedData.signature],
    account,
  });
  const hash = await wallet.writeContract(request);
  return hash;
};
