# eth-twc-sdk-js

`TransferWithCommitment` 向けの TypeScript / JavaScript SDK（viem ベース）。

## インストール

```bash
bun add eth-twc-sdk-js
```

## 開発

```bash
bun install
bun run build
```

サブパス import（例: `eth-twc-sdk-js/signatureTransfer/single`、`eth-twc-sdk-js/selfTransfer/single`）を利用する。ルートの一括エントリはない。

利用者向けの操作例・API 一覧は **[docs](https://bunsan-pay.github.io/TransferWithCommitment/sdk-js)** を参照。

## 設定

- **`config.transferWithCommitmentAddress`** — CREATE2 **決定論アドレス**（`twcConstants.ts` / `contracts/TWC_CREATE2.md` と一致）。接続チェーンでこのアドレスに **コントラクトが無い**場合、`eth_getCode` により署名・送信・検証前に失敗します。wagmi の `chains` に載せる `chain` 定義は **アプリ側で** `viem/chains` 等から選んでください（SDK はチェーン allowlist を持ちません）。

## セキュリティ・限界（オフチェーン検証）

- **`verify`** はレシート上の `TransferWithCommitmentSent` が **`args` と一致し**、かつ **`config` のコントラクトから発火したログ**であることを確認する。**`getTransferWithCommitmentSentEventLogs`** は当該コントラクト由来のログだけを返す（ハッシュのみ分かる場合の列挙用）。いずれも RPC から取得したレシートに依存する。悪意ある RPC、チェーンの取り違え、未確定ブロック／リオーグはこの SDK 単体では防げない。必要に応じて信頼できるエンドポイントや確定数を運用で担保すること。
- 詳細な型・前提はリポジトリ内の `SPEC.md` を参照。
