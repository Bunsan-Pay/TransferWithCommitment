import { mock } from "bun:test";
import type { SignedBatchTransfer } from "eth-twc-sdk-js/signatureTransfer/batch";
import type { SignedCancelAuthorization } from "eth-twc-sdk-js/signatureTransfer/cancelAuthorization";
import type { SignedSingleTransfer } from "eth-twc-sdk-js/signatureTransfer/single";
import type { SignedUnifiedTransfer } from "eth-twc-sdk-js/signatureTransfer/unified";
import { UINT256_MAX } from "eth-twc-sdk-js/types/utils";
import { mainnet } from "viem/chains";
import type { Address, Hex, PublicClient, WalletClient } from "viem";

const ZERO_ADDR =
  "0x0000000000000000000000000000000000000000" as Address;

import {
  ADDR,
  ADDR_B,
  COMMIT,
  SALT_ZERO,
  TEST_VERIFIER_CONTRACT,
  testDomain,
} from "./fixtures.ts";

const TX_HASH = ("0x" + "aa".repeat(32)) as Hex;

/** PublicClient スタブ（chain は mainnet、既定で TWC がデプロイ済み扱いの getCode）。 */
export function stubPublicClient(
  overrides: Partial<PublicClient> = {},
): PublicClient {
  const { getCode: overrideGetCode, ...rest } = overrides;
  const defaultGetCode: PublicClient["getCode"] = async (args) => {
    const a = args.address;
    if (!a || a.toLowerCase() === ZERO_ADDR.toLowerCase()) {
      return "0x";
    }
    return "0x6000";
  };
  const getCode = overrideGetCode ?? defaultGetCode;
  return {
    chain: mainnet,
    getCode,
    ...rest,
  } as PublicClient;
}

export function stubWalletClient(
  overrides: Partial<WalletClient> = {},
): WalletClient {
  return {
    chain: mainnet,
    ...overrides,
  } as WalletClient;
}

/** Self-Call: simulate → write が成功する最小モック。 */
export function stubClientsSelfTransferSuccess(): {
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  const simulateContract = mock(() =>
    Promise.resolve({
      result: undefined,
      request: {
        address: TEST_VERIFIER_CONTRACT,
        abi: [],
        functionName: "transfer",
        args: [],
      },
    }),
  ) as unknown as PublicClient["simulateContract"];
  const writeContract = mock(() => Promise.resolve(TX_HASH));
  return {
    publicClient: stubPublicClient({ simulateContract }),
    walletClient: stubWalletClient({ writeContract }),
  };
}

/** Self-Call: simulate が RPC エラー。 */
export function stubClientsSelfTransferSimulateRpcError(): {
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  const simulateContract = mock(() =>
    Promise.reject(new Error("RPC: eth_call failed")),
  ) as unknown as PublicClient["simulateContract"];
  const writeContract = mock(() => Promise.reject(new Error("should not write")));
  return {
    publicClient: stubPublicClient({ simulateContract }),
    walletClient: stubWalletClient({ writeContract }),
  };
}

/** 署名: getEip712Domain + signTypedData が成功。 */
export function stubClientsSignSuccess(): {
  publicClient: PublicClient;
  walletClient: WalletClient;
  sig: Hex;
} {
  const domain = testDomain();
  const sig = ("0x" + "bb".repeat(65)) as Hex;
  const getEip712Domain = mock(() =>
    Promise.resolve({
      domain,
      fields: "0x0f" as Hex,
      extensions: [] as const,
    }),
  );
  const signTypedData = mock(() => Promise.resolve(sig));
  return {
    publicClient: stubPublicClient({ getEip712Domain }),
    walletClient: stubWalletClient({ signTypedData }),
    sig,
  };
}

