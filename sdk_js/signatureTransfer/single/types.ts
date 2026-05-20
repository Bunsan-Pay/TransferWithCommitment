import { type } from "arktype";
import {
  address,
  bytes32,
  bytes,
  uint256,
  UINT256_MAX,
} from "../../types/utils";
import { signedDomainSchema } from "../shared/signedDomain";

// TransferWithCommit — 署名前入力（EIP-712 Sign）
export const argsSchema = type({
  from: address,
  to: address,
  token: address,
  executor: address,
  value: uint256,
  validAfter: uint256.default(0n),
  validBefore: uint256.default(UINT256_MAX),
  commitment: bytes32,
}).narrow((v) => v.validAfter <= v.validBefore);

// TransferWithCommit — 署名済みバンドル
const signedSingleSchema = type({
  domain: signedDomainSchema,
  from: address,
  to: address,
  token: address,
  value: uint256,
  validAfter: uint256,
  validBefore: uint256,
  commitment: bytes32,
  signature: bytes,
}).narrow((v) => v.validAfter <= v.validBefore);

export const signedDataSchema = signedSingleSchema;

export type SignatureTransferSingleArgs = typeof argsSchema.inferIn;
export type SignedSingleTransfer = typeof signedSingleSchema.infer;
