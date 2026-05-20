import { type } from "arktype";
import { bytes32 } from "../../types/utils";
import { transferDetail } from "../../types/transferDetail";

const unifiedTransfer = type({
  details: transferDetail.array(),
  commitment: bytes32,
});

export const argsSchema = unifiedTransfer;
export type SelfTransferUnifiedArgs = typeof unifiedTransfer.infer;
