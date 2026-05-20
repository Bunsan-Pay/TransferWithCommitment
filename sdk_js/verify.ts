import { type } from "arktype";
import { parseEventLogs, type Hex, type PublicClient } from "viem";
import { transferWithCommitmentAbi } from "./abi";
import { transferWithCommitmentAddress } from "./config";
import { address, bytes32, uint256 } from "./types/utils";
import { assertTransferContractDeployed } from "./utils";

/** `verify` 第 3 引数スキーマ（単一転送イベント形） */
export const verifyArgsSchema = type({
  from: address,
  token: address,
  to: address,
  value: uint256,
  commitment: bytes32,
});

export type VerifyArgs = typeof verifyArgsSchema.infer;

export const getTransferWithCommitmentSentEventLogs = async (
  publicClient: PublicClient,
  hash: Hex,
) => {
  await assertTransferContractDeployed(publicClient);
  const receipt = await publicClient.getTransactionReceipt({ hash });
  const logs = parseEventLogs({
    abi: transferWithCommitmentAbi,
    eventName: "TransferWithCommitmentSent",
    logs: receipt.logs,
  });
  return logs.filter(
    (log) =>
      log.address.toLowerCase() === transferWithCommitmentAddress.toLowerCase(),
  );
};

export const verify = async (
  publicClient: PublicClient,
  hash: Hex,
  args: VerifyArgs,
): Promise<void> => {
  verifyArgsSchema.assert(args);
  await assertTransferContractDeployed(publicClient);
  const receipt = await publicClient.getTransactionReceipt({ hash });
  const logs = parseEventLogs({
    abi: transferWithCommitmentAbi,
    eventName: "TransferWithCommitmentSent",
    args: {
      from: args.from,
      token: args.token,
      to: args.to,
      value: args.value,
      commitment: args.commitment,
    },
    logs: receipt.logs,
  });
  const fromOurContract = logs.filter(
    (log) =>
      log.address.toLowerCase() === transferWithCommitmentAddress.toLowerCase(),
  );
  if (fromOurContract.length === 0) {
    throw new Error("TransferWithCommitmentSent event not found");
  }
};
