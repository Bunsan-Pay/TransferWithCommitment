/**
 * README SEQUENCE「Delegate to Executor」: approve → 署名 → Executor が transferWithAuthorization → verify
 */
import { describe, expect, test } from "bun:test";
import { parseEther } from "viem";
import type { Hex } from "viem";
import { singleTransfer as signSingle } from "../../sign.ts";
import { singleTransfer as sendSigned } from "../../sendTransaction/signatureTransfer.ts";
import { verify } from "../../verify.ts";
import {
  commitmentFromPayload,
  erc20MockAbi,
  makeAnvilClients,
} from "./helpers.ts";

const token = process.env.TOKEN_ADDRESS as Hex | undefined;
if (!token) {
  throw new Error(
    "TOKEN_ADDRESS is required (scripts/test-sdk-js-integration.sh)",
  );
}

describe("integration: Delegate to Executor（anvil）", () => {
  test("mint → approve → 署名 → Executor が送信 → verify", async () => {
    const { chain, publicClient, senderWallet, executorWallet, sender, executor } =
      makeAnvilClients();
    const recipient = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as Hex;
    const value = parseEther("7");
    const commitment = commitmentFromPayload("delegate-executor-seq");

    const mintHash = await senderWallet.writeContract({
      account: sender.address,
      chain,
      address: token,
      abi: erc20MockAbi,
      functionName: "mint",
      args: [sender.address, parseEther("1000")],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });

    const approveHash = await senderWallet.writeContract({
      account: sender.address,
      chain,
      address: token,
      abi: erc20MockAbi,
      functionName: "approve",
      args: [
        process.env.TWC_ADDRESS as Hex,
        115792089237316195423570985008687907853269984665640564039457584007913129639935n,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const signed = await signSingle(
      publicClient,
      senderWallet,
      sender.address,
      {
        from: sender.address,
        to: recipient,
        token,
        executor: executor.address,
        value,
        commitment,
      },
    );

    const txHash = await sendSigned(
      publicClient,
      executorWallet,
      executor.address,
      signed,
    );
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    await expect(
      verify(publicClient, txHash, {
        from: sender.address,
        token,
        to: recipient,
        value,
        commitment,
      }),
    ).resolves.toBeUndefined();
  });
});
