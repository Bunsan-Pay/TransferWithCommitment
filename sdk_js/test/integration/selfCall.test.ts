/**
 * README SEQUENCE「Self-Call」: approve → transfer(token,to,value,commitment) → verify
 */
import { describe, expect, test } from "bun:test";
import { parseEther } from "viem";
import type { Hex } from "viem";
import { transfer } from "../../sendTransaction/selfTransfer.ts";
import { verify } from "../../verify.ts";
import {
  commitmentFromPayload,
  erc20MockAbi,
  makeAnvilClients,
} from "./helpers.ts";

const token = process.env.TOKEN_ADDRESS as Hex | undefined;
if (!token) {
  throw new Error("TOKEN_ADDRESS is required (integration run.sh)");
}

describe("integration: Self-Call（anvil）", () => {
  test("mint → approve → SDK transfer → verify が通る", async () => {
    const { chain, publicClient, senderWallet, sender } = makeAnvilClients();
    const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Hex;
    const value = parseEther("10");
    const commitment = commitmentFromPayload("payload+nonce:self-call");

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

    const txHash = await transfer(
      publicClient,
      senderWallet,
      sender.address,
      {
        token,
        to: recipient,
        value,
        commitment,
      },
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
