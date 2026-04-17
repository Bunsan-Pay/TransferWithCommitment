import { type } from "arktype";
import { parseEventLogs, type Hex, type PublicClient } from "viem";
import {
  assertTransferContractConfigured,
  transferWithCommitmentAddress,
} from "./config";
import { address, bytes32, uint256 } from "./types/utils";
import { transferWithCommitmentAbi } from "./types/abi";
import { isSupportedChain } from "./utils";

const verifyArgs = type({
  from: address,
  token: address,
  to: address,
  value: uint256,
  commitment: bytes32,
});

type VerifyArgs = typeof verifyArgs.infer;

export const getTransferWithCommitmentSentEventLogs = async (
  publicClient: PublicClient,
  hash: Hex,
) => {
  assertTransferContractConfigured();
  if (!isSupportedChain(publicClient)) {
    throw new Error("Unsupported chain: " + publicClient.chain?.name);
  }
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
  verifyArgs.assert(args);
  assertTransferContractConfigured();
  if (!isSupportedChain(publicClient)) {
    throw new Error("Unsupported chain: " + publicClient.chain?.name);
  }
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
