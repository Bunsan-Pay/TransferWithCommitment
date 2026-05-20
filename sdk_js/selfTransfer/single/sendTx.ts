import type { Hex, PublicClient, WalletClient } from "viem";
import { transferWithCommitmentAddress } from "../../config";
import { transferWithCommitmentAbi } from "../../abi";
import {
  assertPublicWalletSameChain,
  assertTransferContractDeployed,
} from "../../utils";
import { argsSchema, type SelfTransferSingleArgs } from "./types";

export const sendTx = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: SelfTransferSingleArgs,
) => {
  assertPublicWalletSameChain(publicClient, wallet);
  await assertTransferContractDeployed(publicClient);
  argsSchema.assert(args);
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
