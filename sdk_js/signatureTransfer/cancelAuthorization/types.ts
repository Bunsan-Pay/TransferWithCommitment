import { type } from "arktype";
import { address, bytes32, bytes } from "../../types/utils";
import { signedDomainSchema } from "../shared/signedDomain";

export const argsSchema = type({
  authorizer: address,
  commitment: bytes32,
});

const signedCancelSchema = type({
  domain: signedDomainSchema,
  authorizer: address,
  commitment: bytes32,
  signature: bytes,
});

export const signedDataSchema = signedCancelSchema;

export type CancelAuthorizationArgs = typeof argsSchema.inferIn;
export type SignedCancelAuthorization = typeof signedCancelSchema.infer;
