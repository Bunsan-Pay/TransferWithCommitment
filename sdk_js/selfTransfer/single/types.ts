import { type } from "arktype";
import { address, bytes32, uint256 } from "../../types/utils";

const singleTransfer = type({
  token: address,
  to: address,
  value: uint256,
  commitment: bytes32,
});

export const argsSchema = singleTransfer;
export type SelfTransferSingleArgs = typeof singleTransfer.infer;
