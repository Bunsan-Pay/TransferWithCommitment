#!/usr/bin/env bash
# sdk_rust の結合テストを docker compose 上で実行する。
# anvil サービスを起動し、contracts をデプロイした上で cargo test を走らせる。
#
# 使い方:
#   ./scripts/test-sdk-rust-integration.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

cleanup() {
  docker compose -f docker/compose.yml stop anvil >/dev/null 2>&1 || true
  docker compose -f docker/compose.yml rm -f anvil >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker compose -f docker/compose.yml run --rm --build sdk-rust-integration
