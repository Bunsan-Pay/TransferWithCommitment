import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, mock, test } from "bun:test";
import { mainnet } from "viem/chains";
import type { Chain, Hex, PublicClient } from "viem";

import {
  useTransferWithCommitmentSentLogs,
  useVerifyTransfer,
} from "../hooks/verify.ts";
import { ADDR, COMMIT } from "./fixtures.ts";
import { createQueryWrapper, createTestQueryClient } from "./queryClient.tsx";
import { resetSdkConfigAddress, setSdkConfigAddressZero } from "./sdkConfigState.ts";
import { stubPublicClient } from "./stubs.ts";
import { resetWagmiState, wagmiState } from "./wagmiState.ts";

const TX = ("0x" + "ab".repeat(32)) as Hex;

const validVerifyArgs = {
  from: ADDR,
  token: ADDR,
  to: ADDR,
  value: 1n,
  commitment: COMMIT,
};

describe("useVerifyTransfer", () => {
  beforeEach(() => {
    resetWagmiState();
    resetSdkConfigAddress();
  });

  test("txHash / args が無いときはクエリが enabled にならず fetch しない", async () => {
    wagmiState.publicClient = stubPublicClient();
    const qc = createTestQueryClient();
    const { result } = renderHook(
      () => useVerifyTransfer(undefined, validVerifyArgs),
      { wrapper: createQueryWrapper(qc) },
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.status).toBe("pending");
  });

  test("sdk_js: verify の arktype 失敗は query error", async () => {
    wagmiState.publicClient = stubPublicClient();
    const qc = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useVerifyTransfer(TX, {
          ...validVerifyArgs,
          from: "0xbad" as Hex,
        }),
      { wrapper: createQueryWrapper(qc) },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  test("sdk_js: config ゼロでは verify が失敗して query error", async () => {
    setSdkConfigAddressZero();
    wagmiState.publicClient = stubPublicClient();
    const qc = createTestQueryClient();
    const { result } = renderHook(
      () => useVerifyTransfer(TX, validVerifyArgs),
      { wrapper: createQueryWrapper(qc) },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(String(result.current.error?.message)).toMatch(
      /not configured \(zero address\)/,
    );
  });

  test("RPC: getTransactionReceipt が失敗したら query error に伝播", async () => {
    const getTransactionReceipt = mock(() =>
      Promise.reject(new Error("RPC: receipt timeout")),
    );
    wagmiState.publicClient = stubPublicClient({
      getTransactionReceipt,
    }) as unknown as PublicClient;

    const qc = createTestQueryClient();
    const { result } = renderHook(
      () => useVerifyTransfer(TX, validVerifyArgs),
      { wrapper: createQueryWrapper(qc) },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/RPC: receipt timeout/);
  });

  test("レシートに該当ログが無いとき sdk_js のメッセージが伝播", async () => {
    const getTransactionReceipt = mock(() =>
      Promise.resolve({
        logs: [],
      }),
    ) as unknown as PublicClient["getTransactionReceipt"];
    wagmiState.publicClient = stubPublicClient({
      getTransactionReceipt,
    }) as unknown as PublicClient;

    const qc = createTestQueryClient();
    const { result } = renderHook(
      () => useVerifyTransfer(TX, validVerifyArgs),
      { wrapper: createQueryWrapper(qc) },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /TransferWithCommitmentSent event not found/,
    );
  });

  test("未対応チェーンでは Unsupported chain", async () => {
    wagmiState.publicClient = stubPublicClient({
      chain: { id: 999_998, name: "UnsupportedTest" } as unknown as Chain,
    }) as unknown as PublicClient;

    const qc = createTestQueryClient();
    const { result } = renderHook(
      () => useVerifyTransfer(TX, validVerifyArgs),
      { wrapper: createQueryWrapper(qc) },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/Unsupported chain/);
  });
});

describe("useTransferWithCommitmentSentLogs", () => {
  beforeEach(() => {
    resetWagmiState();
    resetSdkConfigAddress();
  });

  test("config ゼロでは assert が失敗", async () => {
    setSdkConfigAddressZero();
    wagmiState.publicClient = stubPublicClient();
    const qc = createTestQueryClient();
    const { result } = renderHook(() => useTransferWithCommitmentSentLogs(TX), {
      wrapper: createQueryWrapper(qc),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(String(result.current.error?.message)).toMatch(
      /not configured \(zero address\)/,
    );
  });

  test("RPC 失敗を query error に伝播", async () => {
    const getTransactionReceipt = mock(() =>
      Promise.reject(new Error("RPC: not found")),
    );
    wagmiState.publicClient = stubPublicClient({
      getTransactionReceipt,
    }) as unknown as PublicClient;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useTransferWithCommitmentSentLogs(TX), {
      wrapper: createQueryWrapper(qc),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/RPC: not found/);
  });

  test("成功時はログ配列が data（空でも例外にしない）", async () => {
    const getTransactionReceipt = mock(() =>
      Promise.resolve({
        logs: [],
      }),
    ) as unknown as PublicClient["getTransactionReceipt"];
    wagmiState.publicClient = stubPublicClient({
      chain: mainnet,
      getTransactionReceipt,
    }) as unknown as PublicClient;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useTransferWithCommitmentSentLogs(TX), {
      wrapper: createQueryWrapper(qc),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data).toEqual([]);
  });
});
