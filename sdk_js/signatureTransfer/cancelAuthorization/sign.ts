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
import type { CancelAuthorizationArgs, SignedCancelAuthorization } from "./types";
import { argsSchema } from "./types";

export const sign = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: CancelAuthorizationArgs,
): Promise<SignedCancelAuthorization> => {
  assertPublicWalletSameChain(publicClient, wallet);
  const a = argsSchema.assert(args);
  assertSignerMatchesEip712Role(account, a.authorizer, "authorizer");
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
    primaryType: "CancelAuthorization",
    message: {
      authorizer: a.authorizer,
      commitment: a.commitment,
    },
  });
  return {
    domain,
    authorizer: a.authorizer,
    commitment: a.commitment,
    signature,
  };
};
