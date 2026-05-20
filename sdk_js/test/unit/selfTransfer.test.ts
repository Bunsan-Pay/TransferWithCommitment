import { describe, expect, mock, test } from "bun:test";
import { mainnet } from "viem/chains";
import type { Hex, PublicClient, WalletClient } from "viem";
import { ADDR, ADDR_B, COMMIT } from "./fixtures";

import { sendTx } from "../../selfTransfer/single/sendTx";

describe("selfTransfer/single/sendTx.ts（config モック済み）", () => {
  test("sendTx は simulate → write の順で呼ぶ", async () => {
    const sim = mock(() =>
      Promise.resolve({ request: { foo: 1 } as unknown as Parameters<WalletClient["writeContract"]>[0] }),
    );
    const write = mock(() => Promise.resolve("0xdead" as Hex));

    const publicClient = {
      chain: mainnet,
      getCode: async () => "0x6000",
      simulateContract: sim,
    } as unknown as PublicClient;
    const wallet = {
      chain: mainnet,
      writeContract: write,
    } as unknown as WalletClient;

    const hash = await sendTx(publicClient, wallet, ADDR as Hex, {
      token: ADDR,
      to: ADDR_B,
      value: 50n,
      commitment: COMMIT,
    });

    expect(hash).toBe("0xdead");
    expect(sim).toHaveBeenCalled();
    expect(write).toHaveBeenCalled();
  });
});
