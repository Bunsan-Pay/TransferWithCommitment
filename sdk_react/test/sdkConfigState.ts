import { TEST_VERIFIER_CONTRACT } from "./fixtures.ts";
import {
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  TRANSFER_WITH_COMMITMENT_CREATE2_SALT,
} from "../../sdk_js/twcConstants.ts";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** preload の `eth-twc-sdk-js/config` モックと共有。テストで上書き可能。 */
export const sdkConfigState = {
  transferWithCommitmentAddress: TEST_VERIFIER_CONTRACT as `0x${string}`,
};

export function resetSdkConfigAddress(): void {
  sdkConfigState.transferWithCommitmentAddress =
    TEST_VERIFIER_CONTRACT as `0x${string}`;
}

export function setSdkConfigAddressZero(): void {
  sdkConfigState.transferWithCommitmentAddress = ZERO;
}

export function buildMockSdkConfigModule() {
  return {
    EIP712_DOMAIN_NAME,
    EIP712_DOMAIN_VERSION,
    TRANSFER_WITH_COMMITMENT_CREATE2_SALT,
    get transferWithCommitmentAddress() {
      return sdkConfigState.transferWithCommitmentAddress;
    },
  };
}
