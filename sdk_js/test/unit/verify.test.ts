import { describe, expect, test } from "bun:test";
import { mainnet } from "viem/chains";
import type { Hex, PublicClient } from "viem";
import {
  getTransferWithCommitmentSentEventLogs,
  verify,
} from "../../verify.ts";
import { ADDR, COMMIT } from "./fixtures.ts";

const validVerifyArgs = {
  from: ADDR,
  token: ADDR,
  to: ADDR,
  value: 1n,
  commitment: COMMIT,
};

describe("verify.ts（本番 config・ゼロアドレス）", () => {
  test("getTransferWithCommitmentSentEventLogs は先頭で assert に失敗", async () => {
    const client = { chain: mainnet } as unknown as PublicClient;
    await expect(
      getTransferWithCommitmentSentEventLogs(
        client,
        "0x" + "ab".repeat(32) as Hex,
      ),
    ).rejects.toThrow(/not configured \(zero address\)/);
  });

  test("verify は arktype 失敗時は先にスキーマ例外（assert より前）", async () => {
    const client = { chain: mainnet } as unknown as PublicClient;
    await expect(
      verify(client, "0x" + "ab".repeat(32) as Hex, {
        ...validVerifyArgs,
        from: "0xbad" as `0x${string}`,
      }),
    ).rejects.toThrow();
  });

  test("verify は有効な args でも assert で失敗", async () => {
    const client = { chain: mainnet } as unknown as PublicClient;
    await expect(
      verify(client, "0x" + "ab".repeat(32) as Hex, validVerifyArgs),
    ).rejects.toThrow(/not configured \(zero address\)/);
  });
});
