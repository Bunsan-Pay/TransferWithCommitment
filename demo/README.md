# TWC Sepolia Demo

Small Bun + React demo for the Sepolia CREATE2 deployment of
`TransferWithCommitment`.

```bash
bun run demo:dev
```

Static build (GitHub Pages subpath):

```bash
bun run demo:build
# default public-path: /TransferWithCommitment/demo/
```

Published with docs at [GitHub Pages](https://bunsan-pay.github.io/TransferWithCommitment/demo/).

The app uses an injected wallet on Sepolia, checks ERC-20 allowance for the
canonical TWC address, lets you approve when needed, then exercises
`selfTransfer` or `signatureTransfer` with `single`, `batch`, and `unified`
forms. After the transaction is mined it calls `useVerifyTransfer` with the
same input values.
