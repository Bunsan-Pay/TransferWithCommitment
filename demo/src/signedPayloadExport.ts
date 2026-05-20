import { signedDataSchema as signedBatchSchema } from "eth-twc-sdk-js/signatureTransfer/batch";
import type { SignedBatchTransfer } from "eth-twc-sdk-js/signatureTransfer/batch";
import type { SignedSingleTransfer } from "eth-twc-sdk-js/signatureTransfer/single";
import { signedDataSchema as signedSingleSchema } from "eth-twc-sdk-js/signatureTransfer/single";
import type { SignedUnifiedTransfer } from "eth-twc-sdk-js/signatureTransfer/unified";
import { signedDataSchema as signedUnifiedSchema } from "eth-twc-sdk-js/signatureTransfer/unified";

import schemaBatchDoc from "../schemas/signature-transfer-signed-batch.bundle.schema.json";
import schemaSingleDoc from "../schemas/signature-transfer-signed-single.bundle.schema.json";
import schemaUnifiedDoc from "../schemas/signature-transfer-signed-unified.bundle.schema.json";

export type SignedPayload = SignedSingleTransfer | SignedUnifiedTransfer | SignedBatchTransfer;

export const signedBundleSchemaJson = {
  single: schemaSingleDoc,
  unified: schemaUnifiedDoc,
  batch: schemaBatchDoc,
} as const;

function toUint256(v: unknown, path: string): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number" && Number.isFinite(v) && v >= 0 && Number.isInteger(v)) {
    return BigInt(v);
  }
  if (typeof v === "string" && /^[0-9]+$/.test(v)) return BigInt(v);
  throw new Error(`Expected uint256-compatible value at ${path}`);
}

function reviveDomain(domain: unknown, path: string) {
  if (typeof domain !== "object" || domain === null) {
    throw new Error(`${path}: domain must be an object`);
  }
  const d = domain as Record<string, unknown>;
  const chainIdRaw = d.chainId;
  let chainId: number | bigint;
  if (typeof chainIdRaw === "bigint") chainId = chainIdRaw;
  else if (typeof chainIdRaw === "number") chainId = chainIdRaw;
  else chainId = toUint256(chainIdRaw, `${path}.chainId`);

  return {
    name: String(d.name),
    version: String(d.version),
    chainId,
    verifyingContract: String(d.verifyingContract),
    ...(d.salt === undefined ? {} : { salt: String(d.salt) }),
  };
}

function reviveSignedSingle(parsed: Record<string, unknown>): unknown {
  return {
    domain: reviveDomain(parsed.domain, "domain"),
    from: parsed.from,
    to: parsed.to,
    token: parsed.token,
    value: toUint256(parsed.value, "value"),
    validAfter: toUint256(parsed.validAfter, "validAfter"),
    validBefore: toUint256(parsed.validBefore, "validBefore"),
    commitment: parsed.commitment,
    signature: parsed.signature,
  };
}

function reviveSignedUnified(parsed: Record<string, unknown>): unknown {
  const detailsRaw = parsed.details;
  if (!Array.isArray(detailsRaw)) throw new Error("details must be an array");
  const details = detailsRaw.map((row, i) => {
    if (typeof row !== "object" || row === null) throw new Error(`details[${i}] invalid`);
    const r = row as Record<string, unknown>;
    return {
      to: r.to,
      token: r.token,
      value: toUint256(r.value, `details[${i}].value`),
    };
  });

  return {
    domain: reviveDomain(parsed.domain, "domain"),
    from: parsed.from,
    details,
    validAfter: toUint256(parsed.validAfter, "validAfter"),
    validBefore: toUint256(parsed.validBefore, "validBefore"),
    commitment: parsed.commitment,
    signature: parsed.signature,
  };
}

