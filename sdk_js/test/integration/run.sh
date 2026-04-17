#!/usr/bin/env bash
# Anvil を起動 → TransferWithCommitment（forge script）と ERC20Mock（forge create）をデプロイ
# → TWC_ADDRESS / TOKEN_ADDRESS / RPC_URL を渡して結合テストを実行（README SEQUENCE に対応）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_JS="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$SDK_JS/.." && pwd)"
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
  cd "${SDK_JS}" && bun -e "
const j = await Bun.file('${BROADCAST_JSON}').json();
const t = j.transactions.find((x) => x.contractName === 'TransferWithCommitment');
if (!t?.contractAddress) throw new Error('TransferWithCommitment address not found in broadcast');
console.log(t.contractAddress);
"
)"
export TWC_ADDRESS

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

cd "${SDK_JS}"
exec bun test --preload ./test/integration/preload.ts \
  ./test/integration/selfCall.test.ts \
  ./test/integration/signatureDelegate.test.ts
