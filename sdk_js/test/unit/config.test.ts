import { describe, expect, test } from "bun:test";
import {
  assertTransferContractConfigured,
  transferWithCommitmentAddress,
  ZERO_TRANSFER_ADDRESS,
} from "../../config.ts";

describe("config（本番モジュール）", () => {
  test("transferWithCommitmentAddress は現状ゼロアドレス", () => {
    expect(transferWithCommitmentAddress.toLowerCase()).toBe(
      ZERO_TRANSFER_ADDRESS,
    );
  });

  test("assertTransferContractConfigured はゼロアドレスで例外", () => {
    expect(() => assertTransferContractConfigured()).toThrow(
      /not configured \(zero address\)/,
    );
  });
});
