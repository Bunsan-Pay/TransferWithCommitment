import { describe, expect, mock, test } from "bun:test";
import { mainnet, polygon } from "viem/chains";
import type { Hex, PublicClient, WalletClient } from "viem";
import {
  ADDR,
  ADDR_B,
  COMMIT,
  testDomain,
  TEST_VERIFIER_CONTRACT,
} from "./fixtures";
import { UINT256_MAX } from "../../types/utils";

const signatureTransfer = await import(
  "../../sendTransaction/signatureTransfer"
);

describe("sendTransaction/signatureTransfer.ts（config モック済み）", () => {
  const baseSigned = {
    domain: testDomain(),
    from: ADDR,
    to: ADDR_B,
    token: ADDR,
    value: 100n,
    validAfter: 0n,
    validBefore: UINT256_MAX,
    commitment: COMMIT,
    signature: ("0x" + "cc".repeat(65)) as Hex,
  };

  test("domain.chainId がクライアントと違えば例外", async () => {
    const signedData = {
      ...baseSigned,
      domain: testDomain(TEST_VERIFIER_CONTRACT, polygon.id),
    };
    const publicClient = { chain: mainnet } as unknown as PublicClient;
    const wallet = { chain: mainnet } as unknown as WalletClient;

    await expect(
      signatureTransfer.singleTransfer(
        publicClient,
        wallet,
        ADDR as Hex,
        signedData,
      ),
    ).rejects.toThrow(/domain\.chainId/);
  });

  test("domain.verifyingContract が config と違えば例外", async () => {
    const signedData = {
      ...baseSigned,
      domain: testDomain(
        "0x5555555555555555555555555555555555555555" as `0x${string}`,
        mainnet.id,
      ),
    };
    const publicClient = { chain: mainnet } as unknown as PublicClient;
    const wallet = { chain: mainnet } as unknown as WalletClient;

    await expect(
      signatureTransfer.singleTransfer(
        publicClient,
        wallet,
        ADDR as Hex,
        signedData,
      ),
    ).rejects.toThrow(/verifyingContract/);
  });

  test("singleTransfer は simulate → write", async () => {
    const sim = mock(() =>
      Promise.resolve({
        request: {} as unknown as Parameters<WalletClient["writeContract"]>[0],
      }),
    );
    const write = mock(() => Promise.resolve("0xabc1" as Hex));

    const publicClient = {
      chain: mainnet,
      simulateContract: sim,
    } as unknown as PublicClient;
    const wallet = {
      chain: mainnet,
      writeContract: write,
    } as unknown as WalletClient;

    const hash = await signatureTransfer.singleTransfer(
      publicClient,
      wallet,
      ADDR as Hex,
      baseSigned,
    );

    expect(hash).toBe("0xabc1");
    expect(sim).toHaveBeenCalled();
    expect(write).toHaveBeenCalled();
  });
});
