import { describe, expect, mock, test } from "bun:test";
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

function rpcClient(overrides: Partial<PublicClient> = {}): PublicClient {
  return {
    chain: mainnet,
    getCode: mock(() => Promise.resolve("0x6000")),
    getTransactionReceipt: mock(() =>
      Promise.resolve({ logs: [] } as never),
    ),
    ...overrides,
  } as unknown as PublicClient;
}

describe("verify.ts（本番 config）", () => {
  test("getTransferWithCommitmentSentEventLogs は TWC 未デプロイなら失敗", async () => {
    const client = rpcClient({
      getCode: mock(() => Promise.resolve("0x")),
    });
    await expect(
      getTransferWithCommitmentSentEventLogs(
        client,
        "0x" + "ab".repeat(32) as Hex,
      ),
    ).rejects.toThrow(/not deployed at/);
  });

  test("getTransferWithCommitmentSentEventLogs はデプロイ済みならレシート取得まで進む", async () => {
    const client = rpcClient();
    const logs = await getTransferWithCommitmentSentEventLogs(
      client,
      "0x" + "ab".repeat(32) as Hex,
    );
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(0);
  });

  test("verify は arktype 失敗時は先にスキーマ例外", async () => {
    const client = rpcClient();
    await expect(
      verify(client, "0x" + "ab".repeat(32) as Hex, {
        ...validVerifyArgs,
        from: "0xbad" as `0x${string}`,
      }),
    ).rejects.toThrow();
  });

  test("verify は TWC 未デプロイなら失敗", async () => {
    const client = rpcClient({
      getCode: mock(() => Promise.resolve("0x")),
    });
    await expect(
      verify(client, "0x" + "ab".repeat(32) as Hex, validVerifyArgs),
    ).rejects.toThrow(/not deployed at/);
  });

  test("verify はデプロイ済みで該当ログがなければ EventNotFound", async () => {
    const client = rpcClient();
    await expect(
      verify(client, "0x" + "ab".repeat(32) as Hex, validVerifyArgs),
    ).rejects.toThrow(/TransferWithCommitmentSent event not found/);
  });
});
