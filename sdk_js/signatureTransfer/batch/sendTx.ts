import type { Hex, PublicClient, WalletClient } from "viem";
import { transferWithCommitmentAbi } from "../../abi";
import { transferWithCommitmentAddress } from "../../config";
import { committedTransferDetail } from "../../types/transferDetail";
import { assertSignatureTransferContext } from "../shared/context";
import type { SignedBatchTransfer } from "./types";

export const sendTx = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  signedData: SignedBatchTransfer,
) => {
  await assertSignatureTransferContext(publicClient, wallet, signedData);
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
      signedData.batchCommitment,
      signedData.signature,
    ],
    account,
  });
  const hash = await wallet.writeContract(request);
  return hash;
};
