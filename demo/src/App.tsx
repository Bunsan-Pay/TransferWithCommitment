import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import type { SignedBatchTransfer } from "eth-twc-sdk-js/signatureTransfer/batch";
import type { SelfTransferBatchArgs } from "eth-twc-sdk-js/selfTransfer/batch";
import type { SelfTransferSingleArgs } from "eth-twc-sdk-js/selfTransfer/single";
import type { SelfTransferUnifiedArgs } from "eth-twc-sdk-js/selfTransfer/unified";
import type { SignatureTransferBatchArgs } from "eth-twc-sdk-js/signatureTransfer/batch";
import type { SignatureTransferSingleArgs } from "eth-twc-sdk-js/signatureTransfer/single";
import type { SignatureTransferUnifiedArgs } from "eth-twc-sdk-js/signatureTransfer/unified";
import type { SignedSingleTransfer } from "eth-twc-sdk-js/signatureTransfer/single";
import type { SignedUnifiedTransfer } from "eth-twc-sdk-js/signatureTransfer/unified";
import React from "react";
import {
  concat,
  erc20Abi,
  formatUnits,
  isAddress,
  keccak256,
  maxUint256,
  parseUnits,
  toBytes,
  toHex,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import {
  downloadJsonFile,
  parseAndValidateImportedSignedPayload,
  payerTokenTotals,
  signedBundleSchemaJson,
  signedPayloadVariant,
  stringifySignedPayload,
  type SignedPayload,
} from "./signedPayloadExport";
import {
  transferWithCommitmentAddress,
  useIsTransferWithCommitmentDeployed,
  useSelfBatchTransfer,
  useSelfTransfer,
  useSelfUnifiedTransfer,
  useSendAuthorizedBatchTransfer,
  useSendAuthorizedSingleTransfer,
  useSendAuthorizedUnifiedTransfer,
  useSignBatchTransferWithCommit,
  useSignSingleTransfer,
  useSignUnifiedTransfer,
  useTransferWithCommitmentSentLogs,
  useVerifyTransfer,
  type VerifyTransferArgs,
} from "eth-twc-sdk-react";

type Flow = "self" | "signature";
type TransferMode = "single" | "unified" | "batch";

type TransferRow = {
  id: string;
  to: string;
  value: string;
  message: string;
  random: Hex;
};

type Status = {
  tone: "info" | "success" | "error";
  text: string;
};

type CommitmentLookup = {
  txHash: Hex;
  commitment: Hex;
};

type SentLogArgs = {
  from: Hex;
  to: Hex;
  token: Hex;
  value: bigint;
  commitment: Hex;
};

type TokenMetadata = {
  name: string;
  symbol: string;
  decimals: number;
};

function randomBytes32(): Hex {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
}

function createRow(message = "demo-transfer"): TransferRow {
  return {
    id: crypto.randomUUID(),
    to: "",
    value: "1",
    message,
    random: randomBytes32(),
  };
}

function deriveCommitment(message: string, random: Hex): Hex {
  return keccak256(concat([toBytes(message), random]));
}

function isBytes32Hex(input: string): input is Hex {
  return /^0x[a-fA-F0-9]{64}$/.test(input);
}

function sameHex(a: Hex, b: Hex): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function readSentLogArgs(log: unknown): SentLogArgs | undefined {
  const args = (log as { args?: Record<string, unknown> }).args;
  const from = args?.from;
  const to = args?.to;
  const token = args?.token;
  const value = args?.value;
  const commitment = args?.commitment;
  if (
    typeof from !== "string" ||
    typeof to !== "string" ||
    typeof token !== "string" ||
    typeof commitment !== "string" ||
    typeof value !== "bigint"
  ) {
    return undefined;
  }
  if (
    !isAddress(from) ||
    !isAddress(to) ||
    !isAddress(token) ||
    !isBytes32Hex(commitment)
  ) {
    return undefined;
  }
  return { from, to, token, value, commitment };
}

function aggregateByToken(logs: SentLogArgs[]): Array<{
  token: Hex;
  total: bigint;
  count: number;
}> {
  const totals = new Map<string, { token: Hex; total: bigint; count: number }>();
  for (const log of logs) {
    const key = log.token.toLowerCase();
    const current = totals.get(key);
    if (current) {
      current.total += log.value;
      current.count += 1;
    } else {
      totals.set(key, { token: log.token, total: log.value, count: 1 });
    }
  }
  return [...totals.values()];
}

function parseTokenValue(input: string, decimals: number | undefined): bigint | undefined {
  if (decimals === undefined) return undefined;
  const normalized = input.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) return undefined;
  try {
    return parseUnits(normalized, decimals);
  } catch {
    return undefined;
  }
}

function formatTokenAmount(
  value: bigint | undefined,
  decimals: number | undefined,
  symbol: string,
): string {
  if (value === undefined || decimals === undefined) return "-";
  return `${formatUnits(value, decimals)} ${symbol}`;
}

function stringifyWithBigInt(value: unknown): string {
  return JSON.stringify(
    value,
    (_, current) =>
      typeof current === "bigint" ? current.toString() : current,
    2,
  );
}

