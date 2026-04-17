//! [`SdkError`] — SDK 各 API で返りうるエラー。

use alloy::primitives::{Address, U256};
use thiserror::Error;

/// SDK 全体で返すエラー型（RPC・コントラクト・署名・検証の失敗をまとめる）。
#[derive(Debug, Error)]
pub enum SdkError {
    /// [`crate::config::transfer_with_commitment_address`] がゼロアドレスのまま API を呼んだ。
    #[error(
        "transferWithCommitmentAddress is not configured (zero address). Set the compile-time address in config.rs, or with feature integration-test set ETH_TWC_CONTRACT_ADDRESS."
    )]
    ContractNotConfigured,

    /// プロバイダのチェーン ID が [`crate::config::SUPPORTED_CHAIN_IDS`] に含まれない。
    #[error("Unsupported chain: chain id {0}")]
    UnsupportedChain(u64),

    /// 署名済みデータの `domain.chainId` が RPC のチェーン ID と一致しない。
    #[error(
        "Signed data domain.chain_id ({domain}) does not match client chain id ({client})"
    )]
    DomainChainIdMismatch { domain: String, client: u64 },

    /// 署名済みデータの `domain.verifyingContract` が設定アドレスと一致しない。
    #[error(
        "Signed data domain.verifyingContract ({domain}) does not match transferWithCommitmentAddress ({configured})"
    )]
    DomainVerifyingContractMismatch {
        domain: Address,
        configured: Address,
    },

    /// EIP-712 メッセージの `validAfter` が `validBefore` より大きい（有効期間が空）。
    #[error(
        "validAfter ({valid_after}) must be <= validBefore ({valid_before})"
    )]
    InvalidValidTimeWindow {
        valid_after: U256,
        valid_before: U256,
    },

    /// [`crate::sign::uni_commit_transfers`] / [`crate::sign::batch_transfer_with_commit`]、および [`crate::send_transaction::self_transfer::unified_transfer`] / [`crate::send_transaction::self_transfer::batch_transfer`] で明細配列が空（コントラクトは revert する）。
    #[error("transfer details must not be empty")]
    EmptyTransferDetails,

    /// EIP-712 メッセージの `from` が [`Signer::address`](alloy::signers::Signer::address) と一致しない（オンチェーン検証で署名が通らないため、署名前に拒否する）。
    #[error(
        "EIP-712 message `from` ({from}) does not match signer address ({signer})"
    )]
    FromSignerMismatch { from: Address, signer: Address },

    /// `CancelAuthorization` の `authorizer` が [`Signer::address`](alloy::signers::Signer::address) と一致しない。
    #[error(
        "CancelAuthorization `authorizer` ({authorizer}) does not match signer address ({signer})"
    )]
    AuthorizerSignerMismatch { authorizer: Address, signer: Address },

    /// [`crate::verify::verify`] で、条件に合致する `TransferWithCommitmentSent` ログが 1 件もなかった。
    #[error("TransferWithCommitmentSent event not found")]
    EventNotFound,

    /// 指定ハッシュのトランザクションレシートが RPC から返らなかった（[`crate::verify::verify`]・[`crate::verify::get_transfer_with_commitment_sent_event_logs`]）。
    #[error("Transaction receipt not found for the given hash")]
    ReceiptNotFound,

    /// RPC 呼び出しまたはコントラクトエンコード／デコードの失敗。
    #[error("RPC / contract error: {0}")]
    Alloy(String),

    /// [`alloy::signers::Signer`] によるハッシュ署名の失敗。
    #[error("Signing error: {0}")]
    Signer(#[from] alloy::signers::Error),
}

impl From<alloy::contract::Error> for SdkError {
    fn from(e: alloy::contract::Error) -> Self {
        SdkError::Alloy(e.to_string())
    }
}

impl From<alloy::transports::TransportError> for SdkError {
    fn from(e: alloy::transports::TransportError) -> Self {
        SdkError::Alloy(e.to_string())
    }
}
