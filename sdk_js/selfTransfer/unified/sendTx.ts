import type { Hex, PublicClient, WalletClient } from "viem";
import { transferWithCommitmentAddress } from "../../config";
import { transferWithCommitmentAbi } from "../../abi";
import {
  assertPublicWalletSameChain,
  assertTransferContractDeployed,
} from "../../utils";
import { argsSchema, type SelfTransferUnifiedArgs } from "./types";

export const sendTx = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: SelfTransferUnifiedArgs,
) => {
  assertPublicWalletSameChain(publicClient, wallet);
  await assertTransferContractDeployed(publicClient);
  argsSchema.assert(args);
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
