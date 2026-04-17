import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "bun:test";
import type { SignedTransferWithCommit } from "eth-twc-sdk-js/types/signedData";
import type { Hex } from "viem";

import {
  useSendAuthorizedBatchTransfer,
  useSendAuthorizedSingleTransfer,
  useSendAuthorizedUnifiedTransfer,
  useSendCancelAuthorization,
} from "../hooks/signatureTransfer.ts";
import { ADDR, ADDR_B, COMMIT, testDomain } from "./fixtures.ts";
import { createQueryWrapper, createTestQueryClient } from "./queryClient.tsx";
import { resetSdkConfigAddress, setSdkConfigAddressZero } from "./sdkConfigState.ts";
import {
  minimalSignedBatch,
  minimalSignedCancel,
  minimalSignedSingleTransfer,
  minimalSignedUni,
  stubClientsSignatureSendSimulateFails,
  stubClientsSignatureSendSuccess,
  stubPublicClient,
  stubWalletClient,
} from "./stubs.ts";
import { resetWagmiState, wagmiState } from "./wagmiState.ts";

describe("useSendAuthorized* / useSendCancelAuthorization", () => {
  beforeEach(() => {
    resetWagmiState();
    resetSdkConfigAddress();
  });

  test("未接続時は mutate が失敗", async () => {
    wagmiState.publicClient = stubPublicClient();
    wagmiState.walletClient = stubWalletClient();
    wagmiState.address = undefined;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSendAuthorizedSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate(minimalSignedSingleTransfer());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /TWC: connect a wallet to send or sign/,
    );
  });

  test("sdk_js: config ゼロでは assert が失敗", async () => {
    setSdkConfigAddressZero();
    const { publicClient, walletClient } = stubClientsSignatureSendSuccess();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSendAuthorizedSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate(minimalSignedSingleTransfer());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /not configured \(zero address\)/,
    );
  });

  test("RPC: simulate が revert 相当で失敗すると伝播", async () => {
    const { publicClient, walletClient } = stubClientsSignatureSendSimulateFails();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSendAuthorizedSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate(minimalSignedSingleTransfer());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/RPC: execution reverted/);
  });

  test("sdk_js: domain の verifyingContract が config と不一致なら失敗", async () => {
    const { publicClient, walletClient } = stubClientsSignatureSendSuccess();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const base = minimalSignedSingleTransfer();
    const wrong: typeof base = {
      ...base,
      domain: {
        ...base.domain,
        verifyingContract: ADDR_B,
      },
    };

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSendAuthorizedSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate(wrong);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /verifyingContract .* does not match transferWithCommitmentAddress/,
    );
  });

  test("成功時は tx ハッシュが data", async () => {
    const { publicClient, walletClient } = stubClientsSignatureSendSuccess();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSendAuthorizedSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate(minimalSignedSingleTransfer());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatch(/^0x/);
  });

  test("useSendAuthorizedUnifiedTransfer が RPC 失敗を伝播", async () => {
    const { publicClient, walletClient } = stubClientsSignatureSendSimulateFails();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSendAuthorizedUnifiedTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate(minimalSignedUni());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/RPC: execution reverted/);
  });

  test("useSendAuthorizedBatchTransfer が RPC 失敗を伝播", async () => {
    const { publicClient, walletClient } = stubClientsSignatureSendSimulateFails();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSendAuthorizedBatchTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate(minimalSignedBatch());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/RPC: execution reverted/);
  });

  test("useSendCancelAuthorization が RPC 失敗を伝播", async () => {
    const { publicClient, walletClient } = stubClientsSignatureSendSimulateFails();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSendCancelAuthorization(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate(minimalSignedCancel());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/RPC: execution reverted/);
  });

  test("domain chainId がクライアントと不一致なら失敗", async () => {
    const { publicClient, walletClient } = stubClientsSignatureSendSuccess();
    wagmiState.publicClient = publicClient;
    wagmiState.walletClient = walletClient;
    wagmiState.address = ADDR as Hex;

    const d = testDomain(undefined, 2);
    const wrongSigned = {
      ...minimalSignedSingleTransfer(),
      domain: {
        name: d.name,
        version: d.version,
        chainId: d.chainId,
        verifyingContract: d.verifyingContract,
      },
    };

    const qc = createTestQueryClient();
    const { result } = renderHook(() => useSendAuthorizedSingleTransfer(), {
      wrapper: createQueryWrapper(qc),
    });
    result.current.mutate(wrongSigned as SignedTransferWithCommit);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(
      /domain\.chainId .* does not match client chain id/,
    );
  });
});
