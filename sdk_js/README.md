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

サブパス import（例: `eth-twc-sdk-js/sign`）を利用する。ルートの一括エントリはない。

利用者向けの操作例・API 一覧は **[docs/README.md](./docs/README.md)** を参照。

## 設定

- **`config.transferWithCommitmentAddress`** をデプロイ済みコントラクトアドレスに設定すること。ゼロアドレスのままでは `assertTransferContractConfigured` により署名・送信・検証 API が失敗する。
- 対応チェーンは `config.supportedChains` で列挙。ここに無いチェーンでは `isSupportedChain` が偽となる。

## セキュリティ・限界（オフチェーン検証）

- **`verify`** はレシート上の `TransferWithCommitmentSent` が **`args` と一致し**、かつ **`config` のコントラクトから発火したログ**であることを確認する。**`getTransferWithCommitmentSentEventLogs`** は当該コントラクト由来のログだけを返す（ハッシュのみ分かる場合の列挙用）。いずれも RPC から取得したレシートに依存する。悪意ある RPC、チェーンの取り違え、未確定ブロック／リオーグはこの SDK 単体では防げない。必要に応じて信頼できるエンドポイントや確定数を運用で担保すること。
- 詳細な型・前提はリポジトリ内の `SPEC.md` を参照。