function reviveSignedBatch(parsed: Record<string, unknown>): unknown {
  const detailsRaw = parsed.details;
  if (!Array.isArray(detailsRaw)) throw new Error("details must be an array");
  const details = detailsRaw.map((row, i) => {
    if (typeof row !== "object" || row === null) throw new Error(`details[${i}] invalid`);
    const r = row as Record<string, unknown>;
    return {
      to: r.to,
      token: r.token,
      value: toUint256(r.value, `details[${i}].value`),
      commitment: r.commitment,
    };
  });

  return {
    domain: reviveDomain(parsed.domain, "domain"),
    from: parsed.from,
    details,
    validAfter: toUint256(parsed.validAfter, "validAfter"),
    validBefore: toUint256(parsed.validBefore, "validBefore"),
    batchCommitment: parsed.batchCommitment,
    signature: parsed.signature,
  };
}

/** JSON.stringify signer output: bigint → decimal string. */
export function stringifySignedPayload(payload: SignedPayload): string {
  return JSON.stringify(
    payload,
    (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
}

function tryAssert<T>(
  revive: () => unknown,
  schema: { assert: (v: unknown) => T },
  label: string,
): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const raw = revive();
    return { ok: true, data: schema.assert(raw) };
  } catch (e) {
    return {
      ok: false,
      error: `${label}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/** Parse exported JSON text and validate with sdk_js signedDataSchema. */
export function parseAndValidateImportedSignedPayload(
  text: string,
): SignedPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("root must be an object");
  }
  const obj = parsed as Record<string, unknown>;

  if ("batchCommitment" in obj) {
    const r = tryAssert(() => reviveSignedBatch(obj), signedBatchSchema, "SignedBatchTransfer");
    if (r.ok) return r.data;
    throw new Error(r.error);
  }

  if ("details" in obj && Array.isArray(obj.details)) {
    /** Prefer unified then batch — batch-only rows carry per-line commitment */
    const first = obj.details[0];
    const rowsLookLikeCommitted =
      first &&
      typeof first === "object" &&
      first !== null &&
      "commitment" in (first as object);

    if (rowsLookLikeCommitted) {
      const bat = tryAssert(() => reviveSignedBatch(obj), signedBatchSchema, "SignedBatchTransfer");
      if (bat.ok) return bat.data;
      const uni = tryAssert(() => reviveSignedUnified(obj), signedUnifiedSchema, "SignedUnifiedTransfer");
      if (uni.ok) return uni.data;
      throw new Error(`${bat.error}; ${uni.error}`);
    }

    const uni = tryAssert(() => reviveSignedUnified(obj), signedUnifiedSchema, "SignedUnifiedTransfer");
    if (uni.ok) return uni.data;
    throw new Error(uni.error);
  }

  const single = tryAssert(() => reviveSignedSingle(obj), signedSingleSchema, "SignedSingleTransfer");
  if (single.ok) return single.data;
  throw new Error(single.error);
}

export function signedPayloadVariant(payload: SignedPayload): "single" | "unified" | "batch" {
  if ("batchCommitment" in payload) return "batch";
  if ("details" in payload) return "unified";
  return "single";
}

export function payerTokenTotals(payload: SignedPayload): Map<string, bigint> {
  const totals = new Map<string, bigint>();
  function add(token: string, amount: bigint) {
    const k = token.toLowerCase();
    totals.set(k, (totals.get(k) ?? 0n) + amount);
  }

  if ("batchCommitment" in payload) {
    for (const d of payload.details) add(d.token, d.value);
    return totals;
  }
  if ("details" in payload) {
    for (const d of payload.details) add(d.token, d.value);
    return totals;
  }
  add(payload.token, payload.value);
  return totals;
}

export function downloadTextFile(filename: string, mime: string, body: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download JSON (bundle export or bundled schema doc). Accepts serialized text or plain objects. */
export function downloadJsonFile(filename: string, body: string | Record<string, unknown>) {
  const text = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  downloadTextFile(filename, "application/json;charset=utf-8", text);
}
