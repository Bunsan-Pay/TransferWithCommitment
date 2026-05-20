import { type } from "arktype";
import { committedTransferDetail } from "../../types/transferDetail";

const batchTransferWithCommit = type({
  details: committedTransferDetail.array(),
});

export const argsSchema = batchTransferWithCommit;
export type SelfTransferBatchArgs = typeof batchTransferWithCommit.infer;
