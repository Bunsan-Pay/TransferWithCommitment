/**
 * 結合テスト用: `TWC_ADDRESS` を注入した config を先に登録する。
 * `bun test --preload ./test/integration/preload.ts ...` でのみ使用。
 */
import { mock } from "bun:test";
import {
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  TRANSFER_WITH_COMMITMENT_CREATE2_SALT,
} from "../../twcConstants.ts";

const addr = process.env.TWC_ADDRESS;
if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) {
  throw new Error(
    "integration preload: set TWC_ADDRESS to deployed TransferWithCommitment (run scripts/test-sdk-js-integration.sh)",
  );
}

mock.module(new URL("../../config.ts", import.meta.url).pathname, () => {
  const transferWithCommitmentAddress = addr as `0x${string}`;
  return {
    EIP712_DOMAIN_NAME,
    EIP712_DOMAIN_VERSION,
    TRANSFER_WITH_COMMITMENT_CREATE2_SALT,
    transferWithCommitmentAddress,
  };
});
