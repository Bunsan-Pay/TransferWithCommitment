//! オフチェーンで転送する署名済みバンドル。
//!
//! `domain` はオンチェーン `eip712Domain()` を [`crate::sign::domain_for_typed_data_sign`] で正規化したもの（ゼロ `salt` は省略されうる）。トランザクションに載せるのは送金内容と署名であり、**`domain` 本体はオンチェーンには渡さない**（[`crate::send_transaction::signature_transfer`] がエンコードするのはコントラクト関数引数のみ）。

use alloy::primitives::{Address, B256, Bytes, U256};
use alloy::sol_types::Eip712Domain;

use super::transfer_detail::CommittedTransferDetail;

/// 単一送金＋コミットメントの署名結果（型 `TransferWithCommit`）。
#[derive(Clone, Debug)]
pub struct SignedTransferWithCommit {
    /// EIP-712 ドメイン（正規化済み）。
    pub domain: Eip712Domain,
    /// メッセージの `from`。
    pub from: Address,
    pub to: Address,
    pub token: Address,
    pub value: U256,
    pub commitment: B256,
    /// 署名メッセージの `validAfter`（`uint256`）。コントラクトの `validTimestamp` と整合する値（通常はブロックタイムスタンプと比較される単位）。
    pub valid_after: U256,
    /// 署名メッセージの `validBefore`（`uint256`）。上に同じ。
    pub valid_before: U256,
    /// ECDSA 署名（`bytes`）。
    pub signature: Bytes,
}

/// `UniCommitTransfers` の署名結果。
#[derive(Clone, Debug)]
pub struct SignedUniCommitTransfers {
    /// EIP-712 ドメイン。
    pub domain: Eip712Domain,
    pub from: Address,
    /// オフチェーン明細（executor はメッセージ内、`Signed*` には含めない）。
    pub details: Vec<super::transfer_detail::TransferDetail>,
    pub commitment: B256,
    /// [`SignedTransferWithCommit`] の `valid_after` / `valid_before` と同じ意味。
    pub valid_after: U256,
    pub valid_before: U256,
    pub signature: Bytes,
}

/// `BatchTransferWithCommit` の署名結果。
#[derive(Clone, Debug)]
pub struct SignedBatchTransferWithCommit {
    /// EIP-712 ドメイン。
    pub domain: Eip712Domain,
    pub from: Address,
    pub details: Vec<CommittedTransferDetail>,
    /// [`SignedTransferWithCommit`] の `valid_after` / `valid_before` と同じ意味。
    pub valid_after: U256,
    pub valid_before: U256,
    pub signature: Bytes,
}

/// `CancelAuthorization` の署名結果。
#[derive(Clone, Debug)]
pub struct SignedCancelAuthorization {
    /// EIP-712 ドメイン。
    pub domain: Eip712Domain,
    pub authorizer: Address,
    pub commitment: B256,
    pub signature: Bytes,
}
