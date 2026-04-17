#!/usr/bin/env bash
# ローカルで .github/workflows/test.yml と同等の手順を実行する。
# 使い方: ./scripts/ci-local.sh
# Slither を省略: SKIP_SLITHER=1 ./scripts/ci-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export FOUNDRY_PROFILE="${FOUNDRY_PROFILE:-ci}"

echo "======== job: check (Foundry) ========"
forge --version
forge fmt --check
forge build --sizes
forge test -vvv

if [[ "${SKIP_SLITHER:-0}" == "1" ]]; then
  echo ""
  echo "SKIP_SLITHER=1 のため Slither ジョブは省略しました。"
  exit 0
fi

echo ""
echo "======== job: slither (audit bundle) ========"
if ! command -v uv >/dev/null 2>&1; then
  echo "エラー: uv が PATH にありません。https://docs.astral.sh/uv/getting-started/installation/ を参照。"
  exit 1
fi
export PATH="${HOME}/.local/bin:${PATH}"
if ! command -v slither >/dev/null 2>&1; then
  uv tool install slither-analyzer
fi
if ! command -v slither >/dev/null 2>&1; then
  echo "エラー: slither が見つかりません。~/.local/bin を PATH に含めてください。"
  exit 1
fi
chmod +x scripts/slither-report.sh
./scripts/slither-report.sh

echo ""
echo "ローカル CI 相当の手順が完了しました。"
