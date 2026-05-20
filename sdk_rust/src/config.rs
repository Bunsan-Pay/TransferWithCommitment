//! コントラクトアドレスと CREATE2 / EIP-712 の固定パラメータ。
//!
//! **デプロイ先アドレス**は EIP-2470 Singleton Factory による CREATE2 の決定論アドレスです（`contracts/TWC_CREATE2.md` 参照）。
//!
//! `integration-test` フィーチャー有効時のみ、[`transfer_with_commitment_address`] が環境変数 `ETH_TWC_CONTRACT_ADDRESS` を参照します（Anvil 結合テスト用）。
//!
//! `test-config` 有効時は単体テスト用の固定アドレスになります。

#[cfg(feature = "integration-test")]
use std::sync::OnceLock;

use alloy::primitives::{address, Address};

/// 未設定を表すゼロアドレス。
pub const ZERO_TRANSFER_ADDRESS: Address = address!("0x0000000000000000000000000000000000000000");

/// 既定 EIP-712 `name`（`TransferWithCommitment` コンストラクタと一致させる）。
pub const EIP712_DOMAIN_NAME: &str = "TransferWithCommitment";

/// 既定 EIP-712 `version`。
pub const EIP712_DOMAIN_VERSION: &str = "1";

#[cfg(not(feature = "integration-test"))]
const COMPILE_TIME_TWC: Address = {
    #[cfg(feature = "test-config")]
    {
        address!("0x2222222222222222222222222222222222222222")
    }
    #[cfg(not(feature = "test-config"))]
    {
        // contracts/TWC_CREATE2.md — default Foundry profile + default ctor args
        address!("0x5C260DD537A9c23Bbd42493e59F3CeA7da2DbC71")
    }
};

#[cfg(feature = "integration-test")]
static INTEGRATION_TWC: OnceLock<Address> = OnceLock::new();

/// 実行時に解決する `TransferWithCommitment` のデプロイアドレス。
///
/// - **通常ビルド** — [`TRANSFER_WITH_COMMITMENT_ADDRESS`] と一致（`integration-test` 以外）。
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

/// `TransferWithCommitment` の決定論アドレス（コンパイル時定数）。
///
/// `integration-test` 有効時はプレースホルダ（ゼロ）。実アドレスは [`transfer_with_commitment_address`] を使ってください。
#[cfg(not(feature = "integration-test"))]
pub const TRANSFER_WITH_COMMITMENT_ADDRESS: Address = COMPILE_TIME_TWC;

#[cfg(feature = "integration-test")]
pub const TRANSFER_WITH_COMMITMENT_ADDRESS: Address = ZERO_TRANSFER_ADDRESS;

/// [`transfer_with_commitment_address`] がゼロでないことを検証する（`integration-test` で未設定 env のときなど）。
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
    #[cfg(not(feature = "integration-test"))]
    fn transfer_with_commitment_address_is_deterministic_create2() {
        assert_eq!(
            transfer_with_commitment_address(),
            address!("0x5C260DD537A9c23Bbd42493e59F3CeA7da2DbC71")
        );
    }

    #[test]
    #[cfg(not(feature = "test-config"))]
    #[cfg(not(feature = "integration-test"))]
    fn assert_transfer_contract_configured_ok_by_default() {
        assert!(assert_transfer_contract_configured().is_ok());
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
