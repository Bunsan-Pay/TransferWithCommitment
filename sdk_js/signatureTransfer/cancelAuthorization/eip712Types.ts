export const eip712Types = {
  CancelAuthorization: [
    { name: "authorizer", type: "address" },
    { name: "commitment", type: "bytes32" },
  ],
} as const;
