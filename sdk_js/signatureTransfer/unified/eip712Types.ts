// UniCommitTransfers + TransferDetail
export const eip712Types = {
  UniCommitTransfers: [
    { name: "from", type: "address" },
    { name: "executor", type: "address" },
    { name: "details", type: "TransferDetail[]" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "commitment", type: "bytes32" },
  ],
  TransferDetail: [
    { name: "to", type: "address" },
    { name: "token", type: "address" },
    { name: "value", type: "uint256" },
  ],
} as const;
