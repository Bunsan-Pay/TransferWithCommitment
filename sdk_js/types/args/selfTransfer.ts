import { type } from "arktype";
import { address, bytes32, uint256 } from "../utils";
import { transferDetail, committedTransferDetail } from "../transferDetail";

const singleTransfer = type({
  token: address,
  to: address,
  value: uint256,
  commitment: bytes32,
});
const uniCommitTransfers = type({
  details: transferDetail.array(),
  commitment: bytes32,
});
const batchTransferWithCommit = type({
  details: committedTransferDetail.array(),
});

export const arktype = {
  singleTransfer,
  uniCommitTransfers,
  batchTransferWithCommit,
};

export type SingleTransferArgs = typeof singleTransfer.infer;
export type UniCommitTransfersArgs = typeof uniCommitTransfers.infer;
export type BatchTransferWithCommitArgs = typeof batchTransferWithCommit.infer;
