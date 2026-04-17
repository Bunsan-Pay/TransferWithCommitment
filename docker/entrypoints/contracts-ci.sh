#!/usr/bin/env bash
# コンテナ内で .github/workflows/contracts-ci.yml 相当を実行する。
# 使い方: docker compose -f docker/compose.yml run --rm contracts-ci
# Slither を省略: docker compose -f docker/compose.yml run --rm -e SKIP_SLITHER=1 contracts-ci
set -euo pipefail

cd /work/contracts

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
bash /opt/entrypoints/slither-report.sh

echo ""
echo "ローカル CI 相当の手順が完了しました。"
