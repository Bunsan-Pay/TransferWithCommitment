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

docker compose（リポジトリルートの [`docker/compose.yml`](../../docker/compose.yml)）で `anvil` を起動し、`forge script` と `forge create`（`ERC20Mock`）でデプロイした後、環境変数でアドレスを渡して SDK を実行する。`integration/preload.ts` が `config` をモックし、**テスト用チェーン**（viem の `anvil`）とデプロイ済み `TWC_ADDRESS` を注入する。

| 変数（エントリポイントが設定） | 意味 |
|-------------------------------|------|
| `TWC_ADDRESS` | デプロイ済み `TransferWithCommitment` |
| `TOKEN_ADDRESS` | デプロイ済み `ERC20Mock` |
| `RPC_URL` | 既定 `http://anvil:8545`（compose ネットワーク内のサービス名） |

前提: ホストに必要なのは **`docker` と `docker compose`（v2）のみ**。`anvil` / `forge` / `bun` などはすべてコンテナ内で解決される。

```bash
# sdk_js/ から
bun run test:integration
# 実体: bash ../scripts/test-sdk-js-integration.sh
# ルートから直接呼んでも同じ: ./scripts/test-sdk-js-integration.sh
```

シーケンスはリポジトリルート `README.md` の **Self-Call** / **Delegate to Executor** に対応するケースが `selfCall.test.ts` / `signatureDelegate.test.ts` にある。

詳細な SDK 仕様は `../SPEC.md` を参照。
