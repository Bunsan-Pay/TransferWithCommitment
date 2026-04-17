# contracts

送金とともに任意のコミットメントを紐づけするためのラッパーコントラクト

### Features

- 任意のcommitmentをオンチェーンで結びつけた送金、commitmentの生成schemaと元データとtxidを知る者のみが検証できる
- 各送金情報ごとにcommitmentを含めるバッチ送金
- 複数の送金情報にまとめて一つのcommitmentに結びつけるUnifiedTransfers

### Requirements

- 送金者の署名は1回だけ
- 送金情報と任意のコミットメントを含めたイベントを発行すること
- コミットメントには唯一性があること
- schemaと元データとtxidを知る者ならばいつでも検証可能であること

### Constraints

- ECDSAの利用を害さず、耐量子暗号への移行に対応可能であること
- 資金決済法上の交換業や電取業などに抵触しないこと
  - 他人のために他人の資産をカストディしない
  - 暗号資産や電子決済手段の売買をしない
  - 投資勧誘や取引の斡旋をしない

## Development

### CI をローカルで再現

**モノレポ**（Git のルートが親で、`foundry.toml` はこの `contracts/` にだけある）の場合、GitHub Actions の定義は **リポジトリルート**の `.github/workflows/contracts-ci.yml` にあり、`contracts/` を `working-directory` にして実行する。

手元で同じ手順をまとめたスクリプト（このディレクトリから実行）:

```shell
$ chmod +x scripts/ci-local.sh
$ ./scripts/ci-local.sh
```

- **前提**: `forge`、[uv](https://docs.astral.sh/uv/getting-started/installation/)（Slither ジョブ用）
- Slither まで試さず Foundry のみ: `SKIP_SLITHER=1 ./scripts/ci-local.sh`

ルートから実行する例: `./contracts/scripts/ci-local.sh`

YAML そのものを Docker で動かす場合は [nektos/act](https://github.com/nektos/act)（リポジトリルートで `act -j check -W .github/workflows/contracts-ci.yml` など）も利用できる。

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/TransferWithCommitment.s.sol:TransferWithCommitmentScript --broadcast --rpc-url <chain name or rpc url> --private-key <your_private_key>
```

### Slither（監査提出用レポート）

依存: [Slither](https://github.com/crytic/slither) を PATH に入れる（例: [uv](https://docs.astral.sh/uv/) で `uv tool install slither-analyzer`。`~/.local/bin` を PATH に含める）。

```shell
$ ./scripts/slither-report.sh
```

結果は `audit/slither/` に保存（`audit/slither/README.md` 参照）。リポジトリルートの `.github/workflows/contracts-ci.yml` の **Slither** ジョブでも同バンドルを Artifact として保存できます。

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
