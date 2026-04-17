#!/usr/bin/env bash
# sdk_js の結合テストを docker compose 上で実行する。
# anvil サービスを起動し、contracts をデプロイした上で bun test を走らせる。
#
# 使い方:
#   ./scripts/test-sdk-js-integration.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# trap で anvil を必ず停止する（結合テストは使い捨ての compose プロジェクトでも良いが、
# 既定では compose の名前空間を再利用する）。
cleanup() {
  docker compose -f docker/compose.yml stop anvil >/dev/null 2>&1 || true
  docker compose -f docker/compose.yml rm -f anvil >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker compose -f docker/compose.yml run --rm --build sdk-js-integration
