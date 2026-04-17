import { describe, expect, test } from "bun:test";
import { mainnet, polygon } from "viem/chains";
import type { PublicClient, WalletClient } from "viem";
import {
  assertPublicWalletSameSupportedChain,
  assertSignedDomainMatchesClientAndConfig,
  assertSignerMatchesEip712Role,
  chainIdToBig,
  isSupportedChain,
} from "../../utils.ts";
import type { Hex } from "viem";
import { ADDR, ADDR_B, TEST_VERIFIER_CONTRACT, testDomain } from "./fixtures.ts";

describe("chainIdToBig", () => {
  test("number と bigint を bigint に揃える", () => {
    expect(chainIdToBig(1)).toBe(1n);
    expect(chainIdToBig(137)).toBe(137n);
    expect(chainIdToBig(10n)).toBe(10n);
  });
});

describe("isSupportedChain", () => {
  test("supportedChains に含まれる chain.id なら真", () => {
    const c = { chain: mainnet } as unknown as PublicClient;
    expect(isSupportedChain(c)).toBe(true);
  });

  test("未対応の id なら偽", () => {
    const c = { chain: { id: 999999 } } as unknown as PublicClient;
    expect(isSupportedChain(c)).toBe(false);
  });

  test("chain が undefined なら偽", () => {
    const c = { chain: undefined } as unknown as PublicClient;
    expect(isSupportedChain(c)).toBe(false);
  });
});

describe("assertPublicWalletSameSupportedChain", () => {
  test("同一 mainnet なら通る", () => {
    const p = { chain: mainnet } as unknown as PublicClient;
    const w = { chain: mainnet } as unknown as WalletClient;
    expect(() =>
      assertPublicWalletSameSupportedChain(p, w),
    ).not.toThrow();
  });

  test("Public と Wallet の chain.id が異なれば例外", () => {
    const p = { chain: mainnet } as unknown as PublicClient;
    const w = { chain: polygon } as unknown as WalletClient;
    expect(() => assertPublicWalletSameSupportedChain(p, w)).toThrow(
      /chain mismatch/,
    );
  });

  test("いずれかが非対応チェーンなら Unsupported chain", () => {
    const p = { chain: mainnet } as unknown as PublicClient;
    const w = { chain: { id: 99999, name: "x" } } as unknown as WalletClient;
    expect(() => assertPublicWalletSameSupportedChain(p, w)).toThrow(
      /Unsupported chain/,
    );
  });
});

describe("assertSignerMatchesEip712Role", () => {
  test("同一アドレスなら通る（大小文字は無視）", () => {
    expect(() =>
      assertSignerMatchesEip712Role(ADDR as Hex, ADDR as Hex, "from"),
    ).not.toThrow();
    const upper = ADDR.toUpperCase() as Hex;
    expect(() =>
      assertSignerMatchesEip712Role(upper, ADDR as Hex, "from"),
    ).not.toThrow();
  });

  test("異なるアドレスなら例外（from）", () => {
    expect(() =>
      assertSignerMatchesEip712Role(ADDR_B as Hex, ADDR as Hex, "from"),
    ).toThrow(/Signer account .* does not match EIP-712 message from/);
  });

  test("異なるアドレスなら例外（authorizer）", () => {
    expect(() =>
      assertSignerMatchesEip712Role(ADDR_B as Hex, ADDR as Hex, "authorizer"),
    ).toThrow(/Signer account .* does not match EIP-712 message authorizer/);
  });
});

describe("assertSignedDomainMatchesClientAndConfig", () => {
  const pc = { chain: mainnet } as unknown as PublicClient;

  test("chainId と verifyingContract が一致すれば通る", () => {
    const d = testDomain(TEST_VERIFIER_CONTRACT, mainnet.id);
    expect(() =>
      assertSignedDomainMatchesClientAndConfig(
        pc,
        d,
        TEST_VERIFIER_CONTRACT,
      ),
    ).not.toThrow();
  });

  test("domain.chainId がクライアントと違えば例外", () => {
    const d = testDomain(TEST_VERIFIER_CONTRACT, 137);
    expect(() =>
      assertSignedDomainMatchesClientAndConfig(
        pc,
        d,
        TEST_VERIFIER_CONTRACT,
      ),
    ).toThrow(/domain\.chainId/);
  });

  test("verifyingContract が config と違えば例外", () => {
    const d = testDomain(TEST_VERIFIER_CONTRACT, mainnet.id);
    const wrong = "0x4444444444444444444444444444444444444444" as const;
    expect(() =>
      assertSignedDomainMatchesClientAndConfig(pc, d, wrong),
    ).toThrow(/verifyingContract/);
  });

  test("chain が未設定なら Unsupported chain", () => {
    const p = { chain: undefined } as unknown as PublicClient;
    const d = testDomain();
    expect(() =>
      assertSignedDomainMatchesClientAndConfig(
        p,
        d,
        TEST_VERIFIER_CONTRACT,
      ),
    ).toThrow(/Unsupported chain/);
  });
});
