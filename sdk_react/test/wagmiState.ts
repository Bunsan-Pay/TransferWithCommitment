import type { Hex, PublicClient, WalletClient } from "viem";

/** preload の `wagmi` モックが参照する接続状態。 */
export const wagmiState: {
  publicClient: PublicClient | undefined;
  walletClient: WalletClient | undefined;
  address: Hex | undefined;
} = {
  publicClient: undefined,
  walletClient: undefined,
  address: undefined,
};

export function resetWagmiState(): void {
  wagmiState.publicClient = undefined;
  wagmiState.walletClient = undefined;
  wagmiState.address = undefined;
}
