# contracts

ERC-20の送金とともに任意のコミットメントを紐づけするためのラッパーコントラクト

実装の詳細は`./SPEC.md`

### Features

- ECDSA ERC-1271に対応したオフチェーン署名を用いて送金する`SignatureTransfer`
- オフチェーン署名が要らず`msg.sender`が送金する`SelfTransfer`
- バッチ送金
- 単一のコミットメントで複数の送金をまとめて実行

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

- `docker` と `docker compose`（v2）のみ。`forge` / `anvil` / `cast` / `slither` / `python` / `uv` などはすべてコンテナ内で解決される。
- Slither のレポートは bind mount 経由で `contracts/audit/slither/` に出力される。
- ビルド済みイメージは `foundry-slither:local`・`sdk-js-integration:local`・`sdk-rust-integration:local` のタグで再利用され、2 回目以降の起動は高速化される。
- キャッシュとボリュームを完全にクリーンする場合: `docker compose -f docker/compose.yml down -v`。

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

**Production-style (deterministic address):** use the EIP-2470 Singleton Factory (CREATE2). The expected address and frozen parameters are documented in [`TWC_CREATE2.md`](./TWC_CREATE2.md).

```shell
$ forge script script/TransferWithCommitmentCreate2.s.sol:TransferWithCommitmentCreate2Script --broadcast --rpc-url <rpc url> --private-key <your_private_key>
```

Optional env vars (see script comments): `CREATE2_SALT`, `EIP712_NAME`, `EIP712_VERSION`. Defaults must match SDKs and any off-chain EIP-712 signers.

**Local / non-deterministic:** standard create (address varies by deployer nonce):

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