export function stubClientsSignTypedDataRejects(): {
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  const domain = testDomain();
  const getEip712Domain = mock(() =>
    Promise.resolve({
      domain,
      fields: "0x0f" as Hex,
      extensions: [] as const,
    }),
  );
  const signTypedData = mock(() =>
    Promise.reject(new Error("User rejected the request.")),
  );
  return {
    publicClient: stubPublicClient({ getEip712Domain }),
    walletClient: stubWalletClient({ signTypedData }),
  };
}

export function stubClientsGetEip712DomainRejects(): {
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  const getEip712Domain = mock(() =>
    Promise.reject(new Error("RPC: getEip712Domain failed")),
  );
  return {
    publicClient: stubPublicClient({ getEip712Domain }),
    walletClient: stubWalletClient({}),
  };
}

function domainWithoutZeroSalt(
  d: ReturnType<typeof testDomain>,
): SignedSingleTransfer["domain"] {
  if (
    d.salt !== undefined &&
    typeof d.salt === "string" &&
    d.salt.toLowerCase() === SALT_ZERO.toLowerCase()
  ) {
    const { salt: _s, ...rest } = d;
    return rest as SignedSingleTransfer["domain"];
  }
  return d as SignedSingleTransfer["domain"];
}

/** Executor 送信: 署名済みバンドル + simulate / write 成功。 */
export function minimalSignedSingleTransfer(): SignedSingleTransfer {
  const raw = testDomain();
  return {
    domain: domainWithoutZeroSalt(raw),
    from: ADDR,
    to: ADDR_B,
    token: ADDR,
    value: 1n,
    validAfter: 0n,
    validBefore: UINT256_MAX,
    commitment: COMMIT,
    signature: ("0x" + "cc".repeat(65)) as Hex,
  };
}

export function minimalSignedUni(): SignedUnifiedTransfer {
  const raw = testDomain();
  return {
    domain: domainWithoutZeroSalt(raw),
    from: ADDR,
    details: [{ to: ADDR_B, token: ADDR, value: 1n }],
    validAfter: 0n,
    validBefore: UINT256_MAX,
    commitment: COMMIT,
    signature: ("0x" + "cc".repeat(65)) as Hex,
  };
}

/** バッチ EIP-712 の `batchCommitment`（明細行の `commitment` と別ワードにする）。 */
const BATCH_COMMIT = ("0x" +
  "bb".repeat(32)) as Hex;

export function minimalSignedBatch(): SignedBatchTransfer {
  const raw = testDomain();
  return {
    domain: domainWithoutZeroSalt(raw),
    from: ADDR,
    details: [
      { to: ADDR_B, token: ADDR, value: 1n, commitment: COMMIT },
    ],
    validAfter: 0n,
    validBefore: UINT256_MAX,
    batchCommitment: BATCH_COMMIT,
    signature: ("0x" + "cc".repeat(65)) as Hex,
  };
}

export function minimalSignedCancel(): SignedCancelAuthorization {
  const raw = testDomain();
  return {
    domain: domainWithoutZeroSalt(raw),
    authorizer: ADDR,
    commitment: COMMIT,
    signature: ("0x" + "cc".repeat(65)) as Hex,
  };
}

export function stubClientsSignatureSendSuccess(): {
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  const simulateContract = mock(() =>
    Promise.resolve({
      result: undefined,
      request: {
        address: TEST_VERIFIER_CONTRACT,
        abi: [],
        functionName: "transferWithAuthorization",
        args: [],
      },
    }),
  ) as unknown as PublicClient["simulateContract"];
  const writeContract = mock(() => Promise.resolve(TX_HASH));
  return {
    publicClient: stubPublicClient({ simulateContract }),
    walletClient: stubWalletClient({ writeContract }),
  };
}

export function stubClientsSignatureSendSimulateFails(): {
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  const simulateContract = mock(() =>
    Promise.reject(new Error("RPC: execution reverted")),
  ) as unknown as PublicClient["simulateContract"];
  return {
    publicClient: stubPublicClient({ simulateContract }),
    walletClient: stubWalletClient({
      writeContract: mock(() =>
        Promise.reject(new Error("should not write")),
      ),
    }),
  };
}
