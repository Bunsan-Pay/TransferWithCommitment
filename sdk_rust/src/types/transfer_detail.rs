//! 送金明細の 1 行分（Solidity 構造体に対応する Rust 表現）。

use alloy::primitives::{Address, B256, U256};

/// `TransferDetail(to, token, value)` — ユニファイド送金や EIP-712 の明細行に使用。
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TransferDetail {
    /// 送金先アドレス。
    pub to: Address,
    /// ERC-20 トークンアドレス。
    pub token: Address,
    /// 送金額（wei 等の最小単位）。
    pub value: U256,
}

/// `CommittedTransferDetail(to, token, value, commitment)` — 明細行ごとのコミットメント付き。
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CommittedTransferDetail {
    /// 送金先アドレス。
    pub to: Address,
    /// ERC-20 トークンアドレス。
    pub token: Address,
    /// 送金額。
    pub value: U256,
    /// その行のコミットメント（`bytes32`）。
    pub commitment: B256,
}
