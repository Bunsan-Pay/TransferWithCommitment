import { describe, expect, mock, test } from "bun:test";
import { mainnet } from "viem/chains";
import type { Hex, PublicClient, WalletClient } from "viem";
import { ADDR, ADDR_B, COMMIT } from "./fixtures";

const selfTransfer = await import("../../sendTransaction/selfTransfer");

describe("sendTransaction/selfTransfer.ts（config モック済み）", () => {
  test("transfer は simulate → write の順で呼ぶ", async () => {
    const sim = mock(() =>
      Promise.resolve({ request: { foo: 1 } as unknown as Parameters<WalletClient["writeContract"]>[0] }),
    );
    const write = mock(() => Promise.resolve("0xdead" as Hex));

    const publicClient = {
      chain: mainnet,
      simulateContract: sim,
    } as unknown as PublicClient;
    const wallet = {
      chain: mainnet,
      writeContract: write,
    } as unknown as WalletClient;

    const hash = await selfTransfer.transfer(publicClient, wallet, ADDR as Hex, {
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
