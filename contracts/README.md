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

### CI をローカルで再現（docker compose）

ホストに `forge` / `slither` / `python` / `uv` を直接インストールする代わりに、
リポジトリルートの [`docker/compose.yml`](../docker/compose.yml) が提供する隔離コンテナ上で
`.github/workflows/contracts-ci.yml` と同一の手順を実行する。

```shell
# リポジトリルートから:
$ ./scripts/ci-contracts.sh                 # forge fmt/build/test + slither
$ SKIP_SLITHER=1 ./scripts/ci-contracts.sh  # Foundry ジョブのみ
$ ./scripts/slither.sh                      # Slither 監査バンドルのみ
```

- **前提**: `docker` と `docker compose`（v2）のみ。`forge` / `anvil` / `cast` / `slither` / `python` / `uv` などはすべてコンテナ内で解決される。
- Slither のレポートは bind mount 経由で `contracts/audit/slither/` に出力される。
- ビルド済みイメージは `foundry-slither:local`・`sdk-js-integration:local`・`sdk-rust-integration:local` のタグで再利用され、2 回目以降の起動は高速化される。
- キャッシュとボリュームを完全にクリーンする場合: `docker compose -f docker/compose.yml down -v`。

GitHub Actions 側（[.github/workflows/contracts-ci.yml](../.github/workflows/contracts-ci.yml)）も同じ compose サービスを呼び出すため、ローカルと CI のフローは完全に同じ。

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

Slither はリポジトリルートの [`docker/compose.yml`](../docker/compose.yml) が提供する隔離コンテナ内で実行する（ホスト側の Python / uv / slither インストールは不要）。

```shell
# リポジトリルートから:
$ ./scripts/slither.sh
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
