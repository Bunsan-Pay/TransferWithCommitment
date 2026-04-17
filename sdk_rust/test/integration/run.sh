#!/usr/bin/env bash
# Anvil 起動 → TransferWithCommitment（forge script）+ ERC20Mock（forge create）→ 結合テスト
# Anvil 起動 → forge で TWC / ERC20Mock デプロイ → `ETH_TWC_CONTRACT_ADDRESS` 等を渡して結合テスト。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_RUST="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$SDK_RUST/.." && pwd)"
CONTRACTS="$REPO_ROOT/contracts"
ROOT="$CONTRACTS"
ANVIL_PORT="${ANVIL_PORT:-8545}"
RPC_URL="${RPC_URL:-http://127.0.0.1:${ANVIL_PORT}}"
KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

command -v anvil >/dev/null 2>&1 || {
  echo "anvil (Foundry) が PATH にありません" >&2
  exit 1
}
command -v forge >/dev/null 2>&1 || {
  echo "forge (Foundry) が PATH にありません" >&2
  exit 1
}
command -v python3 >/dev/null 2>&1 || {
  echo "python3 が PATH にありません（broadcast から TWC アドレス取得に使用）" >&2
  exit 1
}

anvil --host 127.0.0.1 --port "${ANVIL_PORT}" >/dev/null 2>&1 &
ANVIL_PID=$!
trap 'kill "${ANVIL_PID}" 2>/dev/null || true' EXIT
sleep 1.5

forge script "${CONTRACTS}/script/TransferWithCommitment.s.sol:TransferWithCommitmentScript" \
  --root "${ROOT}" \
  --rpc-url "${RPC_URL}" \
  --broadcast \
  --private-key "${KEY}"

BROADCAST_JSON="${CONTRACTS}/broadcast/TransferWithCommitment.s.sol/31337/run-latest.json"
TWC_ADDRESS="$(
  python3 -c "
import json
with open('${BROADCAST_JSON}') as f:
    j = json.load(f)
for t in j['transactions']:
    if t.get('contractName') == 'TransferWithCommitment':
        print(t['contractAddress'])
        break
else:
    raise SystemExit('TransferWithCommitment address not found in broadcast')
"
)"
export TWC_ADDRESS
export ETH_TWC_CONTRACT_ADDRESS="${TWC_ADDRESS}"

FORGE_OUT="$(
  forge create lib/openzeppelin-contracts-upgradeable/lib/openzeppelin-contracts/contracts/mocks/token/ERC20Mock.sol:ERC20Mock \
    --root "${ROOT}" \
    --rpc-url "${RPC_URL}" \
    --private-key "${KEY}" \
    --broadcast 2>&1
)"
TOKEN_ADDRESS="$(echo "${FORGE_OUT}" | grep "Deployed to:" | awk '{print $3}')"
if [[ -z "${TOKEN_ADDRESS}" ]]; then
  echo "${FORGE_OUT}" >&2
  echo "ERC20Mock のデプロイアドレスを取得できませんでした" >&2
  exit 1
fi
export TOKEN_ADDRESS
export RPC_URL

cd "${SDK_RUST}"
exec cargo test --features integration-test --test anvil_integration -- --include-ignored --nocapture
