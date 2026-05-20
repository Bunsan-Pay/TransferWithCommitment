export const eip712Types = {
  BatchTransferWithCommit: [
    { name: "from", type: "address" },
    { name: "executor", type: "address" },
    { name: "details", type: "CommittedTransferDetail[]" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "batchCommitment", type: "bytes32" },
  ],
  CommittedTransferDetail: [
    { name: "to", type: "address" },
    { name: "token", type: "address" },
    { name: "value", type: "uint256" },
    { name: "commitment", type: "bytes32" },
  ],
} as const;
