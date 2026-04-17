import { type } from "arktype";

export const UINT256_MAX = (1n << 256n) - 1n;

export const uint256 = type("bigint").filter((v, ctx) =>
  v <= UINT256_MAX && v >= 0n
    ? true
    : ctx.reject(`must be: 0n <= value <= ${UINT256_MAX}`),
);

const reBytes32 = /^0x[0-9a-fA-F]{64}$/;
const reBytes = /^0x[0-9a-fA-F]+$/;
const reAddress = /^0x[0-9a-fA-F]{40}$/;

/** 0x プレフィックス付き hex（viem `Hex` 互換のブランド） */
export type Hex0x = `0x${string}`;

export const bytes32 = type("string").narrow((s): s is Hex0x =>
  reBytes32.test(s),
);

export const bytes = type("string").narrow((s): s is Hex0x => reBytes.test(s));

export const address = type("string").narrow((s): s is Hex0x =>
  reAddress.test(s),
);
