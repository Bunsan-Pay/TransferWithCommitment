import { type } from "arktype";
import { address, bytes32, uint256 } from "./utils";

// TransferDetail(address to,address token,uint256 value)
export const transferDetail = type({
  to: address,
  token: address,
  value: uint256,
});

// CommittedTransferDetail(address to,address token,uint256 value,bytes32 commitment)
export const committedTransferDetail = type({
  to: address,
  token: address,
  value: uint256,
  commitment: bytes32,
});
