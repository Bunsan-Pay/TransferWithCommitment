#!/usr/bin/env bash
# 監査提出用: Slither の結果を audit/slither/ に保存する。
# 使い方: ./scripts/slither-report.sh   （リポジトリルートからでも可）
# Slither 例: uv tool install slither-analyzer（~/.local/bin を PATH に）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
OUT_DIR="${ROOT}/audit/slither"
mkdir -p "$OUT_DIR"

echo "==> forge build"
forge build -q

META="${OUT_DIR}/REPORT_META.txt"
{
  echo "=== Slither 静的解析バンドル（監査提出用） ==="
  echo "生成日時 (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""
  echo "=== 環境 ==="
  command -v forge >/dev/null && forge --version | head -1 || echo "forge: not found"
  command -v slither >/dev/null && slither --version || echo "slither: not found"
  echo ""
  echo "=== スコープ ==="
  echo "- detector 結果から lib/ を除外（.slither.config.json の filter_paths および CLI の --filter-paths と一致）。"
  echo "- OpenZeppelin / forge-std 由来のノイズを除き、src/・test/・script/ 配下の検出に焦点を当てる。"
  echo "- 終了コード: 検出ありの場合 Slither は 0 以外になることがある（JSON/テキストは出力済み）。"
} | tee "$META"

SLITHER_EXIT=0
SLITHER_ARGS=(--filter-paths "lib/")

echo ""
echo "==> slither（JSON / SARIF / 人間可読ログ）"
set +e
slither . "${SLITHER_ARGS[@]}" \
  --json "${OUT_DIR}/slither-report.json" \
  --sarif "${OUT_DIR}/slither-report.sarif" \
  >"${OUT_DIR}/slither-report.txt" 2>&1
SLITHER_EXIT=$?
set -e

echo ""
echo "==> slither --checklist（Markdown）"
set +e
slither . "${SLITHER_ARGS[@]}" --checklist \
  >"${OUT_DIR}/slither-checklist.md" 2>&1
set -e

{
  echo ""
  echo "=== 直近の Slither 終了コード ==="
  echo "${SLITHER_EXIT}"
} >>"$META"

echo ""
echo "出力先: ${OUT_DIR}/"
echo "  - REPORT_META.txt       … 実行時刻・バージョン・スコープ説明"
echo "  - slither-report.txt    … 標準の人間可読レポート"
echo "  - slither-checklist.md  … Markdown チェックリスト（提出用）"
echo "  - slither-report.json   … 機械可読（ツール連携）"
echo "  - slither-report.sarif  … SARIF（IDE / GitHub 等）"

if [[ "${SLITHER_EXIT}" -ne 0 ]]; then
  echo ""
  echo "注意: Slither が非ゼロで終了しました（検出あり、または警告）。レポートは保存済みです。"
  # 監査バンドル生成自体は完了しているため、既定では 0 で終了（CI / 手元の再実行でアーティファクト保存しやすくする）
  # 厳密に Slither の終了コードを返したい場合: STRICT_SLITHER_EXIT=1 ./scripts/slither-report.sh
  if [[ "${STRICT_SLITHER_EXIT:-0}" == "1" ]]; then
    exit "${SLITHER_EXIT}"
  fi
fi
