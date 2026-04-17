# TransferWithCommitment JavaScript SDK — 利用者向けガイド

プロトコル全体の説明・制約・用語は、リポジトリルートの [README.md](../../README.md) を参照してください。ここでは **SDK をどう組み込むか** に絞ります。

- **パッケージ名**: `eth-twc-sdk-js`
- **ベース**: [viem](https://viem.sh/) の `PublicClient` / `WalletClient`
- **サブパス import** のみ（例: `eth-twc-sdk-js/sign`）。ルートの一括エントリはありません。

---

## プロトコル上の 2 経路（図）

ルート README の **Self-Call** と **Signature-Transfer** は、オンチェーンで呼ぶ関数が異なります。

| 経路 | 送信者の操作 | コントラクト |
|------|----------------|--------------|
| Self-Call | 自分のウォレットで `transfer(...)` を直接呼ぶ | `transfer` |
| Signature-Transfer | オフチェーンで EIP-712 署名し、**Executor** が `transferWithAuthorization(...)` を呼ぶ | `transferWithAuthorization` |

### Self-Call（概念図）

```mermaid
graph LR
    subgraph Offchain[Off-chain]
        Sender([Sender])
        Verifier([Verifier])
        Proof(Commitment<br/>generator)
    end
    subgraph Onchain[Ethereum]
        subgraph Extention[TransferWithCommitment contract]
            Access(Access / Policy)
            Commit[(Commitment<br/>registory)]
            Event(Event<br/>emission)
        end
        Token(ERC-20 Token)
        Block[(Block)]
    end
    Sender -->|Call transfer| Access
    Sender -->|"Send info<br/>(payload, nonce, TxId)"| Verifier
    Sender -->Proof
    Proof -->|Include commitment| Access
    Access -->|Store used commitment| Commit
    Access -->|Emit event| Event
    Event -->|Include to Tx| Block
    Block -->|Get Tx receipt| Verifier
    Sender -->|approve| Token
    Access -->|Call<br/>transferFrom| Token
    Verifier -->|Notice schema| Sender
```

### Signature-Transfer（概念図）

```mermaid
graph LR
    subgraph Offchain[Off-chain]
        Sender([Sender])
        Verifier([Verifier])
        Proof(Commitment<br/>generator)
        Signer(Signer)
        Executor([Executor])
    end
    subgraph Onchain[Ethereum]
        subgraph Extention[TransferWithCommitment contract]
            Access(Access / Policy<br/>)
            Commit[(Commitment<br/>registory)]
            Event(Event<br/>emission)
        end
        Token(ERC-20 Token)
        Block[(Block)]
    end
    Executor -->|Call transferWithAuthorization| Access
    Sender -->|Send metadata| Verifier
    Sender --> Proof
    Sender -->|Sign typed data| Signer
    Proof -->|Include commitment| Signer
    Signer -->|Send<br/>payload, signature| Executor
    Access -->|Store used commitment| Commit
    Access -->|Emit event| Event
    Event -->|Include to Tx| Block
    Block -->|Get Tx receipt| Verifier
    Sender -->|approve| Token
    Access -->|EIP-712 digest +<br/>SignatureChecker| Access
    Access -->|Call<br/>transferFrom| Token
    Verifier -->|Notice schema| Sender
```

---

## 想定する操作と使用例

以下は **SDK がカバーする役割** を示す最小例です。`commitment` の作り方（ペイロードと nonce のハッシュ等）はアプリのスキーマに依存するため、例ではプレースホルダとしています。

### 共通の前提

1. **`config.transferWithCommitmentAddress`** を、デプロイ済み `TransferWithCommitment` のアドレスに設定する（ゼロアドレスのままでは API が失敗します）。ビルド時置換やフォークした `config` の利用も可です。
2. **`PublicClient` / `WalletClient` の `chain` が `supportedChains` に含まれる**こと（[設定](#設定-config)参照）。
3. ERC-20 について、**送信者が TWC コントラクトに `approve` 済み**であること（ルート README のシーケンスどおり、通常は一度限りの十分な額）。

```typescript
import { createPublicClient, createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// 例: クライアント作成（実際の RPC・鍵は環境に合わせてください）
const publicClient = createPublicClient({ chain: mainnet, transport: http() });
const account = privateKeyToAccount("0x…");
const walletClient = createWalletClient({ account, chain: mainnet, transport: http() });
```

---

### 1. Self-Call — 送信者が自分で `transfer` を送る

ルート README の **Self-Call** シーケンスに対応します。**EIP-712 署名は不要**です。`sendTransaction/selfTransfer` の `transfer` がコントラクトの `transfer(token, to, value, commitment)` に相当します。

```typescript
import { transfer } from "eth-twc-sdk-js/sendTransaction/selfTransfer";
import { verify } from "eth-twc-sdk-js/verify";
import type { Hex } from "viem";

const token = "0x…" as Hex;
const to = "0x…" as Hex;
const value = 1_000_000n;
const commitment = "0x…" as Hex; // アプリのスキーマに従って算出

const txHash = await transfer(publicClient, walletClient, account.address, {
  token,
  to,
  value,
  commitment,
});

await publicClient.waitForTransactionReceipt({ hash: txHash });

await verify(publicClient, txHash, {
  from: account.address,
  token,
  to,
  value,
  commitment,
});
```

**バッチ・Unified** も同様に、同モジュールの `batchTransfer` / `unifiedTransfer` でコントラクトのオーバーロードに対応します（引数の形は `types/args/selfTransfer` を参照）。

---

### 2. Delegate to Executor — 署名して Executor が `transferWithAuthorization`

ルート README の **Delegate to Executor** に対応します。

1. **送信者**が `sign` で EIP-712 署名済みバンドル（`Signed*`）を取得する。
2. **Executor**（別アドレス）が `sendTransaction/signatureTransfer` でトランザクションを送信する（ガスは Executor 負担）。
3. 検証者はトランザクションハッシュと期待パラメータで `verify` する。

```typescript
import { singleTransfer as signSingleTransfer } from "eth-twc-sdk-js/sign";
import { singleTransfer as sendAuthorizedSingle } from "eth-twc-sdk-js/sendTransaction/signatureTransfer";
import { verify } from "eth-twc-sdk-js/verify";
import type { Hex } from "viem";

// --- 送信者側: 署名（Signer の account は EIP-712 の from と一致させる） ---
const signed = await signSingleTransfer(
  publicClient,
  senderWallet,
  sender.address,
  {
    from: sender.address,
    to: recipient,
    token,
    executor: executor.address, // オンチェーンで許可する実行者
    value,
    commitment,
  },
);

// --- Executor 側: オンチェーン送信 ---
const txHash = await sendAuthorizedSingle(
  publicClient,
  executorWallet,
  executor.address,
  signed,
);

await publicClient.waitForTransactionReceipt({ hash: txHash });

await verify(publicClient, txHash, {
  from: sender.address,
  token,
  to: recipient,
  value,
  commitment,
});
```

`uniCommitTransfers` / `batchTransferWithCommit` に対応する署名・送信も、それぞれ `sign` と `sendTransaction/signatureTransfer` の同名関数で行います。

---

### 3. One-Time Receive-Verify（Verifier が executor）

ルート README の **OneTime Receive-Verify** は、署名メッセージの **`executor` を Verifier（検証者）自身のアドレスに固定**し、Verifier のウォレットで `transferWithAuthorization` を呼ぶパターンです。SDK の API は **§2 と同じ**で、`executor` と `sendTransaction` に使う `WalletClient` を Verifier に揃えます。

---

## 設定 (`config`)

| エクスポート | 説明 |
|--------------|------|
| `transferWithCommitmentAddress` | デプロイ済みコントラクトアドレス。**ゼロアドレスでは各 API が `assertTransferContractConfigured` で失敗**します。 |
| `supportedChains` | 対応チェーンの配列（viem の chain 定義）。 |
| `ZERO_TRANSFER_ADDRESS` | 未設定を表すゼロアドレス定数。 |
| `assertTransferContractConfigured()` | アドレスが設定済みか検査（各 API 内部でも使用）。 |

```typescript
import {
  transferWithCommitmentAddress,
  supportedChains,
} from "eth-twc-sdk-js/config";
```

---

## API リファレンス

### `eth-twc-sdk-js/sign`

送信者ウォレットで **EIP-712 署名**を行い、`Signed*` 型のバンドルを返します。事前に `getEip712Domain` で domain を取得し、OpenZeppelin EIP712 と整合するよう **ゼロの `salt` は署名用 domain から除いたうえで**署名します（戻り値の `domain` も同じ正規化後）。各関数は **`types/args/signatureTransfer` の arktype で `args` を実行時検証**し、`validAfter` / `validBefore` は **`args` 内**で指定します（省略時は **`0n`** と **`UINT256_MAX`**）。続けて **`account`（`signTypedData` に渡す署名者）が、メッセージの `from`（単一・Uni・バッチ）または `authorizer`（キャンセル）と一致するか**を検証します（アドレスの大小文字は区別しません）。不一致のままではオンチェーンの署名検証で失敗するため、**署名前に例外**にします。検証後のオブジェクト（デフォルト適用済み）で `signTypedData` と戻り値を組み立てます。

| 関数 | 概要 |
|------|------|
| `singleTransfer(publicClient, wallet, account, args)` | 単一送金の署名。`args` に `from`, `to`, `token`, `executor`, `value`, `commitment` に加え、任意で `validAfter`, `validBefore`（省略時は上記デフォルト）。`validAfter <= validBefore` が必須。 |
| `uniCommitTransfers(...)` | 複数 `TransferDetail` を 1 コミットメントにまとめる署名。明細は **1 件以上**、時間窓は上記と同様。 |
| `batchTransferWithCommit(...)` | 明細ごとにコミットメントを持つバッチの署名。明細は **1 件以上**、時間窓は上記と同様。 |
| `cancelAuthorization(...)` | 承認キャンセル用の署名。 |

引数型は `eth-twc-sdk-js/types/args/signatureTransfer`、戻り値の型は `eth-twc-sdk-js/types/signedData` を参照してください。

---

### `eth-twc-sdk-js/sendTransaction/selfTransfer`

送信者が **自分で** `transfer` を呼ぶ経路（Self-Call）。先に **`types/args/selfTransfer` の arktype で `args` を実行時検証**し、その後 `simulateContract` → `writeContract`。

| 関数 | コントラクト |
|------|----------------|
| `transfer` | `transfer(token, to, value, commitment)` |
| `unifiedTransfer` | `transfer(details, commitment)` |
| `batchTransfer` | `transfer(details)` |

引数型: `eth-twc-sdk-js/types/args/selfTransfer`。Uni / バッチで **空の `details`** を渡すと、スキーマでは弾かずコントラクト側で失敗しうる点に注意（署名用 `types/args/signatureTransfer` とは異なる）。

---

### `eth-twc-sdk-js/sendTransaction/signatureTransfer`

**Executor**（`WalletClient`）が `transferWithAuthorization` / `cancelAuthorization` を呼ぶ経路。署名済みバンドルの `domain` がクライアントのチェーンおよび `config` のコントラクトアドレスと一致することを検証します。バンドル本体の **arktype 検証はモジュール内では行わない**（`types/signedData` をオフチェーンで検証したい場合は呼び出し側で利用）。

| 関数 | コントラクト |
|------|----------------|
| `singleTransfer` | `transferWithAuthorization`（単一送金） |
| `unifiedTransfer` | 同上（Unified） |
| `batchTransfer` | 同上（バッチ） |
| `cancelAuthorization` | `cancelAuthorization` |

---

### `eth-twc-sdk-js/verify`

| 関数 | 説明 |
|------|------|
| `verify(publicClient, txHash, args)` | `args` を arktype（`verifyArgs.assert`）で検証したうえで、レシートから `TransferWithCommitmentSent` を抽出し、**ペイロードが `args` と一致し**、かつ **`config.transferWithCommitmentAddress` から発火したログ**が少なくとも 1 件あることを確認。満たさなければ例外。 |
| `getTransferWithCommitmentSentEventLogs(publicClient, txHash)` | レシートから `TransferWithCommitmentSent` をパースし、**同じく当該コントラクトアドレス由来のログだけ**を返す。内容による `args` 照合は行わない。**該当なしは空配列**（例外にしない）。トランザクションハッシュだけ分かっているときの列挙用。 |

**注意**: 検証は RPC が返すレシートに依存します。信頼できる RPC・確定ブロック数などは運用で担保してください（[sdk_js/README.md](../README.md) のセキュリティ節）。

---

### `eth-twc-sdk-js/utils`

| 関数 | 説明 |
|------|------|
| `isSupportedChain(client)` | クライアントの `chain.id` が `supportedChains` に含まれるか。 |
| `chainIdToBig(id)` | `number` / `bigint` を `bigint` に統一。 |
| `assertPublicWalletSameSupportedChain(publicClient, wallet)` | 両方が対応チェーンかつ **同一 chain id** か。`sign` や `sendTransaction/*` が内部で利用。 |
| `assertSignedDomainMatchesClientAndConfig(publicClient, domain, configuredContract)` | 署名バンドルの `domain.chainId` / `verifyingContract` がクライアントと `config` と一致するか。`signatureTransfer` が内部で利用。 |

---

### 型・ABI（`eth-twc-sdk-js/types/*`）

| サブパス | 内容 |
|----------|------|
| `types/signedData` | EIP-712 署名済みバンドル（`SignedTransferWithCommit` 等）と `Eip712SignedDomain`。 |
| `types/args/signatureTransfer` | 署名入力（Executor 等を含む）。 |
| `types/args/selfTransfer` | Self-Call 用 `transfer` 引数（`from` なし）。 |
| `types/transferDetail` | `TransferDetail` / `CommittedTransferDetail`。 |
| `types/Eip712Type` | viem の `signTypedData` 用 types 定義。 |
| `types/abi` | `TransferWithCommitment` の ABI。 |
| `types/utils` | arktype 用スカラー型・`UINT256_MAX` 等。`uint256` は `0n`〜`UINT256_MAX` の範囲。`bytes` は ERC-1271 等を考慮し署名長を厳密には限定しない。 |

---

## 関連ドキュメント

- [sdk_js/README.md](../README.md) — インストール・設定・セキュリティ注意
- [sdk_js/SPEC.md](../SPEC.md) — 型・EIP-712・コントラクトとの対応の詳細
- [リポジトリルート README.md](../../README.md) — プロトコル要件・シーケンス図
