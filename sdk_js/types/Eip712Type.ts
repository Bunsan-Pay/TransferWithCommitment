// TransferWithCommit(address from,address to,address token,address executor,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 commitment)
export const singleTypes = {
  TransferWithCommit: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "token", type: "address" },
    { name: "executor", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "commitment", type: "bytes32" },
  ],
} as const;
// UniCommitTransfers(address from,address executor,TransferDetail[] details,uint256 validAfter,uint256 validBefore,bytes32 commitment)TransferDetail(address to,address token,uint256 value)
export const uniCommitTransfers = {
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
// BatchTransferWithCommit(address from,address executor,CommittedTransferDetail[] details,uint256 validAfter,uint256 validBefore)CommittedTransferDetail(address to,address token,uint256 value,bytes32 commitment)
export const batchTransferWithCommit = {
  BatchTransferWithCommit: [
    { name: "from", type: "address" },
    { name: "executor", type: "address" },
    { name: "details", type: "CommittedTransferDetail[]" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
  ],
  CommittedTransferDetail: [
    { name: "to", type: "address" },
    { name: "token", type: "address" },
    { name: "value", type: "uint256" },
    { name: "commitment", type: "bytes32" },
  ],
} as const;

//CancelAuthorization(address authorizer,bytes32 commitment)
export const cancelAuthorization = {
  CancelAuthorization: [
    { name: "authorizer", type: "address" },
    { name: "commitment", type: "bytes32" },
  ],
} as const;
