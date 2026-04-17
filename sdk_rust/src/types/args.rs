//! 各 API への引数型（自己送金用と EIP-712 署名入力用）。

use alloy::primitives::{Address, B256, U256};

use super::transfer_detail::{CommittedTransferDetail, TransferDetail};

// ---- selfTransfer（`msg.sender` が送金者の `transfer`）----

/// `transfer(address,address,uint256,bytes32)` に対応する引数。
#[derive(Clone, Debug)]
pub struct SelfSingleTransferArgs {
    /// 送金する ERC-20 トークン。
    pub token: Address,
    /// 送金先。
    pub to: Address,
    /// 数量。
    pub value: U256,
    /// コミットメント。
    pub commitment: B256,
}

/// `transfer(TransferDetail[],bytes32)` に対応する引数。
#[derive(Clone, Debug)]
pub struct SelfUniCommitTransfersArgs {
    /// 送金明細の列。
    pub details: Vec<TransferDetail>,
    /// 全体で共有するコミットメント。
    pub commitment: B256,
}

/// `transfer(CommittedTransferDetail[])` に対応する引数。
#[derive(Clone, Debug)]
pub struct SelfBatchTransferWithCommitArgs {
    /// コミットメント付き明細の列。
    pub details: Vec<CommittedTransferDetail>,
}

// ---- signatureTransfer（EIP-712 署名メッセージの入力）----

/// 型 `TransferWithCommit` 用の引数（署名者・送金内容）。
#[derive(Clone, Debug)]
pub struct SignatureSingleTransferArgs {
    /// 署名者／送金元。
    pub from: Address,
    /// 送金先。
    pub to: Address,
    /// トークン。
    pub token: Address,
    /// 実行を許可する executor（オンチェーン検証で一致が必要）。
    pub executor: Address,
    /// 数量。
    pub value: U256,
    /// コミットメント。
    pub commitment: B256,
    /// EIP-712 の `validAfter`。`None` のときは `0`。
    pub valid_after: Option<U256>,
    /// EIP-712 の `validBefore`。`None` のときは [`U256::MAX`]。
    pub valid_before: Option<U256>,
}

/// 型 `UniCommitTransfers` 用の引数。
#[derive(Clone, Debug)]
pub struct SignatureUniCommitTransfersArgs {
    /// 署名者。
    pub from: Address,
    /// executor。
    pub executor: Address,
    /// 明細（コミットメントはトップレベルで共有）。
    pub details: Vec<TransferDetail>,
    pub commitment: B256,
    /// EIP-712 の `validAfter`。`None` のときは `0`。
    pub valid_after: Option<U256>,
    /// EIP-712 の `validBefore`。`None` のときは [`U256::MAX`]。
    pub valid_before: Option<U256>,
}

/// 型 `BatchTransferWithCommit` 用の引数。
#[derive(Clone, Debug)]
pub struct SignatureBatchTransferWithCommitArgs {
    /// 署名者。
    pub from: Address,
    /// executor。
    pub executor: Address,
    /// コミットメント付き明細。
    pub details: Vec<CommittedTransferDetail>,
    /// EIP-712 の `validAfter`。`None` のときは `0`。
    pub valid_after: Option<U256>,
    /// EIP-712 の `validBefore`。`None` のときは [`U256::MAX`]。
    pub valid_before: Option<U256>,
}

/// 型 `CancelAuthorization` 用の引数。
#[derive(Clone, Debug)]
pub struct CancelAuthorizationArgs {
    /// 取消対象の承認者。
    pub authorizer: Address,
    /// コミットメント。
    pub commitment: B256,
}

/// [`SignatureSingleTransferArgs`] の別名。
pub type SingleTransferArgs = SignatureSingleTransferArgs;
/// [`SignatureUniCommitTransfersArgs`] の別名。
pub type UniCommitTransfersArgs = SignatureUniCommitTransfersArgs;
/// [`SignatureBatchTransferWithCommitArgs`] の別名。
pub type BatchTransferWithCommitArgs = SignatureBatchTransferWithCommitArgs;
