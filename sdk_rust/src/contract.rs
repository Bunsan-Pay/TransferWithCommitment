//! コントラクト ABI と EIP-712 メッセージ型の生成（[`alloy::sol!`]）。
//!
//! - `TransferDetail` / `CommittedTransferDetail` はコントラクトの `transfer` オーバーロードのタプル引数に対応します。
//! - `TransferWithCommit` などは Solidity の EIP-712 型名・フィールド順と一致させています。
//! - [`TransferWithCommitment`] は `#[sol(rpc)]` により JSON-RPC 呼び出し用のバインディングを生成します。
//!
//! オーバーロードは Alloy の規則で `transfer_0`, `transfer_1`, `transferWithAuthorization_0` のように番号付きメソッドになります。
#![allow(clippy::too_many_arguments)] // sol! がコントラクト関数に多数の引数を生成する

use alloy::sol;

sol! {
    /// 単一トークン送金の明細タプル（`transfer(TransferDetail[],bytes32)` 用）。
    struct TransferDetail {
        address to;
        address token;
        uint256 value;
    }

    /// 明細ごとにコミットメントを持つタプル（`transfer(CommittedTransferDetail[])` 用）。
    struct CommittedTransferDetail {
        address to;
        address token;
        uint256 value;
        bytes32 commitment;
    }

    /// EIP-712 型 `TransferWithCommit`（単一送金＋署名者・有効期間）。
    struct TransferWithCommit {
        address from;
        address to;
        address token;
        address executor;
        uint256 value;
        uint256 validAfter;
        uint256 validBefore;
        bytes32 commitment;
    }

    /// EIP-712 型 `UniCommitTransfers`（複数明細・単一コミットメント）。
    struct UniCommitTransfers {
        address from;
        address executor;
        TransferDetail[] details;
        uint256 validAfter;
        uint256 validBefore;
        bytes32 commitment;
    }

    /// EIP-712 型 `BatchTransferWithCommit`（コミットメント付き明細のバッチ）。
    struct BatchTransferWithCommit {
        address from;
        address executor;
        CommittedTransferDetail[] details;
        uint256 validAfter;
        uint256 validBefore;
    }

    /// EIP-712 型 `CancelAuthorization`。
    struct CancelAuthorization {
        address authorizer;
        bytes32 commitment;
    }

    #[sol(rpc)]
    contract TransferWithCommitment {
        function eip712Domain() external view returns (
            bytes1 fields,
            string name,
            string version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] extensions
        );

        function transfer(address token, address to, uint256 value, bytes32 commitment) external;

        function transfer(TransferDetail[] details, bytes32 commitment) external;

        function transfer(CommittedTransferDetail[] details) external;

        function transferWithAuthorization(
            address from,
            address to,
            address token,
            uint256 value,
            uint256 validAfter,
            uint256 validBefore,
            bytes32 commitment,
            bytes signature
        ) external;

        function transferWithAuthorization(
            address from,
            TransferDetail[] details,
            uint256 validAfter,
            uint256 validBefore,
            bytes32 commitment,
            bytes signature
        ) external;

        function transferWithAuthorization(
            address from,
            CommittedTransferDetail[] details,
            uint256 validAfter,
            uint256 validBefore,
            bytes signature
        ) external;

        function cancelAuthorization(address authorizer, bytes32 commitment, bytes signature) external;
    }
}
