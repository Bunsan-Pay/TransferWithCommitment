import { type } from "arktype";
import {
  address,
  bytes32,
  bytes,
  uint256,
  UINT256_MAX,
} from "../../types/utils";
import { signedDomainSchema } from "../shared/signedDomain";
import { transferDetail } from "../../types/transferDetail";

// UniCommitTransfers — 署名前入力
export const argsSchema = type({
  from: address,
  executor: address,
  details: transferDetail.array(),
  validAfter: uint256.default(0n),
  validBefore: uint256.default(UINT256_MAX),
  commitment: bytes32,
}).narrow((v) => v.details.length > 0 && v.validAfter <= v.validBefore);

// UniCommitTransfers — 署名済みバンドル
const signedUnifiedSchema = type({
  domain: signedDomainSchema,
  from: address,
  details: transferDetail.array(),
  validAfter: uint256,
  validBefore: uint256,
  commitment: bytes32,
  signature: bytes,
}).narrow(
  (v) => v.validAfter <= v.validBefore && v.details.length > 0,
);

export const signedDataSchema = signedUnifiedSchema;

export type SignatureTransferUnifiedArgs = typeof argsSchema.inferIn;
export type SignedUnifiedTransfer = typeof signedUnifiedSchema.infer;
