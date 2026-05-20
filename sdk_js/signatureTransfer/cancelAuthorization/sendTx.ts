import type { Hex, PublicClient, WalletClient } from "viem";
import { transferWithCommitmentAbi } from "../../abi";
import { transferWithCommitmentAddress } from "../../config";
import { assertSignatureTransferContext } from "../shared/context";
import type { SignedCancelAuthorization } from "./types";

export const sendTx = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  signedData: SignedCancelAuthorization,
) => {
  await assertSignatureTransferContext(publicClient, wallet, signedData);
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
