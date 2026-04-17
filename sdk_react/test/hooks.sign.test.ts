import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "bun:test";
import type { Hex } from "viem";

import {
  useSignBatchTransferWithCommit,
  useSignCancelAuthorization,
  useSignSingleTransfer,
  useSignUniCommitTransfers,
} from "../hooks/sign.ts";
import { ADDR, ADDR_B, COMMIT } from "./fixtures.ts";
import { createQueryWrapper, createTestQueryClient } from "./queryClient.tsx";
import { resetSdkConfigAddress, setSdkConfigAddressZero } from "./sdkConfigState.ts";
import {
  stubClientsGetEip712DomainRejects,
  stubClientsSignSuccess,
  stubClientsSignTypedDataRejects,
  stubPublicClient,
  stubWalletClient,
} from "./stubs.ts";
import { resetWagmiState, wagmiState } from "./wagmiState.ts";

describe("useSign*", () => {
  beforeEach(() => {
    resetWagmiState();
    resetSdkConfigAddress();
  });

  test("未接続時は mutate が narrowWriteClients で失敗", async () => {
    wagmiState.publicClient = stubPublicClient();
    wagmiState.walletClient = stubWalletClient();
    wagmiState.address = undefined;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSignSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      from: ADDR,
      to: ADDR_B,
      token: ADDR,
      executor: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /TWC: connect a wallet to send or sign/,
    );
  });

  test("sdk_js: Signer と EIP-712 from が不一致なら署名前に失敗", async () => {
    const { publicClient, walletClient } = stubClientsSignSuccess();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR_B as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSignSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      from: ADDR,
      to: ADDR_B,
      token: ADDR,
      executor: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /Signer account .* does not match EIP-712 message from/,
    );
  });

  test("config ゼロアドレスでは assert が失敗", async () => {
    setSdkConfigAddressZero();
    const { publicClient, walletClient } = stubClientsSignSuccess();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSignSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      from: ADDR,
      to: ADDR_B,
      token: ADDR,
      executor: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /not configured \(zero address\)/,
    );
  });

  test("RPC: getEip712Domain が失敗したらエラーが伝播", async () => {
    const { publicClient, walletClient } = stubClientsGetEip712DomainRejects();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSignSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      from: ADDR,
      to: ADDR_B,
      token: ADDR,
      executor: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/getEip712Domain failed/);
  });

  test("ウォレット: signTypedData が拒否されたらエラーが伝播", async () => {
    const { publicClient, walletClient } = stubClientsSignTypedDataRejects();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSignSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      from: ADDR,
      to: ADDR_B,
      token: ADDR,
      executor: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/User rejected/);
  });

  test("成功時は Signed* が data に入る", async () => {
    const { publicClient, walletClient, sig } = stubClientsSignSuccess();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSignSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      from: ADDR,
      to: ADDR_B,
      token: ADDR,
      executor: ADDR_B,
      value: 1n,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.signature).toBe(sig);
  });

  test("useSignUniCommitTransfers: RPC 失敗を伝播", async () => {
    const { publicClient, walletClient } = stubClientsGetEip712DomainRejects();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSignUniCommitTransfers(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      from: ADDR,
      executor: ADDR_B,
      details: [{ to: ADDR_B, token: ADDR, value: 1n }],
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/getEip712Domain failed/);
  });

  test("useSignBatchTransferWithCommit: RPC 失敗を伝播", async () => {
    const { publicClient, walletClient } = stubClientsGetEip712DomainRejects();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSignBatchTransferWithCommit(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      from: ADDR,
      executor: ADDR_B,
      details: [
        { to: ADDR_B, token: ADDR, value: 1n, commitment: COMMIT },
      ],
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/getEip712Domain failed/);
  });

  test("useSignCancelAuthorization: authorizer と接続アドレスが不一致なら失敗", async () => {
    const { publicClient, walletClient } = stubClientsSignSuccess();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR_B as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSignCancelAuthorization(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate({
      authorizer: ADDR,
      commitment: COMMIT,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /Signer account .* does not match EIP-712 message authorizer/,
    );
  });
});
