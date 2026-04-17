import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "verify.ts",
    "sign.ts",
    "utils.ts",
    "config.ts",
    "sendTransaction/selfTransfer.ts",
    "sendTransaction/signatureTransfer.ts",
    "types/abi.ts",
    "types/Eip712Type.ts",
    "types/transferDetail.ts",
    "types/signedData.ts",
    "types/utils.ts",
    "types/args/signatureTransfer.ts",
    "types/args/selfTransfer.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outDir: "dist",
  splitting: false,
  external: ["viem", "arktype"],
});
