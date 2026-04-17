#!/usr/bin/env bash
# contracts の CI 相当（forge fmt/build/test + slither）を docker compose 上で実行する。
# ホストに forge / anvil / slither / python などをインストールする必要はない。
#
# 使い方:
#   ./scripts/ci-contracts.sh
#   SKIP_SLITHER=1 ./scripts/ci-contracts.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV_ARGS=()
if [[ "${SKIP_SLITHER:-}" != "" ]]; then
  ENV_ARGS+=(-e "SKIP_SLITHER=${SKIP_SLITHER}")
fi
if [[ "${FOUNDRY_PROFILE:-}" != "" ]]; then
  ENV_ARGS+=(-e "FOUNDRY_PROFILE=${FOUNDRY_PROFILE}")
fi

exec docker compose -f docker/compose.yml run --rm --build "${ENV_ARGS[@]}" contracts-ci
