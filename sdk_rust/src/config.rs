//! コントラクトアドレスと対応チェーン ID。
//!
//! **デプロイ先アドレスは通常ソース上の定数**です（ランタイムの環境変数差し替え API はありません）。
//!
//! `integration-test` フィーチャー有効時のみ、[`transfer_with_commitment_address`] が環境変数 `ETH_TWC_CONTRACT_ADDRESS` を参照します（Anvil 結合テスト用）。
//!
//! ## 本番・通常ビルド（管理者向け）
//!
//! 通常ビルドでは実アドレスは **非公開の `COMPILE_TIME_TWC`** で決まります。[`transfer_with_commitment_address`] は
//! `integration-test` 以外ではそれをそのまま返し、[`TRANSFER_WITH_COMMITMENT_ADDRESS`] は同じ値のコンパイル時定数です（関数が定数を読むわけではなく、いずれも同一ソースから派生します）。
//!
//! 既定（`test-config` なし）ではゼロアドレスのままです。**運用では `config.rs` 内の `COMPILE_TIME_TWC` の
//! `not(test-config)` ブランチを、デプロイ済みコントラクトの `address!("0x…")` に差し替えてからビルドしてください。**

#[cfg(feature = "integration-test")]
use std::sync::OnceLock;

use alloy::primitives::{address, Address};

/// 未設定を表すゼロアドレス。
pub const ZERO_TRANSFER_ADDRESS: Address = address!("0x0000000000000000000000000000000000000000");

#[cfg(not(feature = "integration-test"))]
const COMPILE_TIME_TWC: Address = {
    #[cfg(feature = "test-config")]
    {
        address!("0x2222222222222222222222222222222222222222")
    }
    #[cfg(not(feature = "test-config"))]
    {
        ZERO_TRANSFER_ADDRESS
    }
};

#[cfg(feature = "integration-test")]
static INTEGRATION_TWC: OnceLock<Address> = OnceLock::new();

/// 実行時に解決する `TransferWithCommitment` のデプロイアドレス。
///
/// - **通常ビルド** — コンパイル時定数（[`TRANSFER_WITH_COMMITMENT_ADDRESS`] と一致、`integration-test` 以外）。
/// - **`integration-test`** — 初回アクセス時に `ETH_TWC_CONTRACT_ADDRESS` をパース。未設定・不正ならゼロアドレス扱い。
#[inline]
pub fn transfer_with_commitment_address() -> Address {
    #[cfg(feature = "integration-test")]
    {
        *INTEGRATION_TWC.get_or_init(|| {
            std::env::var("ETH_TWC_CONTRACT_ADDRESS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(ZERO_TRANSFER_ADDRESS)
        })
    }
    #[cfg(not(feature = "integration-test"))]
    {
        COMPILE_TIME_TWC
    }
}

/// `TransferWithCommitment` コントラクトのアドレス（コンパイル時定数）。
///
/// 既定は [`ZERO_TRANSFER_ADDRESS`] です。**ゼロのままでは** [`crate::sign`]・[`crate::verify`]・[`crate::send_transaction`] が失敗します。
///
/// `test-config` フィーチャー有効時は単体テスト用の固定アドレスになります。
///
/// `integration-test` 有効時は本定数はプレースホルダ（ゼロ）です。実アドレスは [`transfer_with_commitment_address`] を使ってください。
#[cfg(not(feature = "integration-test"))]
pub const TRANSFER_WITH_COMMITMENT_ADDRESS: Address = COMPILE_TIME_TWC;

#[cfg(feature = "integration-test")]
pub const TRANSFER_WITH_COMMITMENT_ADDRESS: Address = ZERO_TRANSFER_ADDRESS;

/// 本 SDK が許可するチェーン ID の一覧。
///
/// Ethereum mainnet、Sepolia、Polygon、Arbitrum One。
/// `integration-test` では Anvil 用に **31337** を追加します。
#[cfg(not(feature = "integration-test"))]
pub const SUPPORTED_CHAIN_IDS: &[u64] = &[1, 11155111, 137, 42161, 43114];

#[cfg(feature = "integration-test")]
pub const SUPPORTED_CHAIN_IDS: &[u64] = &[1, 11155111, 137, 42161, 43114, 31337];

/// [`transfer_with_commitment_address`] がゼロでないことを検証する。
///
/// # 戻り値
///
/// - `Ok(())` — コントラクトアドレスが設定済み。
///
/// # エラー
///
/// - [`crate::SdkError::ContractNotConfigured`] — アドレスが [`ZERO_TRANSFER_ADDRESS`] のまま。
#[inline]
pub fn assert_transfer_contract_configured() -> Result<(), crate::SdkError> {
    if transfer_with_commitment_address() == ZERO_TRANSFER_ADDRESS {
        return Err(crate::SdkError::ContractNotConfigured);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(not(feature = "test-config"))]
    fn transfer_with_commitment_address_is_zero_by_default() {
        assert_eq!(transfer_with_commitment_address(), ZERO_TRANSFER_ADDRESS);
    }

    #[test]
    #[cfg(not(feature = "test-config"))]
    fn assert_transfer_contract_configured_fails_on_zero_address() {
        assert!(matches!(
            assert_transfer_contract_configured(),
            Err(crate::SdkError::ContractNotConfigured)
        ));
    }

    #[test]
    #[cfg(feature = "test-config")]
    fn test_config_uses_non_zero_contract_address() {
        assert_ne!(transfer_with_commitment_address(), ZERO_TRANSFER_ADDRESS);
    }

    #[test]
    #[cfg(feature = "test-config")]
    fn assert_transfer_contract_configured_ok_under_test_config() {
        assert!(assert_transfer_contract_configured().is_ok());
    }
}
