import { type } from "arktype";
import {
  address,
  bytes32,
  bytes,
  uint256,
  UINT256_MAX,
} from "../../types/utils";
import { signedDomainSchema } from "../shared/signedDomain";
import { committedTransferDetail } from "../../types/transferDetail";

// BatchTransferWithCommit — 署名前入力
export const argsSchema = type({
  from: address,
  executor: address,
  details: committedTransferDetail.array(),
  validAfter: uint256.default(0n),
  validBefore: uint256.default(UINT256_MAX),
  batchCommitment: bytes32,
}).narrow((v) => v.details.length > 0 && v.validAfter <= v.validBefore);

const signedBatchSchema = type({
  domain: signedDomainSchema,
  from: address,
  details: committedTransferDetail.array(),
  validAfter: uint256,
  validBefore: uint256,
  batchCommitment: bytes32,
  signature: bytes,
}).narrow(
  (v) => v.validAfter <= v.validBefore && v.details.length > 0,
);

export const signedDataSchema = signedBatchSchema;

export type SignatureTransferBatchArgs = typeof argsSchema.inferIn;
export type SignedBatchTransfer = typeof signedBatchSchema.infer;
