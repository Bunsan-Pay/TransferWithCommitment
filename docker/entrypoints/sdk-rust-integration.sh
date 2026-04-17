#!/usr/bin/env bash
# docker compose 経由で anvil サービスに接続し、
# contracts を forge script / forge create でデプロイしたうえで
# sdk_rust の結合テストを実行する。
set -euo pipefail

CONTRACTS="/work/contracts"
SDK_RUST="/work/sdk_rust"

RPC_URL="${RPC_URL:-http://anvil:8545}"
# Anvil 既定アカウント #0
KEY="${ANVIL_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

echo "==> RPC: ${RPC_URL}"

for _ in $(seq 1 30); do
  if cast block-number --rpc-url "${RPC_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> forge script: TransferWithCommitment"
forge script "${CONTRACTS}/script/TransferWithCommitment.s.sol:TransferWithCommitmentScript" \
  --root "${CONTRACTS}" \
  --rpc-url "${RPC_URL}" \
  --broadcast \
  --private-key "${KEY}"

BROADCAST_JSON="${CONTRACTS}/broadcast/TransferWithCommitment.s.sol/31337/run-latest.json"
TWC_ADDRESS="$(
  jq -er '
    .transactions[]
    | select(.contractName == "TransferWithCommitment")
    | .contractAddress
  ' "${BROADCAST_JSON}" | head -n1
)"
if [[ -z "${TWC_ADDRESS}" ]]; then
  echo "TransferWithCommitment address not found in ${BROADCAST_JSON}" >&2
  exit 1
fi
export TWC_ADDRESS
export ETH_TWC_CONTRACT_ADDRESS="${TWC_ADDRESS}"

echo "==> forge create: ERC20Mock"
FORGE_OUT="$(
  forge create lib/openzeppelin-contracts-upgradeable/lib/openzeppelin-contracts/contracts/mocks/token/ERC20Mock.sol:ERC20Mock \
    --root "${CONTRACTS}" \
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

echo "TWC_ADDRESS=${TWC_ADDRESS}"
echo "TOKEN_ADDRESS=${TOKEN_ADDRESS}"

cd "${SDK_RUST}"
exec cargo test --features integration-test --test anvil_integration -- --include-ignored --nocapture
