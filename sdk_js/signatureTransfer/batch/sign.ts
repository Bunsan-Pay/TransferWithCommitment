import type { Hex, PublicClient, WalletClient } from "viem";
import {
  transferWithCommitmentAddress,
} from "../../config";
import {
  assertEip712DomainFromContractMatchesExpected,
  assertPublicWalletSameChain,
  assertSignerMatchesEip712Role,
  assertTransferContractDeployed,
} from "../../utils";
import { domainForTypedDataSign } from "../shared/domain";
import { eip712Types } from "./eip712Types";
import type { SignatureTransferBatchArgs, SignedBatchTransfer } from "./types";
import { argsSchema } from "./types";

export const sign = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: SignatureTransferBatchArgs,
): Promise<SignedBatchTransfer> => {
  assertPublicWalletSameChain(publicClient, wallet);
  const a = argsSchema.assert(args);
  assertSignerMatchesEip712Role(account, a.from, "from");
  await assertTransferContractDeployed(publicClient);
  const rawEip712 = await publicClient.getEip712Domain({
    address: transferWithCommitmentAddress,
  });
  assertEip712DomainFromContractMatchesExpected(publicClient, rawEip712);
  const domain = domainForTypedDataSign(rawEip712.domain);
  const signature = await wallet.signTypedData({
    account,
    domain,
    types: eip712Types,
    primaryType: "BatchTransferWithCommit",
    message: {
      from: a.from,
      executor: a.executor,
      details: a.details,
      validAfter: a.validAfter,
      validBefore: a.validBefore,
      batchCommitment: a.batchCommitment,
    },
  });
  return {
    domain,
    from: a.from,
    details: a.details,
    validAfter: a.validAfter,
    validBefore: a.validBefore,
    batchCommitment: a.batchCommitment,
    signature,
  };
};
