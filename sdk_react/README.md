# eth-twc-sdk-react

[`eth-twc-sdk-js`](../sdk_js) を **wagmi v3** と **TanStack Query v5** 上で使うための React フック群です。**Vite / Next.js など、フロントのバンドラ＋ React 18/19** を想定しています。

## 前提

アプリ側で次を用意してください。

1. **`WagmiProvider`**（チェーン・トランスポート・コネクタの設定）
2. **`QueryClientProvider`**（`@tanstack/react-query`）
3. **`commitment`（`bytes32`）** — `eth-twc-sdk-js` と同様、**コミットメントを導出するヘルパは提供しない**（外部プロトコルとのスキーマの相互運用性と、ハッシュ選択の単一障害点回避のため）。利用者は **暗号学的にランダムな `r`** と **安全なハッシュ `H`** を選び、少なくとも **`commitment = H(message || r)`**（`message` はアプリのスキーマに従うバイト列）とすることを推奨する。詳細は [`sdk_js/docs/README.md`](../sdk_js/docs/README.md) の「Commitment」の節を参照。

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "./wagmiConfig";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
```

## インストール

```bash
bun add eth-twc-sdk-react eth-twc-sdk-js @tanstack/react-query wagmi viem
```

`eth-twc-sdk-react` は **peerDependencies** として `react`・`@tanstack/react-query`・`wagmi`・`viem` を要求します。アプリと同じインスタンスになるよう、バージョンはアプリ側に合わせてください。

## エクスポート

```ts
import {
  useSelfBatchTransfer,
  useSelfTransfer,
  useSelfUnifiedTransfer,
  useSendAuthorizedBatchTransfer,
  useSendAuthorizedSingleTransfer,
  useSendAuthorizedUnifiedTransfer,
  useSendCancelAuthorization,
  useSignBatchTransferWithCommit,
  useSignCancelAuthorization,
  useSignSingleTransfer,
  useSignUniCommitTransfers,
  type VerifyTransferArgs,
  useTransferWithCommitmentSentLogs,
  useVerifyTransfer,
  transferWithCommitmentAddress,
  useIsTransferWithCommitmentDeployed,
} from "eth-twc-sdk-react";
```

---

## Usage（ユースケース別）

### コントラクトアドレス・デプロイ確認

- `transferWithCommitmentAddress` — **`eth-twc-sdk-js` のリリースビルドで固定された** CREATE2 アドレス

- `useIsTransferWithCommitmentDeployed`（別名 `useIsSupportedChain`）

  接続中チェーンで canonical TWC に **`getCode` があるか**を示す hook

```tsx
import {
  transferWithCommitmentAddress,
  useIsTransferWithCommitmentDeployed,
} from "eth-twc-sdk-react";

export function NetworkBanner() {
  const deployed = useIsTransferWithCommitmentDeployed();
  return (
    <div>
      <p>Contract: {transferWithCommitmentAddress}</p>
      <p>TWC deployed on current chain: {deployed ? "yes" : "no"}</p>
    </div>
  );
}
```

### Self-Call で送金（mutation）

ウォレット接続済み・canonical TWC がデプロイ済みであることが前提です。`mutate` / `mutateAsync` に **`eth-twc-sdk-js/selfTransfer/*`** の入力型オブジェクトを渡します。

```tsx
import { useSelfTransfer } from "eth-twc-sdk-react";
import type { SelfTransferSingleArgs } from "eth-twc-sdk-js/selfTransfer/single";

export function SelfSendButton() {
  const selfTransfer = useSelfTransfer();

  async function onClick() {
    const args: SelfTransferSingleArgs = {
      /* ... */
    };
    const txHash = await selfTransfer.mutateAsync(args);
    console.log("submitted", txHash);
  }

  return (
    <button
      type="button"
      disabled={selfTransfer.isPending}
      onClick={() => void onClick()}
    >
      {selfTransfer.isPending ? "Sending…" : "Send (self-call)"}
    </button>
  );
}
```

### 署名 → 署名済みトランザクション送信（2 段 mutation）

まず `useSignSingleTransfer` で署名済みペイロードを取得し、続けて `useSendAuthorizedSingleTransfer` で送信します（他パターンは `useSign*` / `useSendAuthorized*` の組み合わせを同様に）。

```tsx
import {
  useSendAuthorizedSingleTransfer,
  useSignSingleTransfer,
} from "eth-twc-sdk-react";
import type { SignatureTransferSingleArgs } from "eth-twc-sdk-js/signatureTransfer/single";

