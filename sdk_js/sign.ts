import type {
  GetEip712DomainReturnType,
  Hex,
  PublicClient,
  WalletClient,
} from "viem";
import * as eip712Types from "./types/Eip712Type";
import {
  assertTransferContractConfigured,
  transferWithCommitmentAddress,
} from "./config";
import type {
  BatchTransferWithCommitArgs,
  CancelAuthorizationArgs,
  SingleTransferArgs,
  UniCommitTransfersArgs,
} from "./types/args/signatureTransfer";
import { arktype } from "./types/args/signatureTransfer";
import type {
  SignedBatchTransferWithCommit,
  SignedCancelAuthorization,
  SignedTransferWithCommit,
  SignedUniCommitTransfers,
} from "./types/signedData";
import {
  assertPublicWalletSameSupportedChain,
  assertSignerMatchesEip712Role,
} from "./utils";

const ZERO_SALT =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

/**
 * OpenZeppelin EIP712 の `_buildDomainSeparator` は name/version/chainId/verifyingContract のみ。
 * viem の `getEip712Domain` は `salt: bytes32(0)` を返し、`hashTypedData` が salt 付き domain 型になると
 * オンチェーンの domain separator と一致しなくなるため、ゼロ salt は署名前に除く。
 */
function domainForTypedDataSign(
  raw: GetEip712DomainReturnType["domain"],
): GetEip712DomainReturnType["domain"] {
  if (
    raw.salt !== undefined &&
    typeof raw.salt === "string" &&
    raw.salt.toLowerCase() === ZERO_SALT
  ) {
    const { salt: _s, ...rest } = raw;
    return rest as GetEip712DomainReturnType["domain"];
  }
  return raw;
}

export const singleTransfer = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: SingleTransferArgs,
): Promise<SignedTransferWithCommit> => {
  assertTransferContractConfigured();
  assertPublicWalletSameSupportedChain(publicClient, wallet);
  const a = arktype.singleTransfer.assert(args);
  assertSignerMatchesEip712Role(account, a.from, "from");
  const { domain: rawDomain } = await publicClient.getEip712Domain({
    address: transferWithCommitmentAddress,
  });
  const domain = domainForTypedDataSign(rawDomain);
  const signature = await wallet.signTypedData({
    account,
    domain,
    types: eip712Types.singleTypes,
    primaryType: "TransferWithCommit",
    message: {
      from: a.from,
      to: a.to,
      token: a.token,
      executor: a.executor,
      value: a.value,
      validAfter: a.validAfter,
      validBefore: a.validBefore,
      commitment: a.commitment,
    },
  });
  return {
    domain,
    from: a.from,
    to: a.to,
    token: a.token,
    value: a.value,
    commitment: a.commitment,
    validAfter: a.validAfter,
    validBefore: a.validBefore,
    signature,
  };
};

export const uniCommitTransfers = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: UniCommitTransfersArgs,
): Promise<SignedUniCommitTransfers> => {
  assertTransferContractConfigured();
  assertPublicWalletSameSupportedChain(publicClient, wallet);
  const a = arktype.uniCommitTransfers.assert(args);
  assertSignerMatchesEip712Role(account, a.from, "from");
  const { domain: rawDomain } = await publicClient.getEip712Domain({
    address: transferWithCommitmentAddress,
  });
  const domain = domainForTypedDataSign(rawDomain);
  const signature = await wallet.signTypedData({
    account,
    domain,
    types: eip712Types.uniCommitTransfers,
    primaryType: "UniCommitTransfers",
    message: {
      from: a.from,
      executor: a.executor,
      details: a.details,
      validAfter: a.validAfter,
      validBefore: a.validBefore,
      commitment: a.commitment,
    },
  });
  return {
    domain,
    from: a.from,
    details: a.details,
    commitment: a.commitment,
    validAfter: a.validAfter,
    validBefore: a.validBefore,
    signature,
  };
};

export const batchTransferWithCommit = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: BatchTransferWithCommitArgs,
): Promise<SignedBatchTransferWithCommit> => {
  assertTransferContractConfigured();
  assertPublicWalletSameSupportedChain(publicClient, wallet);
  const a = arktype.batchTransferWithCommit.assert(args);
  assertSignerMatchesEip712Role(account, a.from, "from");
  const { domain: rawDomain } = await publicClient.getEip712Domain({
    address: transferWithCommitmentAddress,
  });
  const domain = domainForTypedDataSign(rawDomain);
  const signature = await wallet.signTypedData({
    account,
    domain,
    types: eip712Types.batchTransferWithCommit,
    primaryType: "BatchTransferWithCommit",
    message: {
      from: a.from,
      executor: a.executor,
      details: a.details,
      validAfter: a.validAfter,
      validBefore: a.validBefore,
    },
  });
  return {
    domain,
    from: a.from,
    details: a.details,
    validAfter: a.validAfter,
    validBefore: a.validBefore,
    signature,
  };
};

export const cancelAuthorization = async (
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Hex,
  args: CancelAuthorizationArgs,
): Promise<SignedCancelAuthorization> => {
  assertTransferContractConfigured();
  assertPublicWalletSameSupportedChain(publicClient, wallet);
  const a = arktype.cancelAuthorization.assert(args);
  assertSignerMatchesEip712Role(account, a.authorizer, "authorizer");
  const { domain: rawDomain } = await publicClient.getEip712Domain({
    address: transferWithCommitmentAddress,
  });
  const domain = domainForTypedDataSign(rawDomain);
  const signature = await wallet.signTypedData({
    account,
    domain,
    types: eip712Types.cancelAuthorization,
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
