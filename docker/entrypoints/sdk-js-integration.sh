#!/usr/bin/env bash
# docker compose 経由で anvil サービスに接続し、
# contracts を forge script / forge create でデプロイしたうえで
# sdk_js の結合テストを実行する。
set -euo pipefail

CONTRACTS="/work/contracts"
SDK_JS="/work/sdk_js"
REPO_ROOT="/work"

RPC_URL="${RPC_URL:-http://anvil:8545}"
# Anvil 既定アカウント #0
KEY="${ANVIL_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

echo "==> RPC: ${RPC_URL}"

# Anvil の起動完了を改めて確認（depends_on healthcheck と二重の保険）。
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

# ワークスペース依存をインストール（named volume にキャッシュされるので 2 回目以降は
# ほぼキャッシュヒットで完了する）。空のマウント状態と install 済み状態を安全に
# 見分けるのは難しいため、毎回 `bun install --frozen-lockfile` を走らせる。
echo "==> bun install (workspace)"
cd "${REPO_ROOT}"
bun install --frozen-lockfile

cd "${SDK_JS}"
exec bun test --preload ./test/integration/preload.ts \
  ./test/integration/selfCall.test.ts \
  ./test/integration/signatureDelegate.test.ts