export function SignAndSend() {
  const sign = useSignSingleTransfer();
  const send = useSendAuthorizedSingleTransfer();

  async function run() {
    const args: SignatureTransferSingleArgs = {
      /* ... */
    };
    const signed = await sign.mutateAsync(args);
    const txHash = await send.mutateAsync(signed);
    console.log(txHash);
  }

  return (
    <button
      type="button"
      disabled={sign.isPending || send.isPending}
      onClick={() => void run()}
    >
      Sign and send
    </button>
  );
}
```

### トランザクション検証（query）

`txHash` と `verify` に渡す第 3 引数が揃ったときだけフェッチします。成功時の **`data` は `null`** で、失敗時のみ `error` が入ります。

```tsx
import { useVerifyTransfer } from "eth-twc-sdk-react";
import type { Hex } from "viem";

export function VerifyPanel({ txHash }: { txHash: Hex | undefined }) {
  const args =
    txHash === undefined
      ? undefined
      : {
          from: "0x…",
          to: "0x…",
          token: "0x…",
          value: 1n,
          commitment: "0x…",
        };

  const q = useVerifyTransfer(txHash, args);

  if (q.isPending) return <p>Verifying…</p>;
  if (q.isError) return <p>Error: {q.error.message}</p>;
  if (q.isSuccess) return <p>Transfer verified.</p>;
  return null;
}
```

### レシートからイベントログ取得（query）

```tsx
import { useTransferWithCommitmentSentLogs } from "eth-twc-sdk-react";
import type { Hex } from "viem";

