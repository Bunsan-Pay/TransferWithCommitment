//! コントラクトへのトランザクション送信。
//!
//! 送信前に Alloy の **`.call()`**（`eth_call` による実行シミュレーション）を成功させてから **`.send()`** します。
//!
//! - [`crate::send_transaction::self_transfer`] — `msg.sender` が送金者となる `transfer` の各オーバーロード。
//! - [`crate::send_transaction::signature_transfer`] — EIP-712 署名済みデータに基づく `transferWithAuthorization` / `cancelAuthorization`。

pub mod self_transfer;
pub mod signature_transfer;
