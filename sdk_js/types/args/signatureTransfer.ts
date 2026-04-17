import { type } from "arktype";
import { address, bytes32, uint256, UINT256_MAX } from "../utils";
import { transferDetail, committedTransferDetail } from "../transferDetail";
const singleTransfer = type({
  from: address,
  to: address,
  token: address,
  executor: address,
  value: uint256,
  validAfter: uint256.default(0n),
  validBefore: uint256.default(UINT256_MAX),
  commitment: bytes32,
}).narrow((v) => v.validAfter <= v.validBefore);
const uniCommitTransfers = type({
  from: address,
  executor: address,
  details: transferDetail.array(),
  validAfter: uint256.default(0n),
  validBefore: uint256.default(UINT256_MAX),
  commitment: bytes32,
}).narrow((v) => v.details.length > 0 && v.validAfter <= v.validBefore);
const batchTransferWithCommit = type({
  from: address,
  executor: address,
  details: committedTransferDetail.array(),
  validAfter: uint256.default(0n),
  validBefore: uint256.default(UINT256_MAX),
}).narrow((v) => v.details.length > 0 && v.validAfter <= v.validBefore);
const cancelAuthorization = type({
  authorizer: address,
  commitment: bytes32,
});
export const arktype = {
  singleTransfer,
  uniCommitTransfers,
  batchTransferWithCommit,
  cancelAuthorization,
};
/** 入力側の型（`.default()` 付きフィールドは省略可能）。`infer` は適用後の必須型になるため使わない */
export type SingleTransferArgs = typeof singleTransfer.inferIn;
export type UniCommitTransfersArgs = typeof uniCommitTransfers.inferIn;
export type BatchTransferWithCommitArgs = typeof batchTransferWithCommit.inferIn;
export type CancelAuthorizationArgs = typeof cancelAuthorization.inferIn;
