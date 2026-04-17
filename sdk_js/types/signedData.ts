import { type } from "arktype";
import type { GetEip712DomainReturnType } from "viem";
import { address, bytes32, bytes, uint256, UINT256_MAX } from "./utils";
import { transferDetail, committedTransferDetail } from "./transferDetail";

/** `publicClient.getEip712Domain` が返す `domain` と同一の形（オフチェーン転送用バンドルに含める） */
export type Eip712SignedDomain = GetEip712DomainReturnType["domain"];

const chainIdAsDomain = type("number").or(uint256);

// viem の getEip712Domain は chainId を Number、salt を bytes32 で返す（型上は bigint も許容）。
// `sign.ts` はゼロ salt を domain から除くため、バンドルに `salt` が無い場合がある。
const eip712SignedDomain = type({
  name: type("string"),
  version: type("string"),
  chainId: chainIdAsDomain,
  verifyingContract: address,
  salt: bytes32.optional(),
});

// TransferWithCommit(address from,address to,address token,address executor,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 commitment)
const transferWithCommit = type({
  domain: eip712SignedDomain,
  from: address,
  to: address,
  token: address,
  value: uint256,
  validAfter: uint256,
  validBefore: uint256,
  commitment: bytes32,
  signature: bytes,
}).filter(
  (v) =>
    v.validAfter <= v.validBefore &&
    v.validAfter >= 0n &&
    v.validBefore <= UINT256_MAX &&
    v.validBefore >= 0n,
);

// UniCommitTransfers(address from,address executor,TransferDetail[] details,uint256 validAfter,uint256 validBefore,bytes32 commitment)
const uniCommitTransfers = type({
  domain: eip712SignedDomain,
  from: address,
  details: transferDetail.array(),
  validAfter: uint256,
  validBefore: uint256,
  commitment: bytes32,
  signature: bytes,
}).filter(
  (v) =>
    v.validAfter <= v.validBefore &&
    v.validAfter >= 0n &&
    v.validBefore <= UINT256_MAX &&
    v.validBefore >= 0n &&
    v.details.length > 0,
);

// BatchTransferWithCommit(address from,address executor,CommittedTransferDetail[] details,uint256 validAfter,uint256 validBefore)
const batchTransferWithCommit = type({
  domain: eip712SignedDomain,
  from: address,
  details: committedTransferDetail.array(),
  validAfter: uint256,
  validBefore: uint256,
  signature: bytes,
}).filter(
  (v) =>
    v.validAfter <= v.validBefore &&
    v.validAfter >= 0n &&
    v.validBefore <= UINT256_MAX &&
    v.validBefore >= 0n &&
    v.details.length > 0,
);

// CancelAuthorization(address authorizer,bytes32 commitment)
const cancelAuthorization = type({
  domain: eip712SignedDomain,
  authorizer: address,
  commitment: bytes32,
  signature: bytes,
});

export const arktype = {
  transferWithCommit,
  uniCommitTransfers,
  batchTransferWithCommit,
  cancelAuthorization,
};

export type SignedTransferWithCommit = Omit<
  typeof transferWithCommit.infer,
  "domain"
> & { domain: Eip712SignedDomain };
export type SignedUniCommitTransfers = Omit<
  typeof uniCommitTransfers.infer,
  "domain"
> & { domain: Eip712SignedDomain };
export type SignedBatchTransferWithCommit = Omit<
  typeof batchTransferWithCommit.infer,
  "domain"
> & { domain: Eip712SignedDomain };
export type SignedCancelAuthorization = Omit<
  typeof cancelAuthorization.infer,
  "domain"
> & { domain: Eip712SignedDomain };
