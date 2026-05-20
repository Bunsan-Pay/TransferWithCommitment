# Slither 静的解析（監査提出用）

このディレクトリには **Slither** の実行結果を保存し、Web3 監査企業へ提出する際の根拠資料として使います。

## 再生成

リポジトリルートで:

```bash
./scripts/slither-report.sh
# または
npm run slither:report
```

前提: `forge`、`slither` が PATH にあること。Slither の例（[uv](https://docs.astral.sh/uv/)）:

```bash
uv tool install slither-analyzer
# 通常は ~/.local/bin に入るので PATH を通す
```

詳細は [Crytic / Slither](https://github.com/crytic/slither) も参照。

検出があると Slither は非ゼロ終了することがあります。スクリプトは **レポートを書き出したうえで既定では 0 で終了**します。Slither の終了コードをそのまま返したい場合:

```bash
STRICT_SLITHER_EXIT=1 ./scripts/slither-report.sh
```

## ファイル一覧

| ファイル               | 内容                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| `REPORT_META.txt`      | 実行日時（UTC）、`forge` / `slither` のバージョン、スコープ説明、終了コード |
| `slither-report.txt`   | Slither の標準テキスト出力（detector 一覧）                                 |
| `slither-checklist.md` | `--checklist` による Markdown チェックリスト                                |
| `slither-report.json`  | JSON（ツール連携・差分管理用）                                              |
| `slither-report.sarif` | SARIF（GitHub Advanced Security / IDE 連携用）                              |

## スコープ

- プロジェクト本体の `src/` `test/` `script/` に対する検出が中心です。

- **依存ライブラリの除外**

  依存ライブラリ（`lib/` 配下の OpenZeppelin・forge-std 等）は、 `.slither.config.json` およびスクリプト内の `filter_paths` により **detector 結果から除外**しています。

## 偽陽性

- **arbitrary-send-erc20(High)**

  `SignatureTransfer._transfer` が `from` を任意に指定した `safeTransferFrom` を呼ぶのは、**EIP-712 署名で当該 `from` が執行を認可している** ことを `SignatureChecker.isValidSignatureNow(from, digest, signature)` で検証済みだからです。これは Permit2 / EIP-3009 と同じ構造で、正当な設計です。

## 終了コード

検出があると Slither は **0 以外**で終了することがあります。`scripts/slither-report.sh` はそれでも **レポートをファイルに書き出したうえで** 終了コードを返します。提出前に `slither-report.txt` または `slither-checklist.md` を確認してください。

## CI

モノレポの場合はリポジトリルートの `.github/workflows/contracts-ci.yml` の **Slither** ジョブで同様の解析を実行し、成果物をアーティファクトとして保存できます（`contracts/` 変更時の PR / push、または手動の `workflow_dispatch`）。
