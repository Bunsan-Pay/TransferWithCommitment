import type { PublicClient, WalletClient } from "viem";
import { transferWithCommitmentAddress } from "../../config";
import {
  assertPublicWalletSameChain,
  assertSignedDomainMatchesClientAndConfig,
  assertTransferContractDeployed,
} from "../../utils";

export async function assertSignatureTransferContext(
  publicClient: PublicClient,
  wallet: WalletClient,
  signedData: {
    domain: {
      chainId: number | bigint;
      verifyingContract: `0x${string}`;
    };
  },
): Promise<void> {
  assertPublicWalletSameChain(publicClient, wallet);
  await assertTransferContractDeployed(publicClient, transferWithCommitmentAddress);
  assertSignedDomainMatchesClientAndConfig(
    publicClient,
    signedData.domain,
    transferWithCommitmentAddress,
  );
}
