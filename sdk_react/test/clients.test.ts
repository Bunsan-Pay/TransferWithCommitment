import { describe, expect, test } from "bun:test";
import { mainnet } from "viem/chains";
import type { Hex, PublicClient, WalletClient } from "viem";

import { narrowWriteClients } from "../hooks/clients.ts";

describe("narrowWriteClients", () => {
  const pc = { chain: mainnet } as unknown as PublicClient;
  const wc = { chain: mainnet } as unknown as WalletClient;
  const addr = "0x1111111111111111111111111111111111111111" as Hex;

  test("public client が無いときは TWC: public client", () => {
    expect(() =>
      narrowWriteClients(undefined, wc, addr),
    ).toThrow(/TWC: public client is not available/);
  });

  test("wallet client が無いときは TWC: wallet client", () => {
    expect(() => narrowWriteClients(pc, undefined, addr)).toThrow(
      /TWC: wallet client is not available/,
    );
  });

  test("address が無いときは connect a wallet", () => {
    expect(() => narrowWriteClients(pc, wc, undefined)).toThrow(
      /TWC: connect a wallet to send or sign/,
    );
  });

  test("揃っているときはタプルを返す", () => {
    expect(narrowWriteClients(pc, wc, addr)).toEqual([pc, wc, addr]);
  });
});
