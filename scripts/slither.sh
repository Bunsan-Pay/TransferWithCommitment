#!/usr/bin/env bash
# Slither 監査バンドルを docker compose 上で生成する。
# 出力先はホストの contracts/audit/slither/（bind mount 経由）。
#
# 使い方:
#   ./scripts/slither.sh
#   STRICT_SLITHER_EXIT=1 ./scripts/slither.sh  # Slither の終了コードを返す
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV_ARGS=()
if [[ "${STRICT_SLITHER_EXIT:-}" != "" ]]; then
  ENV_ARGS+=(-e "STRICT_SLITHER_EXIT=${STRICT_SLITHER_EXIT}")
fi

exec docker compose -f docker/compose.yml run --rm --build "${ENV_ARGS[@]}" slither
