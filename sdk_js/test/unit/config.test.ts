import { describe, expect, test } from "bun:test";
import {
  EIP712_DOMAIN_NAME,
  transferWithCommitmentAddress,
  TRANSFER_WITH_COMMITMENT_CREATE2_SALT,
} from "../../config.ts";

describe("config（本番モジュール）", () => {
  test("CREATE2 決定論アドレスが焼き込まれている", () => {
    expect(transferWithCommitmentAddress.toLowerCase()).toBe(
      "0x5c260dd537a9c23bbd42493e59f3cea7da2dbc71",
    );
  });

  test("既定 CREATE2 salt", () => {
    expect(TRANSFER_WITH_COMMITMENT_CREATE2_SALT).toBe(
      "0x779ff8f20f474ffe5281ee6d24a20a25c33cbac9e89a282d33b494d0458dfdc2",
    );
  });

  test("EIP-712 domain name", () => {
    expect(EIP712_DOMAIN_NAME).toBe("TransferWithCommitment");
  });
});
