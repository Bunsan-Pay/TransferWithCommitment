import type { Address, Hex, PublicClient, WalletClient } from "viem";
import type { GetEip712DomainReturnType } from "viem";
import {
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  transferWithCommitmentAddress,
} from "./config";

export const chainIdToBig = (id: number | bigint): bigint =>
  typeof id === "bigint" ? id : BigInt(id);

/** Both clients must have `chain.id` set and it must match. */
export const assertPublicWalletSameChain = (
  publicClient: PublicClient,
  wallet: WalletClient,
): void => {
  const publicId = publicClient.chain?.id;
  const walletId = wallet.chain?.id;
  if (publicId === undefined || walletId === undefined) {
    throw new Error(
      "Chain is not set on public client and/or wallet client",
    );
  }
  if (publicId !== walletId) {
    throw new Error(
      `PublicClient and WalletClient chain mismatch: ${publicId} vs ${walletId}`,
    );
  }
};

/** @deprecated Use {@link assertPublicWalletSameChain}. */
export const assertPublicWalletSameSupportedChain = assertPublicWalletSameChain;

export async function assertTransferContractDeployed(
  publicClient: PublicClient,
  contractAddress: Address = transferWithCommitmentAddress,
): Promise<void> {
  const code = await publicClient.getCode({ address: contractAddress });
  if (code === undefined || code === "0x") {
    throw new Error(
      `TransferWithCommitment is not deployed at ${contractAddress} on this chain (no contract code). Deploy with CREATE2 (see contracts/TWC_CREATE2.md) or switch network.`,
    );
  }
}

export function assertEip712DomainFromContractMatchesExpected(
  publicClient: PublicClient,
  eip712: GetEip712DomainReturnType,
): void {
  const chainId = publicClient.chain?.id;
  if (chainId === undefined) {
    throw new Error("Chain is not set on public client");
  }
  const d = eip712.domain;
  if (d.name !== EIP712_DOMAIN_NAME) {
    throw new Error(
      `Unexpected EIP-712 domain name: expected "${EIP712_DOMAIN_NAME}", got "${String(d.name)}"`,
    );
  }
  if (d.version !== EIP712_DOMAIN_VERSION) {
    throw new Error(
      `Unexpected EIP-712 domain version: expected "${EIP712_DOMAIN_VERSION}", got "${String(d.version)}"`,
    );
  }
  const vc = d.verifyingContract;
  if (
    vc === undefined ||
    vc.toLowerCase() !== transferWithCommitmentAddress.toLowerCase()
  ) {
    throw new Error(
      `Unexpected EIP-712 verifyingContract: expected ${transferWithCommitmentAddress}, got ${String(vc)}`,
    );
  }
  if (
    d.chainId !== undefined &&
    chainIdToBig(d.chainId) !== BigInt(chainId)
  ) {
    throw new Error(
      `EIP-712 domain.chainId (${d.chainId}) does not match public client chain id (${chainId})`,
    );
  }
}

/**
 * `wallet.signTypedData` の `account` が EIP-712 メッセージの `from` または `authorizer` と一致すること。
 * チェックサムの大小文字は無視する。一致しなければオンチェーンの署名検証で失敗するため、署名前に弾く。
 */
export const assertSignerMatchesEip712Role = (
  signer: Hex,
  messageAddress: Hex,
  role: "from" | "authorizer",
): void => {
  if (signer.toLowerCase() !== messageAddress.toLowerCase()) {
    throw new Error(
      `Signer account (${signer}) does not match EIP-712 message ${role} (${messageAddress})`,
    );
  }
};

/** 署名バンドルの `domain` がクライアントのチェーンおよび期待 TWC アドレスと一致すること */
export const assertSignedDomainMatchesClientAndConfig = (
  publicClient: PublicClient,
  domain: { chainId: number | bigint; verifyingContract: Address },
  configuredContract: Address,
): void => {
  const publicId = publicClient.chain?.id;
  if (publicId === undefined) {
    throw new Error("Chain is not set on public client");
  }
  if (chainIdToBig(domain.chainId) !== BigInt(publicId)) {
    throw new Error(
      `Signed data domain.chainId (${domain.chainId}) does not match client chain id (${publicId})`,
    );
  }
  if (
    domain.verifyingContract.toLowerCase() !== configuredContract.toLowerCase()
  ) {
    throw new Error(
      `Signed data domain.verifyingContract (${domain.verifyingContract}) does not match transferWithCommitmentAddress (${configuredContract})`,
    );
  }
};
