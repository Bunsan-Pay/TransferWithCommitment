import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "bun:test";
import type { Chain } from "viem";
import { mainnet } from "viem/chains";

import { useIsSupportedChain } from "../hooks/configInfo.ts";
import { supportedChains, transferWithCommitmentAddress } from "../hooks/sdkConfig.ts";
import { TEST_VERIFIER_CONTRACT } from "./fixtures.ts";
import { resetSdkConfigAddress } from "./sdkConfigState.ts";
import { resetWagmiState, wagmiState } from "./wagmiState.ts";
import { stubPublicClient } from "./stubs.ts";

describe("sdkConfig 再エクスポート", () => {
  beforeEach(() => {
    resetSdkConfigAddress();
  });

  test("transferWithCommitmentAddress はモック config と一致", () => {
    expect(transferWithCommitmentAddress).toBe(TEST_VERIFIER_CONTRACT);
  });

  test("supportedChains に mainnet が含まれる", () => {
    expect(supportedChains.some((c) => c.id === mainnet.id)).toBe(true);
  });
});

describe("useIsSupportedChain", () => {
  beforeEach(() => {
    resetWagmiState();
  });

  test("public client が無いときは false", () => {
    const { result } = renderHook(() => useIsSupportedChain());
    expect(result.current).toBe(false);
  });

  test("mainnet クライアントでは true", () => {
    wagmiState.publicClient = stubPublicClient({ chain: mainnet });
    const { result } = renderHook(() => useIsSupportedChain());
    expect(result.current).toBe(true);
  });

  test("未対応チェーン id では false", () => {
    wagmiState.publicClient = stubPublicClient({
      chain: { id: 999_999, name: "Unknown" } as unknown as Chain,
    });
    const { result } = renderHook(() => useIsSupportedChain());
    expect(result.current).toBe(false);
  });
});
