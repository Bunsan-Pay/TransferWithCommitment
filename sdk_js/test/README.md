# `sdk_js` テスト

## 単体（`unit/`）

`config.ts` がゼロアドレスのまま検証するファイルと、`config` をモックするファイルを **分けて実行**する（`mock.module` が遅いと `config` が先にキャッシュされ、モックが効かないため）。

- **第 1 段**（本番 `config`）: `config.test.ts`, `utils.test.ts`, `verify.test.ts`
- **第 2 段**（`--preload`）: `preload.ts` が `config.ts` を非ゼロの `transferWithCommitmentAddress` に差し替え、`sign.test.ts`, `selfTransfer.test.ts`, `signatureTransfer.test.ts` を実行

`package.json` の `test` スクリプトが上記の順で `bun test` を呼ぶ。

```bash
bun run test
```

## 結合（`integration/`）

Anvil を起動し、Foundry で `TransferWithCommitment`（`forge script` の `TransferWithCommitmentScript`）と `ERC20Mock`（`forge create --broadcast`）をデプロイしたあと、環境変数経由でアドレスを渡して SDK を実行する。**本番 `config` の `supportedChains` には Anvil（chain id 31337）が含まれない**ため、`integration/preload.ts` が `config` をモックし、`supportedChains: [anvil]`（viem の `anvil` チェーン定義）とデプロイ済みの `TWC_ADDRESS` を注入する。

| 変数（`run.sh` が設定） | 意味 |
|------------------------|------|
| `TWC_ADDRESS` | デプロイ済み `TransferWithCommitment` |
| `TOKEN_ADDRESS` | デプロイ済み `ERC20Mock` |
| `RPC_URL` | 既定 `http://127.0.0.1:8545`（`ANVIL_PORT` でポート変更可） |

前提: PATH に **`anvil`** と **`forge`**（Foundry）があること。`forge` は `--root` にリポジトリの `contracts/` を指定してビルド成果物を解決する。

```bash
bun run test:integration
# 実体: bash test/integration/run.sh
```

シーケンスはリポジトリルート `README.md` の **Self-Call** / **Delegate to Executor** に対応するケースが `selfCall.test.ts` / `signatureDelegate.test.ts` にある。

詳細な SDK 仕様は `../SPEC.md` を参照。
