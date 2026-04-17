import { describe, expect, mock, test } from "bun:test";
import { mainnet } from "viem/chains";
import type { Hex, PublicClient, WalletClient } from "viem";
import { ADDR, ADDR_B, COMMIT, SALT_ZERO, testDomain } from "./fixtures";
import { UINT256_MAX } from "../../types/utils";

const sign = await import("../../sign");

describe("sign.ts（config モック済み）", () => {
  test("singleTransfer は domain・署名・Signed* 形の戻り値を返す", async () => {
    const domain = testDomain();
    const publicClient = {
      chain: mainnet,
      getEip712Domain: async () => ({
        domain,
        fields: "0x0f" as Hex,
        extensions: [] as const,
      }),
    } as unknown as PublicClient;

    const sigHex = ("0x" + "bb".repeat(65)) as Hex;
    const wallet = {
      chain: mainnet,
      signTypedData: mock(() => Promise.resolve(sigHex)),
    } as unknown as WalletClient;

    const out = await sign.singleTransfer(
      publicClient,
      wallet,
      ADDR as Hex,
      {
        from: ADDR,
        to: ADDR_B,
        token: ADDR,
        executor: ADDR,
        value: 100n,
        commitment: COMMIT,
      },
    );

    const { salt: _salt, ...domainWithoutZeroSalt } = domain;
    expect(out.domain).toMatchObject(domainWithoutZeroSalt);
    expect(out.signature).toBe(sigHex);
    expect(out.from).toBe(ADDR);
    expect(out.validAfter).toBe(0n);
    expect(out.validBefore).toBe(UINT256_MAX);
    expect((out as Record<string, unknown>).executor).toBeUndefined();
  });

  test("signTypedData にはゼロ salt を除いた domain が渡る（OZ EIP712 と一致）", async () => {
    const domain = testDomain();
    expect(domain.salt).toBe(SALT_ZERO);

    let passedDomain: unknown;
    const publicClient = {
      chain: mainnet,
      getEip712Domain: async () => ({
        domain,
        fields: "0x0f" as Hex,
        extensions: [] as const,
      }),
    } as unknown as PublicClient;

    const sigHex = ("0x" + "cc".repeat(65)) as Hex;
    const wallet = {
      chain: mainnet,
      signTypedData: mock((args: { domain: Record<string, unknown> }) => {
        passedDomain = args.domain;
        return Promise.resolve(sigHex);
      }),
    } as unknown as WalletClient;

    await sign.singleTransfer(
      publicClient,
      wallet,
      ADDR as Hex,
      {
        from: ADDR,
        to: ADDR_B,
        token: ADDR,
        executor: ADDR,
        value: 1n,
        commitment: COMMIT,
      },
    );

    expect(passedDomain).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(passedDomain, "salt")).toBe(
      false,
    );
  });

  test("salt がゼロでないときは signTypedData の domain に salt を残す", async () => {
    const nonZeroSalt =
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Hex;
    const domain = { ...testDomain(), salt: nonZeroSalt };

    let passedDomain: unknown;
    const publicClient = {
      chain: mainnet,
      getEip712Domain: async () => ({
        domain,
        fields: "0x0f" as Hex,
        extensions: [] as const,
      }),
    } as unknown as PublicClient;

    const sigHex = ("0x" + "dd".repeat(65)) as Hex;
    const wallet = {
      chain: mainnet,
      signTypedData: mock((args: { domain: { salt?: Hex } }) => {
        passedDomain = args.domain;
        return Promise.resolve(sigHex);
      }),
    } as unknown as WalletClient;

    await sign.singleTransfer(
      publicClient,
      wallet,
      ADDR as Hex,
      {
        from: ADDR,
        to: ADDR_B,
        token: ADDR,
        executor: ADDR,
        value: 1n,
        commitment: COMMIT,
      },
    );

    expect((passedDomain as { salt: Hex }).salt).toBe(nonZeroSalt);
  });

  test("account と args.from が一致しなければ署名前に例外（getEip712Domain は呼ばれない）", async () => {
    const getEip712Domain = mock(async () => {
      throw new Error("should not call getEip712Domain");
    });
    const signTypedData = mock(async () => {
      throw new Error("should not call signTypedData");
    });
    const publicClient = {
      chain: mainnet,
      getEip712Domain,
    } as unknown as PublicClient;
    const wallet = {
      chain: mainnet,
      signTypedData,
    } as unknown as WalletClient;

    await expect(
      sign.singleTransfer(publicClient, wallet, ADDR_B as Hex, {
        from: ADDR,
        to: ADDR_B,
        token: ADDR,
        executor: ADDR,
        value: 1n,
        commitment: COMMIT,
      }),
    ).rejects.toThrow(/Signer account .* does not match EIP-712 message from/);

    expect(getEip712Domain).not.toHaveBeenCalled();
    expect(signTypedData).not.toHaveBeenCalled();
  });

  test("account と args.authorizer が一致しなければ cancelAuthorization は署名前に例外", async () => {
    const getEip712Domain = mock(async () => {
      throw new Error("should not call getEip712Domain");
    });
    const signTypedData = mock(async () => {
      throw new Error("should not call signTypedData");
    });
    const publicClient = {
      chain: mainnet,
      getEip712Domain,
    } as unknown as PublicClient;
    const wallet = {
      chain: mainnet,
      signTypedData,
    } as unknown as WalletClient;

    await expect(
      sign.cancelAuthorization(publicClient, wallet, ADDR_B as Hex, {
        authorizer: ADDR,
        commitment: COMMIT,
      }),
    ).rejects.toThrow(
      /Signer account .* does not match EIP-712 message authorizer/,
    );

    expect(getEip712Domain).not.toHaveBeenCalled();
    expect(signTypedData).not.toHaveBeenCalled();
  });

  test("uniCommitTransfers / batchTransferWithCommit も from と account の一致を要する", async () => {
    const publicClient = {
      chain: mainnet,
      getEip712Domain: async () => ({
        domain: testDomain(),
        fields: "0x0f" as Hex,
        extensions: [] as const,
      }),
    } as unknown as PublicClient;
    const wallet = {
      chain: mainnet,
      signTypedData: mock(() =>
        Promise.resolve(("0x" + "ee".repeat(65)) as Hex),
      ),
    } as unknown as WalletClient;

    const detail = {
      to: ADDR_B,
      token: ADDR,
      value: 1n,
    };
    const committedDetail = { ...detail, commitment: COMMIT };

    await expect(
      sign.uniCommitTransfers(publicClient, wallet, ADDR_B as Hex, {
        from: ADDR,
        executor: ADDR,
        details: [detail],
        commitment: COMMIT,
      }),
    ).rejects.toThrow(/does not match EIP-712 message from/);

    await expect(
      sign.batchTransferWithCommit(publicClient, wallet, ADDR_B as Hex, {
        from: ADDR,
        executor: ADDR,
        details: [committedDetail],
      }),
    ).rejects.toThrow(/does not match EIP-712 message from/);
  });

  test("対応外チェーンなら Unsupported chain", async () => {
    const publicClient = {
      chain: { id: 999999, name: "unknown" },
      getEip712Domain: async () => {
        throw new Error("should not call");
      },
    } as unknown as PublicClient;
    const wallet = { chain: mainnet } as unknown as WalletClient;

    await expect(
      sign.singleTransfer(publicClient, wallet, ADDR as Hex, {
        from: ADDR,
        to: ADDR_B,
        token: ADDR,
        executor: ADDR,
        value: 1n,
        commitment: COMMIT,
      }),
    ).rejects.toThrow(/Unsupported chain/);
  });
});
