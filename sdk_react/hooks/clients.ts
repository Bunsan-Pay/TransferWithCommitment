import type { Hex, PublicClient, WalletClient } from "viem";

export function narrowWriteClients(
  publicClient: PublicClient | undefined,
  walletClient: WalletClient | undefined,
  address: Hex | undefined,
): [PublicClient, WalletClient, Hex] {
  if (!publicClient) throw new Error("TWC: public client is not available");
  if (!walletClient) throw new Error("TWC: wallet client is not available");
  if (!address) throw new Error("TWC: connect a wallet to send or sign");
  return [publicClient, walletClient, address];
}
