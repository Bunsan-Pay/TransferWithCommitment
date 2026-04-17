// @ts-check
import { foundry } from "@wagmi/cli/plugins";

/** @type {import('@wagmi/cli').Config} */
export default {
  out: './abi/generated.ts',
  contracts: [],
  plugins: [
    foundry({
      project: "../contracts",
      include: ["TransferWithCommitment.sol/**"],
    })
  ],
}