export function App() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isDeployed = useIsTransferWithCommitmentDeployed();

  const [flow, setFlow] = useStateWithReset<Flow>("self");
  const [mode, setMode] = useStateWithReset<TransferMode>("single");
  const [token, setToken] = useStateWithReset("");
  const [executor, setExecutor] = useStateWithReset("");
  const [commonMessage, setCommonMessage] = useStateWithReset("demo-payment");
  const [commonRandom, setCommonRandom] = useStateWithReset(randomBytes32);
  const [batchAuthMessage, setBatchAuthMessage] =
    useStateWithReset("demo-batch-authorization");
  const [batchAuthRandom, setBatchAuthRandom] = useStateWithReset(randomBytes32);
  const [rows, setRows] = useStateWithReset<TransferRow[]>(() => [
    createRow("demo-transfer-1"),
  ]);
  const [signed, setSigned] = useStateWithReset<SignedPayload | null>(null);
  const [txHash, setTxHash] = useStateWithReset<Hex | undefined>(undefined);
  const [verifyArgs, setVerifyArgs] =
    useStateWithReset<VerifyTransferArgs | undefined>(undefined);
  const [status, setStatus] = useStateWithReset<Status | null>(null);
  const [importedSignedPayload, setImportedSignedPayload] =
    useStateWithReset<SignedPayload | null>(null);
  const [importedPayloadError, setImportedPayloadError] =
    useStateWithReset<string | null>(null);
  const [lookupTxHashInput, setLookupTxHashInput] = useStateWithReset("");
  const [lookupCommitmentInput, setLookupCommitmentInput] = useStateWithReset("");
  const [lookupRequest, setLookupRequest] =
    useStateWithReset<CommitmentLookup | null>(null);
  const [lookupError, setLookupError] = useStateWithReset<string | null>(null);

  const commonCommitment = deriveCommitment(commonMessage, commonRandom);
  const batchCommitment = deriveCommitment(batchAuthMessage, batchAuthRandom);
  const tokenAddress = isAddress(token) ? (token as Hex) : undefined;
  const executorAddress = isAddress(executor) ? (executor as Hex) : undefined;

  const tokenMetadata = useQuery({
    queryKey: ["twc-demo", "tokenMetadata", tokenAddress],
    enabled: Boolean(publicClient && tokenAddress),
    queryFn: async () => {
      if (!publicClient || !tokenAddress) {
        throw new Error("token address is required");
      }
      const [decimals, symbol, name] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "decimals",
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "name",
        }),
      ]);
      return {
        decimals: Number(decimals),
        symbol: String(symbol),
        name: String(name),
      };
    },
  });
  const tokenDecimals = tokenMetadata.data?.decimals;
  const tokenSymbol = tokenMetadata.data?.symbol ?? "token";
  const rowsWithValues = rows.map((row) => ({
    ...row,
    parsedValue: parseTokenValue(row.value, tokenDecimals),
    commitment: deriveCommitment(row.message, row.random),
  }));
  const activeRows =
    mode === "single" ? rowsWithValues.slice(0, 1) : rowsWithValues;
  const requiredAllowance = activeRows.reduce<bigint | undefined>(
    (sum, row) =>
      sum === undefined || row.parsedValue === undefined
        ? undefined
        : sum + row.parsedValue,
    0n,
  );
  const firstRow = activeRows[0];
  const wrongChain = isConnected && chainId !== sepolia.id;
  const needsBatchAuthCommitment = flow === "signature" && mode === "batch";

  const allowance = useQuery({
    queryKey: ["twc-demo", "allowance", address, tokenAddress],
    enabled: Boolean(publicClient && address && tokenAddress),
    queryFn: async () => {
      if (!publicClient || !address || !tokenAddress) {
        throw new Error("wallet and token are required");
      }
      return publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, transferWithCommitmentAddress],
      }) as Promise<bigint>;
    },
  });

  const approve = useMutation({
    mutationFn: async () => {
      if (!publicClient || !walletClient || !tokenAddress) {
        throw new Error("wallet and token are required");
      }
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [transferWithCommitmentAddress, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    onSuccess: async (hash) => {
      setStatus({ tone: "success", text: `approve confirmed: ${hash}` });
      await allowance.refetch();
    },
    onError: (error) => {
      setStatus({ tone: "error", text: error.message });
    },
  });

  const selfSingle = useSelfTransfer();
  const selfUnified = useSelfUnifiedTransfer();
  const selfBatch = useSelfBatchTransfer();
  const signSingle = useSignSingleTransfer();
  const signUnified = useSignUnifiedTransfer();
  const signBatch = useSignBatchTransferWithCommit();
  const sendSingle = useSendAuthorizedSingleTransfer();
  const sendUnified = useSendAuthorizedUnifiedTransfer();
  const sendBatch = useSendAuthorizedBatchTransfer();
  const verify = useVerifyTransfer(txHash, verifyArgs, { retry: false });
  const logs = useTransferWithCommitmentSentLogs(txHash, { retry: false });
  const lookupLogs = useTransferWithCommitmentSentLogs(lookupRequest?.txHash, {
    enabled: lookupRequest !== null,
    retry: false,
  });
  const lookupIsChecking =
    lookupRequest !== null && lookupLogs.fetchStatus === "fetching";
  const lookupMatches = React.useMemo(() => {
    if (!lookupRequest || !lookupLogs.data) return [];
    return lookupLogs.data
      .map(readSentLogArgs)
      .filter((log): log is SentLogArgs =>
        log === undefined ? false : sameHex(log.commitment, lookupRequest.commitment),
      );
  }, [lookupLogs.data, lookupRequest]);
  const lookupTotals = React.useMemo(
    () => aggregateByToken(lookupMatches),
    [lookupMatches],
  );
  const lookupTokenMetadata = useQuery({
    queryKey: [
      "twc-demo",
      "lookupTokenMetadata",
      lookupTotals.map((item) => item.token.toLowerCase()).join(","),
    ],
    enabled: Boolean(publicClient && lookupTotals.length > 0),
    queryFn: async () => {
      if (!publicClient) throw new Error("public client is not available");
      const entries = await Promise.all(
        lookupTotals.map(async ({ token }) => {
          try {
            const [decimals, symbol, name] = await Promise.all([
              publicClient.readContract({
                address: token,
                abi: erc20Abi,
                functionName: "decimals",
              }),
              publicClient.readContract({
                address: token,
                abi: erc20Abi,
                functionName: "symbol",
              }),
              publicClient.readContract({
                address: token,
                abi: erc20Abi,
                functionName: "name",
              }),
            ]);
            return [
              token.toLowerCase(),
              {
                decimals: Number(decimals),
                symbol: String(symbol),
                name: String(name),
              } satisfies TokenMetadata,
            ] as const;
          } catch {
            return [token.toLowerCase(), null] as const;
          }
        }),
      );
      return Object.fromEntries(entries) as Record<string, TokenMetadata | null>;
    },
  });

  const relayCandidateSignature =
    flow === "signature" ? importedSignedPayload ?? signed : null;
  const payerTokenEntries: [Hex, bigint][] =
    relayCandidateSignature === null
      ? []
      : [...payerTokenTotals(relayCandidateSignature).entries()].map(
          ([tok, amt]): [Hex, bigint] => [tok as Hex, amt],
        );

  const payerAllowanceReads = useQueries({
    queries: payerTokenEntries.map(([tokenAcct, needed]) => ({
      queryKey: [
        "twc-demo",
        "payerAllowanceRelay",
        relayCandidateSignature?.from ?? null,
        tokenAcct.toLowerCase(),
      ],
      enabled:
        Boolean(
          publicClient &&
            relayCandidateSignature &&
            isAddress(tokenAcct) &&
            isAddress(relayCandidateSignature.from),
        ),
      queryFn: async (): Promise<{ allowance: bigint; needed: bigint }> => {
        if (!publicClient || !relayCandidateSignature) {
          throw new Error("client or relay payload unavailable");
        }
        const allowanceValue = await publicClient.readContract({
          address: tokenAcct,
          abi: erc20Abi,
          functionName: "allowance",
          args: [relayCandidateSignature.from, transferWithCommitmentAddress],
        });
        return { allowance: allowanceValue as bigint, needed };
      },
    })),
  });

  const payerRelayAllowancesPending =
    relayCandidateSignature !== null &&
    payerTokenEntries.length > 0 &&
    payerAllowanceReads.some((q) => q.isPending);

  const payerRelayAllowancesOk =
    relayCandidateSignature === null ||
    payerTokenEntries.length === 0 ||
    (!payerRelayAllowancesPending &&
      payerAllowanceReads.length === payerTokenEntries.length &&
      payerAllowanceReads.every((q) => q.isSuccess) &&
      payerAllowanceReads.every(
        (q) => q.data !== undefined && q.data.allowance >= q.data.needed,
      ));

  const hasEnoughAllowance =
    allowance.data !== undefined &&
    requiredAllowance !== undefined &&
    allowance.data >= requiredAllowance;
  const canBuild =
    Boolean(address && tokenAddress && firstRow) &&
    activeRows.length > 0 &&
    activeRows.every(
      (row) =>
        isAddress(row.to) &&
        row.parsedValue !== undefined &&
        row.parsedValue > 0n,
    ) &&
    (flow === "self" || Boolean(executorAddress));
  const isBusy =
    approve.isPending ||
    selfSingle.isPending ||
    selfUnified.isPending ||
    selfBatch.isPending ||
    signSingle.isPending ||
    signUnified.isPending ||
    signBatch.isPending ||
    sendSingle.isPending ||
    sendUnified.isPending ||
    sendBatch.isPending;
  const executorOnlyReady =
    flow === "signature" && importedSignedPayload !== null;

  const showSetup =
    isConnected &&
    !wrongChain &&
    isDeployed &&
    !executorOnlyReady &&
    (!tokenAddress || !hasEnoughAllowance);

  const relayPayloadUi = importedSignedPayload ?? signed;
  const canRelaySignature =
    flow === "signature" &&
    Boolean(relayPayloadUi && address && publicClient && payerRelayAllowancesOk);

  function clearSubmittedState() {
    setSigned(null);
    setImportedSignedPayload(null);
    setImportedPayloadError(null);
    setTxHash(undefined);
    setVerifyArgs(undefined);
    setStatus(null);
  }

  /** Signing / relay attempt state — keeps file import (relay JSON is immutable). */
  function clearSigningAndRelayAttempts() {
    setSigned(null);
    setTxHash(undefined);
    setVerifyArgs(undefined);
    setStatus(null);
  }

  /** First transfer row semantics for demos with multi-leg txs (matches prior verify behavior). */
  function verifyArgsFirstLegFromSigned(signed: SignedPayload): VerifyTransferArgs {
    if ("batchCommitment" in signed) {
      const row = signed.details[0];
      if (!row) throw new Error("batch details empty");
      return {
        from: signed.from,
        to: row.to,
        token: row.token,
        value: row.value,
        commitment: row.commitment,
      };
    }
    if ("details" in signed) {
      const row = signed.details[0];
      if (!row) throw new Error("unified details empty");
      return {
        from: signed.from,
        to: row.to,
        token: row.token,
        value: row.value,
        commitment: signed.commitment,
      };
    }
    return {
      from: signed.from,
      to: signed.to,
      token: signed.token,
      value: signed.value,
      commitment: signed.commitment,
    };
  }

  function updateMode(next: TransferMode) {
    setMode(next);
    if (next === "single") {
      setRows((current) => [current[0] ?? createRow("demo-transfer-1")]);
    }
    clearSubmittedState();
  }

  function updateRow(id: string, patch: Partial<TransferRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    clearSubmittedState();
  }

  function addRow() {
    setRows((current) => [
      ...current,
      createRow(`demo-transfer-${current.length + 1}`),
    ]);
    clearSubmittedState();
  }

  function removeRow(id: string) {
    setRows((current) =>
      current.length === 1 ? current : current.filter((row) => row.id !== id),
    );
    clearSubmittedState();
  }

  function buildVerifyArgs(from: Hex): VerifyTransferArgs {
    const row = activeRows[0];
    if (!row || !tokenAddress || row.parsedValue === undefined) {
      throw new Error("transfer form is incomplete");
    }
    return {
      from,
      token: tokenAddress,
      to: row.to as Hex,
      value: row.parsedValue,
      commitment: mode === "batch" ? row.commitment : commonCommitment,
    };
  }

  async function waitAndVerify(hash: Hex, verifyArg: VerifyTransferArgs) {
    if (!publicClient) throw new Error("public client is not available");
    setStatus({ tone: "info", text: `waiting for receipt: ${hash}` });
    await publicClient.waitForTransactionReceipt({ hash });
    setVerifyArgs(verifyArg);
    setTxHash(hash);
    setStatus({ tone: "success", text: `transaction confirmed: ${hash}` });
  }

  function buildSelfArgs():
    | SelfTransferSingleArgs
    | SelfTransferUnifiedArgs
    | SelfTransferBatchArgs {
    if (!tokenAddress) throw new Error("token address is invalid");
    if (mode === "single") {
      const row = activeRows[0];
      if (!row?.parsedValue) throw new Error("single transfer is incomplete");
      return {
        token: tokenAddress,
        to: row.to as Hex,
        value: row.parsedValue,
        commitment: commonCommitment,
      };
    }
    if (mode === "unified") {
      return {
        details: activeRows.map((row) => ({
          token: tokenAddress,
          to: row.to as Hex,
          value: row.parsedValue!,
        })),
        commitment: commonCommitment,
      };
    }
    return {
      details: activeRows.map((row) => ({
        token: tokenAddress,
        to: row.to as Hex,
        value: row.parsedValue!,
        commitment: row.commitment,
      })),
    };
  }

  function buildSignatureArgs():
    | SignatureTransferSingleArgs
    | SignatureTransferUnifiedArgs
    | SignatureTransferBatchArgs {
    if (!address || !tokenAddress || !executorAddress) {
      throw new Error("from, token, and executor are required");
    }
    if (mode === "single") {
      const row = activeRows[0];
      if (!row?.parsedValue) throw new Error("single transfer is incomplete");
      return {
        from: address,
        token: tokenAddress,
        to: row.to as Hex,
        executor: executorAddress,
        value: row.parsedValue,
        commitment: commonCommitment,
      };
    }
    if (mode === "unified") {
      return {
        from: address,
        executor: executorAddress,
        details: activeRows.map((row) => ({
          token: tokenAddress,
          to: row.to as Hex,
          value: row.parsedValue!,
        })),
        commitment: commonCommitment,
      };
    }
    return {
      from: address,
      executor: executorAddress,
      details: activeRows.map((row) => ({
        token: tokenAddress,
        to: row.to as Hex,
        value: row.parsedValue!,
        commitment: row.commitment,
      })),
      batchCommitment,
    };
  }

  async function submitSelfTransfer() {
    if (!address || !canBuild || !hasEnoughAllowance) return;
    try {
      clearSubmittedState();
      setStatus({ tone: "info", text: "sending selfTransfer..." });
      const args = buildSelfArgs();
      const hash =
        mode === "single"
          ? await selfSingle.mutateAsync(args as SelfTransferSingleArgs)
          : mode === "unified"
            ? await selfUnified.mutateAsync(args as SelfTransferUnifiedArgs)
            : await selfBatch.mutateAsync(args as SelfTransferBatchArgs);
      await waitAndVerify(hash, buildVerifyArgs(address));
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function signTransfer() {
    if (!canBuild || !hasEnoughAllowance) return;
    try {
      setSigned(null);
      setTxHash(undefined);
      setVerifyArgs(undefined);
      setStatus({ tone: "info", text: "requesting EIP-712 signature..." });
      const args = buildSignatureArgs();
      const payload =
        mode === "single"
          ? await signSingle.mutateAsync(args as SignatureTransferSingleArgs)
          : mode === "unified"
            ? await signUnified.mutateAsync(args as SignatureTransferUnifiedArgs)
            : await signBatch.mutateAsync(args as SignatureTransferBatchArgs);
      setSigned(payload);
      setStatus({ tone: "success", text: "signature captured" });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function submitSignedTransfer() {
    const relayPayload = importedSignedPayload ?? signed;
    if (!address || !relayPayload) return;
    if (!payerRelayAllowancesOk && payerTokenEntries.length > 0) {
      setStatus({
        tone: "error",
        text:
          payerAllowanceReads.some((q) => q.isPending)
            ? "Loading payer allowances..."
            : "Payer ERC-20 allowance to TWC is insufficient for this relay.",
      });
      return;
    }
    try {
      setTxHash(undefined);
      setVerifyArgs(undefined);
      setStatus({ tone: "info", text: "sending signed transfer (executor)..." });
      const variant = signedPayloadVariant(relayPayload);
      const hash =
        variant === "single"
          ? await sendSingle.mutateAsync(relayPayload as SignedSingleTransfer)
          : variant === "unified"
            ? await sendUnified.mutateAsync(relayPayload as SignedUnifiedTransfer)
            : await sendBatch.mutateAsync(relayPayload as SignedBatchTransfer);
      await waitAndVerify(hash, verifyArgsFirstLegFromSigned(relayPayload));
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function runCommitmentLookup() {
    const txHashValue = lookupTxHashInput.trim();
    const commitmentValue = lookupCommitmentInput.trim();
    if (!isBytes32Hex(txHashValue)) {
      setLookupError("txId must be a 32-byte hex string");
      setLookupRequest(null);
      return;
    }
    if (!isBytes32Hex(commitmentValue)) {
      setLookupError("commitment must be a 32-byte hex string");
      setLookupRequest(null);
      return;
    }
    setLookupError(null);
    setLookupRequest({
      txHash: txHashValue,
      commitment: commitmentValue,
    });
  }

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">TransferWithCommitment Sepolia Demo</p>
        <h1>approve、commitment、送金、verify までを一画面で試す</h1>
        <p>
          TWC: <code>{transferWithCommitmentAddress}</code>
        </p>
        <p>
          <a href="../">Documentation</a>
        </p>
      </header>

      <section className="card">
        <div className="section-title">
          <h2>Wallet / Chain</h2>
          {isConnected ? (
            <button type="button" className="ghost" onClick={() => disconnect()}>
              Disconnect
            </button>
          ) : null}
        </div>
        {isConnected ? (
          <div className="grid two">
            <p>
              <span>Address</span>
              <code>{address}</code>
            </p>
            <p>
              <span>Chain</span>
              <strong>{chainId === sepolia.id ? "Sepolia" : chainId}</strong>
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              const connector = connectors[0];
              if (connector) connect({ connector });
            }}
            disabled={isConnecting || connectors[0] === undefined}
          >
            {isConnecting ? "Connecting..." : "Connect injected wallet"}
          </button>
        )}
        {wrongChain ? (
          <div className="notice warn">
            Sepolia に切り替えてください。
            <button
              type="button"
              onClick={() => switchChain({ chainId: sepolia.id })}
              disabled={isSwitching}
            >
              Switch to Sepolia
            </button>
          </div>
        ) : null}
        {isConnected && !wrongChain && !isDeployed ? (
          <p className="notice warn">
            接続中 RPC では canonical TWC のコードが見つかりません。
          </p>
        ) : null}
      </section>

      <section className="card">
        <h2>ERC-20 / approve</h2>
        <label>
          Token address
          <input
            value={token}
            placeholder="0x..."
            onChange={(event) => {
              setToken(event.target.value);
              clearSubmittedState();
            }}
          />
        </label>
        <div className="token-meta">
          {tokenMetadata.isPending && tokenAddress ? (
            <span>Loading token metadata...</span>
          ) : tokenMetadata.isError ? (
            <span className="error-text">
              Token metadata error: {tokenMetadata.error.message}
            </span>
          ) : tokenMetadata.data ? (
            <>
              <strong>{tokenMetadata.data.name}</strong>
              <span>
                {tokenMetadata.data.symbol} / decimals {tokenMetadata.data.decimals}
              </span>
            </>
          ) : (
            <span>ERC-20 address を入力すると token 名と decimals を読み取ります。</span>
          )}
        </div>
        <div className="grid three">
          <p>
            <span>Required allowance</span>
            <strong>{formatTokenAmount(requiredAllowance, tokenDecimals, tokenSymbol)}</strong>
          </p>
          <p>
            <span>Current allowance</span>
            <strong>
              {allowance.isPending
                ? "loading..."
                : formatTokenAmount(allowance.data, tokenDecimals, tokenSymbol)}
            </strong>
          </p>
          <p>
            <span>Approval status</span>
            <strong>{hasEnoughAllowance ? "OK" : "Required"}</strong>
          </p>
        </div>
        {showSetup ? (
          <div className="notice">
            <strong>初期設定画面</strong>
            <p>
              TWC が ERC-20 を transferFrom できるように approve してください。
              このデモでは最大値を approve します。
            </p>
            <button
              type="button"
              disabled={!tokenAddress || approve.isPending || requiredAllowance === undefined}
              onClick={() => approve.mutate()}
            >
              {approve.isPending ? "Approving..." : "Approve TWC"}
            </button>
          </div>
        ) : null}
      </section>

      <section className={`card ${showSetup && !executorOnlyReady ? "muted-card" : ""}`}>
        <div className="section-title">
          <h2>送金画面</h2>
          <p>{showSetup ? "approve 完了後に送金できます。" : "ready"}</p>
        </div>

        <div className="grid two">
          <fieldset>
            <legend>Transfer kind</legend>
            {(["single", "batch", "unified"] as const).map((item) => (
              <label className="radio" key={item}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === item}
                  onChange={() => updateMode(item)}
                />
                {item}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Route</legend>
            {(["self", "signature"] as const).map((item) => (
              <label className="radio" key={item}>
                <input
                  type="radio"
                  name="flow"
                  checked={flow === item}
                  onChange={() => {
                    setFlow(item);
                    clearSubmittedState();
                  }}
                />
                {item === "self" ? "selfTransfer" : "signatureTransfer"}
              </label>
            ))}
          </fieldset>
        </div>

        {flow === "signature" ? (
          <label>
            Executor address
            <div className="inline">
              <input
                value={executor}
                placeholder="0x..."
                onChange={(event) => {
                  setExecutor(event.target.value);
                  clearSigningAndRelayAttempts();
                }}
              />
              <button
                type="button"
                className="ghost"
                disabled={!address}
                onClick={() => {
                  setExecutor(address ?? "");
                  clearSigningAndRelayAttempts();
                }}
              >
                Use connected
              </button>
            </div>
          </label>
        ) : null}

        {mode === "batch" ? (
          <BatchRows
            rows={rowsWithValues}
            tokenSymbol={tokenSymbol}
            tokenDecimals={tokenDecimals}
            onAdd={addRow}
            onRemove={removeRow}
            onUpdate={updateRow}
          />
        ) : (
          <SingleOrUnifiedRows
            mode={mode}
            rows={rowsWithValues}
            tokenSymbol={tokenSymbol}
            tokenDecimals={tokenDecimals}
            commonMessage={commonMessage}
            commonRandom={commonRandom}
            commonCommitment={commonCommitment}
            onAdd={addRow}
            onRemove={removeRow}
            onUpdate={updateRow}
            onMessage={(value) => {
              setCommonMessage(value);
              clearSubmittedState();
            }}
            onRandom={() => {
              setCommonRandom(randomBytes32());
              clearSubmittedState();
            }}
          />
        )}

        {needsBatchAuthCommitment ? (
          <CommitmentCard
            title="Batch EIP-712 commitment"
            message={batchAuthMessage}
            random={batchAuthRandom}
            commitment={batchCommitment}
            onMessage={(value) => {
              setBatchAuthMessage(value);
              clearSubmittedState();
            }}
            onRandom={() => {
              setBatchAuthRandom(randomBytes32());
              clearSubmittedState();
            }}
          />
        ) : null}

        {flow === "signature" ? (
          <>
            <div className="sig-panel">
              <h3>1. Sign (payer / from)</h3>
              <p className="muted">
                接続ウォレットが EIP-712 の <code>from</code> と一致する必要があります。
                上で approve 済みであること。
              </p>
              <div className="actions">
                <button
                  type="button"
                  disabled={!canBuild || !hasEnoughAllowance || isBusy}
                  onClick={() => void signTransfer()}
                >
                  {signSingle.isPending || signUnified.isPending || signBatch.isPending
                    ? "Signing..."
                    : "Sign only"}
                </button>
                {signed ? (
                  <>
                    <button
                      type="button"
                      className="ghost"
                      disabled={isBusy}
                      onClick={() =>
                        downloadJsonFile(
                          `twc-signed-${signedPayloadVariant(signed)}.bundle.json`,
                          stringifySignedPayload(signed),
                        )
                      }
                    >
                      Export signed bundle JSON
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        downloadJsonFile(
                          "signature-transfer-signed-single.bundle.schema.json",
                          signedBundleSchemaJson.single,
                        )
                      }
                    >
                      Schema: single
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        downloadJsonFile(
                          "signature-transfer-signed-unified.bundle.schema.json",
                          signedBundleSchemaJson.unified,
                        )
                      }
                    >
                      Schema: unified
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        downloadJsonFile(
                          "signature-transfer-signed-batch.bundle.schema.json",
                          signedBundleSchemaJson.batch,
                        )
                      }
                    >
                      Schema: batch
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="sig-panel">
              <h3>2. Relay send (executor)</h3>
              <p className="muted">
                接続ウォレットがオンチェーンの <code>msg.sender</code>（Executor）になります。
                JSON は別端末の署名者から受け取って読み込むこともできます。
              </p>
              <label>
                Load signed bundle JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        const text = String(reader.result ?? "");
                        const parsed = parseAndValidateImportedSignedPayload(text);
                        setImportedSignedPayload(parsed);
                        setImportedPayloadError(null);
                        setStatus({
                          tone: "success",
                          text: `Validated ${signedPayloadVariant(parsed)} bundle from file`,
                        });
                      } catch (err) {
                        setImportedSignedPayload(null);
                        setImportedPayloadError(
                          err instanceof Error ? err.message : String(err),
                        );
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
              {importedPayloadError ? (
                <p className="notice error">{importedPayloadError}</p>
              ) : null}
              {relayPayloadUi ? (
                <p>
                  Relay source:{" "}
                  <strong>
                    {importedSignedPayload ? "imported file" : "in-memory from Sign"}
                  </strong>{" "}
                  — variant <code>{signedPayloadVariant(relayPayloadUi)}</code>, payer{" "}
                  <code>{relayPayloadUi.from}</code>
                </p>
              ) : (
                <p className="muted">Sign するか、JSON ファイルを読み込んでください。</p>
              )}
              {relayCandidateSignature && payerTokenEntries.length > 0 ? (
                <div className="notice">
                  <strong>Payer → TWC allowance</strong>
                  <ul className="inline-list">
                    {payerTokenEntries.map(([tok, need], index) => {
                      const q = payerAllowanceReads[index];
                      const ok =
                        q?.data !== undefined && q.data.allowance >= q.data.needed;
                      return (
                        <li key={tok.toLowerCase()}>
                          <code>{tok}</code>: need {need.toString()} —{" "}
                          {q?.isPending
                            ? "loading..."
                            : q?.isError
                              ? q.error.message
                              : q?.data
                                ? `allowance ${q.data.allowance.toString()} ${ok ? "OK" : "insufficient"}`
                                : "-"}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              <div className="actions">
                <button
                  type="button"
                  disabled={!canRelaySignature || isBusy}
                  onClick={() => void submitSignedTransfer()}
                >
                  {sendSingle.isPending || sendUnified.isPending || sendBatch.isPending
                    ? "Relaying..."
                    : "Relay (sendTx)"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="actions">
            <button
              type="button"
              disabled={!canBuild || !hasEnoughAllowance || isBusy}
              onClick={() => void submitSelfTransfer()}
            >
              {isBusy ? "Processing..." : "Send"}
            </button>
          </div>
        )}

        {signed ? (
          <details>
            <summary>Signed payload (memory)</summary>
            <pre>{stringifySignedPayload(signed)}</pre>
          </details>
        ) : null}
      </section>

      <section className="card">
        <h2>検証</h2>
        {status ? <p className={`notice ${status.tone}`}>{status.text}</p> : null}
        {txHash ? (
          <>
            <p>
              Tx: <code>{txHash}</code>
            </p>
            {verifyArgs ? (
              <p>
                From: <code>{verifyArgs.from}</code> — To:{" "}
                <code>{verifyArgs.to}</code>
              </p>
            ) : null}
            <p>
              Verify:{" "}
              {verify.isPending
                ? "checking..."
                : verify.isSuccess
                  ? "OK"
                  : verify.isError
                    ? verify.error.message
                    : "waiting"}
            </p>
            <details>
              <summary>TransferWithCommitmentSent logs</summary>
              <pre>
                {logs.isSuccess
                  ? stringifyWithBigInt(logs.data)
                  : logs.isError
                    ? logs.error.message
                    : "loading..."}
              </pre>
            </details>
          </>
        ) : (
          <p>送金が confirmed されると、入力情報から verify を実行します。</p>
        )}
      </section>

      <section className="card">
        <h2>Commitment / txId から検証</h2>
        <p>
          事前にこの画面で送金していなくても、txId と commitment が分かれば
          TWC イベントログから token address と合計額を確認できます。
        </p>
        <div className="grid two">
          <label>
            Tx ID
            <input
              value={lookupTxHashInput}
              placeholder="0x..."
              onChange={(event) => {
                setLookupTxHashInput(event.target.value);
                setLookupError(null);
                setLookupRequest(null);
              }}
            />
          </label>
          <label>
            Commitment
            <input
              value={lookupCommitmentInput}
              placeholder="0x..."
              onChange={(event) => {
                setLookupCommitmentInput(event.target.value);
                setLookupError(null);
                setLookupRequest(null);
              }}
            />
          </label>
        </div>
        <div className="actions">
          <button
            type="button"
            disabled={!publicClient || lookupIsChecking}
            onClick={runCommitmentLookup}
          >
            {lookupIsChecking ? "Checking..." : "Check commitment"}
          </button>
        </div>

        {lookupError ? <p className="notice error">{lookupError}</p> : null}
        {lookupRequest && lookupLogs.isError ? (
          <p className="notice error">{lookupLogs.error.message}</p>
        ) : null}
        {lookupRequest && lookupLogs.isSuccess ? (
          <div className="notice">
            {lookupMatches.length > 0 ? (() => {
              const first = lookupMatches[0]!;
              const multipleFrom = lookupMatches.some(
                (log) => log.from.toLowerCase() !== first.from.toLowerCase(),
              );
              const uniqueTos = [
                ...new Map(
                  lookupMatches.map((log) => [log.to.toLowerCase(), log.to] as const),
                ).values(),
              ];
              return (
                <p>
                  From: <code>{first.from}</code>
                  {multipleFrom ? " （他の送金者あり）" : null} — To:{" "}
                  {uniqueTos.length === 1 ? (
                    <code>{uniqueTos[0]}</code>
                  ) : (
                    uniqueTos.map((to, index) => (
                      <React.Fragment key={to.toLowerCase()}>
                        {index > 0 ? ", " : null}
                        <code>{to}</code>
                      </React.Fragment>
                    ))
                  )}
                </p>
              );
            })() : null}
            <p>
              Matching events: <strong>{lookupMatches.length}</strong> /{" "}
              {lookupLogs.data.length}
            </p>
            {lookupTotals.length === 0 ? (
              <p>この txId には指定 commitment の TWC イベントがありません。</p>
            ) : (
              <div className="result-list">
                {lookupTotals.map(({ token, total, count }) => {
                  const meta = lookupTokenMetadata.data?.[token.toLowerCase()];
                  return (
                    <div className="result-item" key={token.toLowerCase()}>
                      <p>
                        <span>Token address</span>
                        <code>{token}</code>
                      </p>
                      <p>
                        <span>Total amount</span>
                        <strong>
                          {meta
                            ? `${formatUnits(total, meta.decimals)} ${meta.symbol}`
                            : `${total.toString()} raw units`}
                        </strong>
                      </p>
                      <p>
                        <span>Token name</span>
                        <strong>
                          {lookupTokenMetadata.isPending
                            ? "loading..."
                            : meta
                              ? meta.name
                              : "metadata unavailable"}
                        </strong>
                      </p>
                      <p>
                        <span>Matched transfers</span>
                        <strong>{count}</strong>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function SingleOrUnifiedRows({
  mode,
  rows,
  tokenSymbol,
  tokenDecimals,
  commonMessage,
  commonRandom,
  commonCommitment,
  onAdd,
  onRemove,
  onUpdate,
  onMessage,
  onRandom,
}: {
  mode: TransferMode;
  rows: Array<TransferRow & { parsedValue: bigint | undefined; commitment: Hex }>;
  tokenSymbol: string;
  tokenDecimals: number | undefined;
  commonMessage: string;
  commonRandom: Hex;
  commonCommitment: Hex;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<TransferRow>) => void;
  onMessage: (value: string) => void;
  onRandom: () => void;
}) {
  return (
    <>
      <CommitmentCard
        title={mode === "single" ? "Commitment" : "Shared commitment"}
        message={commonMessage}
        random={commonRandom}
        commitment={commonCommitment}
        onMessage={onMessage}
        onRandom={onRandom}
      />
      <TransferRows
        rows={mode === "single" ? rows.slice(0, 1) : rows}
        tokenSymbol={tokenSymbol}
        tokenDecimals={tokenDecimals}
        showCommitment={false}
        canAdd={mode === "unified"}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
      />
    </>
  );
}

function BatchRows({
  rows,
  tokenSymbol,
  tokenDecimals,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: Array<TransferRow & { parsedValue: bigint | undefined; commitment: Hex }>;
  tokenSymbol: string;
  tokenDecimals: number | undefined;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<TransferRow>) => void;
}) {
  return (
    <TransferRows
      rows={rows}
      tokenSymbol={tokenSymbol}
      tokenDecimals={tokenDecimals}
      showCommitment
      canAdd
      onAdd={onAdd}
      onRemove={onRemove}
      onUpdate={onUpdate}
    />
  );
}

function TransferRows({
  rows,
  tokenSymbol,
  tokenDecimals,
  showCommitment,
  canAdd,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: Array<TransferRow & { parsedValue: bigint | undefined; commitment: Hex }>;
  tokenSymbol: string;
  tokenDecimals: number | undefined;
  showCommitment: boolean;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<TransferRow>) => void;
}) {
  return (
    <div className="rows">
      {rows.map((row, index) => (
        <div className="row-card" key={row.id}>
          <div className="section-title">
            <h3>Transfer #{index + 1}</h3>
            {rows.length > 1 ? (
              <button type="button" className="ghost" onClick={() => onRemove(row.id)}>
                Remove
              </button>
            ) : null}
          </div>
          <div className="grid two">
            <label>
              Recipient
              <input
                value={row.to}
                placeholder="0x..."
                onChange={(event) => onUpdate(row.id, { to: event.target.value })}
              />
            </label>
            <label>
              Value ({tokenSymbol}
              {tokenDecimals === undefined ? "" : `, decimals ${tokenDecimals}`})
              <input
                value={row.value}
                inputMode="decimal"
                onChange={(event) =>
                  onUpdate(row.id, { value: event.target.value })
                }
              />
              <span className="field-hint">
                Raw units:{" "}
                {row.parsedValue === undefined ? "invalid" : row.parsedValue.toString()}
              </span>
            </label>
          </div>
          {showCommitment ? (
            <CommitmentCard
              title="Row commitment"
              message={row.message}
              random={row.random}
              commitment={row.commitment}
              onMessage={(value) => onUpdate(row.id, { message: value })}
              onRandom={() => onUpdate(row.id, { random: randomBytes32() })}
            />
          ) : null}
        </div>
      ))}
      {canAdd ? (
        <button type="button" className="ghost" onClick={onAdd}>
          Add transfer row
        </button>
      ) : null}
    </div>
  );
}

function CommitmentCard({
  title,
  message,
  random,
  commitment,
  onMessage,
  onRandom,
}: {
  title: string;
  message: string;
  random: Hex;
  commitment: Hex;
  onMessage: (value: string) => void;
  onRandom: () => void;
}) {
  return (
    <div className="commitment">
      <div className="section-title">
        <h3>{title}</h3>
        <button type="button" className="ghost" onClick={onRandom}>
          Regenerate random
        </button>
      </div>
      <label>
        Message
        <textarea
          rows={3}
          value={message}
          onChange={(event) => onMessage(event.target.value)}
        />
      </label>
      <p>
        H(message || random): <code>{commitment}</code>
      </p>
      <p>
        random: <code>{random}</code>
      </p>
    </div>
  );
}

function useStateWithReset<T>(initial: T | (() => T)) {
  return React.useState(initial);
}
