import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Chain, PublicClient } from "viem";
import { mainnet } from "viem/chains";

import {
  useIsSupportedChain,
  useIsTransferWithCommitmentDeployed,
} from "../hooks/configInfo.ts";
import { EIP712_DOMAIN_NAME } from "../hooks/sdkConfig.ts";
import { TEST_VERIFIER_CONTRACT } from "./fixtures.ts";
import { createQueryWrapper, createTestQueryClient } from "./queryClient.tsx";
import { resetSdkConfigAddress, sdkConfigState } from "./sdkConfigState.ts";
import { resetWagmiState, wagmiState } from "./wagmiState.ts";
import { stubPublicClient } from "./stubs.ts";

describe("sdkConfig 再エクスポート", () => {
  beforeEach(() => {
    resetSdkConfigAddress();
  });

  test("transferWithCommitmentAddress はモック config と一致", () => {
    expect(sdkConfigState.transferWithCommitmentAddress).toBe(
      TEST_VERIFIER_CONTRACT,
    );
  });

  test("EIP712_DOMAIN_NAME がコントラクトと一致", () => {
    expect(EIP712_DOMAIN_NAME).toBe("TransferWithCommitment");
  });
});

describe("useIsTransferWithCommitmentDeployed", () => {
  beforeEach(() => {
    resetWagmiState();
  });

  test("public client が無いときは false", () => {
    const qc = createTestQueryClient();
    const { result } = renderHook(() => useIsTransferWithCommitmentDeployed(), {
      wrapper: createQueryWrapper(qc),
    });
    expect(result.current).toBe(false);
  });

  test("getCode が空なら false", async () => {
    const qc = createTestQueryClient();
    wagmiState.publicClient = stubPublicClient({
      getCode: mock(() => Promise.resolve("0x")) as unknown as PublicClient["getCode"],
    });
    const { result } = renderHook(() => useIsTransferWithCommitmentDeployed(), {
      wrapper: createQueryWrapper(qc),
    });
    await waitFor(() => expect(result.current).toBe(false));
  });

  test("getCode が非空なら true", async () => {
    const qc = createTestQueryClient();
    wagmiState.publicClient = stubPublicClient({
      chain: mainnet,
      getCode: mock(() =>
        Promise.resolve("0x6000"),
      ) as unknown as PublicClient["getCode"],
    });
    const { result } = renderHook(() => useIsTransferWithCommitmentDeployed(), {
      wrapper: createQueryWrapper(qc),
    });
    await waitFor(() => expect(result.current).toBe(true));
  });

  test("未知名義の chain でも getCode が成功すれば評価される", async () => {
    const qc = createTestQueryClient();
    wagmiState.publicClient = stubPublicClient({
      chain: { id: 999_999, name: "Unknown" } as unknown as Chain,
      getCode: mock(() =>
        Promise.resolve("0x6000"),
      ) as unknown as PublicClient["getCode"],
    });
    const { result } = renderHook(() => useIsTransferWithCommitmentDeployed(), {
      wrapper: createQueryWrapper(qc),
    });
    await waitFor(() => expect(result.current).toBe(true));
  });
});

describe("useIsSupportedChain（非推奨エイリアス）", () => {
  beforeEach(() => {
    resetWagmiState();
  });

  test("useIsTransferWithCommitmentDeployed と同じ参照", () => {
    expect(useIsSupportedChain).toBe(useIsTransferWithCommitmentDeployed);
  });
});