export function EventLogs({ txHash }: { txHash: Hex | undefined }) {
  const q = useTransferWithCommitmentSentLogs(txHash);

  if (q.isPending) return <p>Loading logs…</p>;
  if (q.isError) return <p>{q.error.message}</p>;
  return <pre>{JSON.stringify(q.data, null, 2)}</pre>;
}
```

---

## フック一覧（引数・戻り値）

型のうち `…` は TanStack Query の `UseMutationOptions` / `UseQueryOptions` で上書き可能なオプション（`mutationFn` / `queryFn` / `queryKey` を除く）を指します。

### 定数の再エクスポート（`eth-twc-sdk-js/config`）

| 名前                            | 型 / 値                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| `transferWithCommitmentAddress` | `` `0x${string}` `` — CREATE2 決定論アドレス（`twcConstants.ts`） |
| CREATE2 / EIP-712 定数 | JS SDK `config` と同じ再エクスポート |

### デプロイ確認（hook）

| フック                  | 引数 | 戻り値                                                                                                         |
| ----------------------- | ---- | -------------------------------------------------------------------------------------------------------------- |
| `useIsTransferWithCommitmentDeployed()`（別名 `useIsSupportedChain`） | なし | `boolean` — canonical TWC アドレスで `getCode` が非空なら `true`。クライアントなしは `false` |

### Self-Call 送信（`sdk_js/selfTransfer/*`）

| フック                             | 引数       | 戻り値                                                       |
| ---------------------------------- | ---------- | ------------------------------------------------------------ |
| `useSelfTransfer(options?)`        | `options?` | `UseMutationResult<Hex, Error, SelfTransferSingleArgs>`          |
| `useSelfUnifiedTransfer(options?)` | `options?` | `UseMutationResult<Hex, Error, SelfTransferUnifiedArgs>`      |
| `useSelfBatchTransfer(options?)`   | `options?` | `UseMutationResult<Hex, Error, SelfTransferBatchArgs>` |

引数型は `eth-twc-sdk-js/selfTransfer/single|batch|unified` を参照。

### 署名済み送信（`sdk_js/signatureTransfer/*/sendTx`）

| フック                                       | 引数       | 戻り値                                                         |
| -------------------------------------------- | ---------- | -------------------------------------------------------------- |
| `useSendAuthorizedSingleTransfer(options?)`  | `options?` | `UseMutationResult<Hex, Error, SignedSingleTransfer>`      |
| `useSendAuthorizedUnifiedTransfer(options?)` | `options?` | `UseMutationResult<Hex, Error, SignedUnifiedTransfer>`      |
| `useSendAuthorizedBatchTransfer(options?)`   | `options?` | `UseMutationResult<Hex, Error, SignedBatchTransfer>` |
| `useSendCancelAuthorization(options?)`       | `options?` | `UseMutationResult<Hex, Error, SignedCancelAuthorization>`     |

署名済み型は **`eth-twc-sdk-js/signatureTransfer/<variant>`** の `Signed*` と `signedDataSchema` を参照。

### 署名（`sdk_js/signatureTransfer/*/sign.ts`）

| フック                                     | 引数       | 戻り値                                                                                 |
| ------------------------------------------ | ---------- | -------------------------------------------------------------------------------------- |
| `useSignSingleTransfer(options?)`          | `options?` | `UseMutationResult<SignedSingleTransfer, Error, SignatureTransferSingleArgs>`               |
| `useSignUniCommitTransfers(options?)`      | `options?` | `UseMutationResult<SignedUnifiedTransfer, Error, SignatureTransferUnifiedArgs>`           |
| `useSignBatchTransferWithCommit(options?)` | `options?` | `UseMutationResult<SignedBatchTransfer, Error, SignatureTransferBatchArgs>` |
| `useSignCancelAuthorization(options?)`     | `options?` | `UseMutationResult<SignedCancelAuthorization, Error, CancelAuthorizationArgs>`         |

引数・戻り値の型は `eth-twc-sdk-js/signatureTransfer/<variant>` を参照。バッチでは `SignatureTransferBatchArgs` / `SignedBatchTransfer` に **`batchCommitment`** が含まれます。

### 検証・ログ（`sdk_js/verify`）

| フック                                                | 引数                                                                                                                                                                        | 戻り値                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `useVerifyTransfer(txHash, args, options?)`           | `txHash: Hex \| undefined` — 検証対象 Tx。`args: VerifyTransferArgs \| undefined` — `verify` の第3引数と同形。`options?` — `UseQueryOptions`（`queryKey` / `queryFn` 除く） | `UseQueryResult<null, Error>` — **成功時の `data` は `null`（検証失敗時のみ `error`）** |
| `useTransferWithCommitmentSentLogs(txHash, options?)` | `txHash: Hex \| undefined`。`options?`                                                                                                                                      | `UseQueryResult<Log[], Error>`                                                          |

`VerifyTransferArgs` は `Parameters<typeof verify>[2]` と同じで、`eth-twc-sdk-js/verify` の `verify` に渡すオブジェクトと一致させてください。

`txHash` または `args` が欠ける場合、`useVerifyTransfer` はクエリを `enabled: false` にし、`txHash` だけ欠ける `useTransferWithCommitmentSentLogs` も同様です。

**書き込み系**（`useMutation`）: `mutate(args)` または `mutateAsync(args)`。成功時 `data` はトランザクションハッシュ（`Hex`）。**読み取り系**（`useQuery`）: TanStack Query の `data` / `error` / `isPending` などがそのまま使えます。ウォレット未接続・`publicClient` 未取得時は、mutation / 該当 query はエラーまたは `enabled: false` になります（上表および各サンプル参照）。

---

## 開発（このリポジトリ内）

```bash
bun install
bun run typecheck
bun test
```

---

## 配布形態について

Vite / Next での利用を前提としているため、エントリは TypeScript ソース（`.ts`）です。トランスパイルしない環境では利用できません。
