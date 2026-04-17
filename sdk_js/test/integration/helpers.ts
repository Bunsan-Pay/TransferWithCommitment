import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseAbi,
  stringToBytes,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";

/** OpenZeppelin ERC20Mock: mint + approve */
export const erc20MockAbi = parseAbi([
  "function mint(address account, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
import { anvil } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

/** Anvil 既定アカウント #0 */
export const ANVIL_SENDER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
/** Anvil 既定アカウント #1 */
export const ANVIL_EXECUTOR_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;

const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";

export function commitmentFromPayload(label: string): Hex {
  return keccak256(stringToBytes(label));
}

export function makeAnvilClients(): {
  chain: typeof anvil;
  publicClient: PublicClient;
  senderWallet: WalletClient;
  executorWallet: WalletClient;
  sender: ReturnType<typeof privateKeyToAccount>;
  executor: ReturnType<typeof privateKeyToAccount>;
} {
  const chain = {
    ...anvil,
    rpcUrls: {
      default: {
        http: [rpcUrl],
        webSocket: [rpcUrl.replace(/^http/, "ws")],
      },
    },
  } as typeof anvil;
  const transport = http(rpcUrl);
  const sender = privateKeyToAccount(ANVIL_SENDER_KEY);
  const executor = privateKeyToAccount(ANVIL_EXECUTOR_KEY);
  const publicClient = createPublicClient({ chain, transport });
  const senderWallet = createWalletClient({
    account: sender,
    chain,
    transport,
  });
  const executorWallet = createWalletClient({
    account: executor,
    chain,
    transport,
  });
  return {
    chain,
    publicClient,
    senderWallet,
    executorWallet,
    sender,
    executor,
  };
}
