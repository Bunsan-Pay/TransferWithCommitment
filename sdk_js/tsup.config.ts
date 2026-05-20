import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "abi.ts",
    "verify.ts",
    "utils.ts",
    "config.ts",
    "types/utils.ts",
    "types/transferDetail.ts",
    "selfTransfer/single/index.ts",
    "selfTransfer/batch/index.ts",
    "selfTransfer/unified/index.ts",
    "signatureTransfer/single/index.ts",
    "signatureTransfer/batch/index.ts",
    "signatureTransfer/unified/index.ts",
    "signatureTransfer/cancelAuthorization/index.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outDir: "dist",
  splitting: false,
  external: ["viem", "arktype"],
});
