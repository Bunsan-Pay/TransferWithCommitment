import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { supportedChains } from "./config";

export const isSupportedChain = (client: PublicClient | WalletClient) => {
  return supportedChains.some((chain) => chain.id === client.chain?.id);
};

export const chainIdToBig = (id: number | bigint): bigint =>
  typeof id === "bigint" ? id : BigInt(id);

/** `supportedChains` に含まれること、および両クライアントの `chain.id` が同一であること */
export const assertPublicWalletSameSupportedChain = (
  publicClient: PublicClient,
  wallet: WalletClient,
): void => {
  if (!isSupportedChain(publicClient) || !isSupportedChain(wallet)) {
    throw new Error("Unsupported chain: " + publicClient.chain?.name);
  }
  const publicId = publicClient.chain?.id;
  const walletId = wallet.chain?.id;
  if (publicId === undefined || walletId === undefined) {
    throw new Error("Unsupported chain: " + publicClient.chain?.name);
  }
  if (publicId !== walletId) {
    throw new Error(
      `PublicClient and WalletClient chain mismatch: ${publicId} vs ${walletId}`,
    );
  }
};

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

/** 署名バンドルの `domain` がクライアントのチェーンおよび `config` のコントラクトアドレスと一致すること */
export const assertSignedDomainMatchesClientAndConfig = (
  publicClient: PublicClient,
  domain: { chainId: number | bigint; verifyingContract: Address },
  configuredContract: Address,
): void => {
  const publicId = publicClient.chain?.id;
  if (publicId === undefined) {
    throw new Error("Unsupported chain: " + publicClient.chain?.name);
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
