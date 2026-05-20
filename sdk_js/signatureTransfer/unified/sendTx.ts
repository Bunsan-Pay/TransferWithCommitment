import type { Hex, PublicClient, WalletClient } from "viem";
import { transferWithCommitmentAbi } from "../../abi";
import { transferWithCommitmentAddress } from "../../config";
import { transferDetail } from "../../types/transferDetail";
import { assertSignatureTransferContext } from "../shared/context";
import type { SignedUnifiedTransfer } from "./types";

export const sendTx = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  signedData: SignedUnifiedTransfer,
) => {
  await assertSignatureTransferContext(publicClient, wallet, signedData);
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
