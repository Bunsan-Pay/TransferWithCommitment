//! 送金引数・署名済みバンドル・明細行の型定義。
//!
//! - [`args`] — 自己送金用と EIP-712 署名入力用の引数構造体。
//! - [`signed_data`] — オフチェーンで渡す署名付きバンドル（正規化済み `Eip712Domain` を含む）。
//! - [`transfer_detail`] — 単一行の送金明細。

pub mod args;
pub mod signed_data;
pub mod transfer_detail;

pub use args::{
    BatchTransferWithCommitArgs, CancelAuthorizationArgs, SelfBatchTransferWithCommitArgs,
    SelfSingleTransferArgs, SelfUniCommitTransfersArgs, SignatureBatchTransferWithCommitArgs,
    SignatureSingleTransferArgs, SignatureUniCommitTransfersArgs, SingleTransferArgs,
    UniCommitTransfersArgs,
};
pub use signed_data::{
    SignedBatchTransferWithCommit, SignedCancelAuthorization, SignedTransferWithCommit,
    SignedUniCommitTransfers,
};
pub use transfer_detail::{CommittedTransferDetail, TransferDetail};
