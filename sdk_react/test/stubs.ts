import { mock } from "bun:test";
import type {
  SignedBatchTransferWithCommit,
  SignedCancelAuthorization,
  SignedTransferWithCommit,
  SignedUniCommitTransfers,
} from "eth-twc-sdk-js/types/signedData";
import { UINT256_MAX } from "eth-twc-sdk-js/types/utils";
import { mainnet } from "viem/chains";
import type { Hex, PublicClient, WalletClient } from "viem";

import {
  ADDR,
  ADDR_B,
  COMMIT,
  SALT_ZERO,
  TEST_VERIFIER_CONTRACT,
  testDomain,
} from "./fixtures.ts";

const TX_HASH = ("0x" + "aa".repeat(32)) as Hex;

/** supportedChains に含まれる PublicClient スタブ（chain は mainnet）。 */
export function stubPublicClient(
  overrides: Partial<PublicClient> = {},
): PublicClient {
  return {
    chain: mainnet,
    ...overrides,
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
): SignedTransferWithCommit["domain"] {
  if (
    d.salt !== undefined &&
    typeof d.salt === "string" &&
    d.salt.toLowerCase() === SALT_ZERO.toLowerCase()
  ) {
    const { salt: _s, ...rest } = d;
    return rest as SignedTransferWithCommit["domain"];
  }
  return d as SignedTransferWithCommit["domain"];
}

/** Executor 送信: 署名済みバンドル + simulate / write 成功。 */
export function minimalSignedSingleTransfer(): SignedTransferWithCommit {
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

export function minimalSignedUni(): SignedUniCommitTransfers {
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

export function minimalSignedBatch(): SignedBatchTransferWithCommit {
  const raw = testDomain();
  return {
    domain: domainWithoutZeroSalt(raw),
    from: ADDR,
    details: [
      { to: ADDR_B, token: ADDR, value: 1n, commitment: COMMIT },
    ],
    validAfter: 0n,
    validBefore: UINT256_MAX,
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
