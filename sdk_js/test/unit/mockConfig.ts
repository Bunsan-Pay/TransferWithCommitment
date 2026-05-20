import { TEST_VERIFIER_CONTRACT } from "./fixtures";
import {
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  TRANSFER_WITH_COMMITMENT_CREATE2_SALT,
} from "../../twcConstants.ts";

/** `mock.module` 向け。`transferWithCommitmentAddress` のみテスト用に差し替え */
export function mockConfigModule() {
  return {
    EIP712_DOMAIN_NAME,
    EIP712_DOMAIN_VERSION,
    TRANSFER_WITH_COMMITMENT_CREATE2_SALT,
    transferWithCommitmentAddress: TEST_VERIFIER_CONTRACT as `0x${string}`,
  };
}
