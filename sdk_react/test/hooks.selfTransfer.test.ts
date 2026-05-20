import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "bun:test";
import type { Hex } from "viem";
import { mainnet } from "viem/chains";

import { useSelfBatchTransfer, useSelfTransfer, useSelfUnifiedTransfer } from "../hooks/selfTransfer.ts";
import { ADDR, ADDR_B, COMMIT } from "./fixtures.ts";
import { createQueryWrapper, createTestQueryClient } from "./queryClient.tsx";
import { resetSdkConfigAddress, setSdkConfigAddressZero } from "./sdkConfigState.ts";
import {
  stubClientsSelfTransferSimulateRpcError,
  stubClientsSelfTransferSuccess,
  stubPublicClient,
  stubWalletClient,
} from "./stubs.ts";
import { resetWagmiState, wagmiState } from "./wagmiState.ts";

describe("useSelfTransfer / useSelfUnifiedTransfer / useSelfBatchTransfer", () => {
  beforeEach(() => {
    resetWagmiState();
    resetSdkConfigAddress();
  });

  test("未接続（address なし）は mutate が narrowWriteClients で失敗", async () => {
    wagmiState.publicClient = stubPublicClient();
    wagmiState.walletClient = stubWalletClient();
    wagmiState.address = undefined;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSelfTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      token: ADDR,
      to: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /TWC: connect a wallet to send or sign/,
    );
  });

  test("sdk_js: transferWithCommitmentAddress がゼロのとき assert が失敗", async () => {
    setSdkConfigAddressZero();
    const { publicClient: pc, walletClient } = stubClientsSelfTransferSuccess();
    wagmiState.publicClient = stubPublicClient({
      simulateContract: pc.simulateContract,
      getCode: async () => "0x",
    });
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSelfTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      token: ADDR,
      to: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /not deployed at/,
    );
  });

  test("RPC: simulateContract が拒否されると mutation error にメッセージが伝播", async () => {
    const { publicClient, walletClient } = stubClientsSelfTransferSimulateRpcError();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSelfTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      token: ADDR,
      to: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/RPC: eth_call failed/);
  });

  test("PublicClient と WalletClient の chain.id が異なれば chain mismatch", async () => {
    const { publicClient, walletClient } = stubClientsSelfTransferSuccess();
    wagmiState.publicClient = {
      ...publicClient,
      chain: mainnet,
    } as typeof publicClient;
    wagmiState.walletClient = {
      ...walletClient,
      chain: { id: 137, name: "Polygon" },
    } as typeof walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSelfTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      token: ADDR,
      to: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/chain mismatch/);
  });

  test("成功時は write の戻り tx ハッシュが data になる", async () => {
    const { publicClient, walletClient } = stubClientsSelfTransferSuccess();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSelfTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      token: ADDR,
      to: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatch(/^0x[a-fA-F0-9]+$/);
  });

  test("useSelfUnifiedTransfer も同様に RPC 失敗を伝播", async () => {
    const { publicClient, walletClient } = stubClientsSelfTransferSimulateRpcError();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSelfUnifiedTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      details: [{ to: ADDR_B, token: ADDR, value: 1n }],
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/RPC: eth_call failed/);
  });

  test("useSelfBatchTransfer も同様に RPC 失敗を伝播", async () => {
    const { publicClient, walletClient } = stubClientsSelfTransferSimulateRpcError();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSelfBatchTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      details: [
        { to: ADDR_B, token: ADDR, value: 1n, commitment: COMMIT },
      ],
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/RPC: eth_call failed/);
  });
});
