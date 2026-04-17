//! チェーン検証および EIP-712 `domain` と設定アドレスの照合。

use alloy::primitives::Address;
use alloy::providers::Provider;

use crate::config::{self, SUPPORTED_CHAIN_IDS};

/// 指定チェーン ID が [`crate::config::SUPPORTED_CHAIN_IDS`] に含まれるかどうか。
///
/// # 引数
///
/// * `chain_id` — 問い合わせる EIP-155 チェーン ID。
///
/// # 戻り値
///
/// 対応チェーンなら `true`、それ以外は `false`。
#[inline]
pub fn is_supported_chain_id(chain_id: u64) -> bool {
    SUPPORTED_CHAIN_IDS.contains(&chain_id)
}

/// オプションのチェーン ID が対応リストに含まれるか（viem の `client.chain?.id` 相当）。
///
/// # 引数
///
/// * `chain_id` — `Some(id)` で検査、`None` の場合は常に `false`。
///
/// # 戻り値
///
/// `Some` かつ対応チェーンなら `true`。
#[inline]
pub fn is_supported_chain(chain_id: Option<u64>) -> bool {
    chain_id.is_some_and(is_supported_chain_id)
}

/// EIP-712 `domain.chainId`（[`U256`](alloy::primitives::U256)）が、数値のクライアントチェーン ID と等しいか。
///
/// # 引数
///
/// * `domain_chain_id` — 署名バンドルまたはオンチェーン domain の `chainId`。
/// * `client_chain_id` — 接続先のチェーン ID（`u64`）。
///
/// # 戻り値
///
/// 数値として等しければ `true`。
#[inline]
pub fn chain_id_matches(domain_chain_id: alloy::primitives::U256, client_chain_id: u64) -> bool {
    domain_chain_id == alloy::primitives::U256::from(client_chain_id)
}

/// [`Provider::get_chain_id`] で得たチェーン ID が [`crate::config::SUPPORTED_CHAIN_IDS`] に含まれることを検証する。
///
/// [`crate::sign`]・[`crate::send_transaction`] の先頭で共通利用する。
///
/// # エラー
///
/// - [`crate::SdkError::UnsupportedChain`] — 非対応チェーン。
pub async fn assert_provider_supported_chain<P: Provider>(
    provider: &P,
) -> Result<(), crate::SdkError> {
    let id = provider.get_chain_id().await?;
    if !is_supported_chain_id(id) {
        return Err(crate::SdkError::UnsupportedChain(id));
    }
    Ok(())
}

/// 署名済みバンドルの `Eip712Domain` が、クライアントのチェーンおよび設定コントラクトアドレスと整合するか検証する。
///
/// # 引数
///
/// * `client_chain_id` — 接続先のチェーン ID。
/// * `domain_chain_id` — `domain.chainId`（[`U256`](alloy::primitives::U256)）。
/// * `domain_verifying_contract` — `domain.verifyingContract`。
/// * `configured_contract` — 期待する検証コントラクト（通常 [`crate::config::transfer_with_commitment_address`] の戻り値と同じ）。
///
/// # 戻り値
///
/// - `Ok(())` — チェーン ID と `verifyingContract` が一致。
///
/// # エラー
///
/// - [`crate::SdkError::UnsupportedChain`] — クライアントが非対応チェーン。
/// - [`crate::SdkError::DomainChainIdMismatch`] — `chainId` が不一致。
/// - [`crate::SdkError::DomainVerifyingContractMismatch`] — コントラクトアドレスが不一致。
pub fn assert_signed_domain_matches_client_and_config(
    client_chain_id: u64,
    domain_chain_id: alloy::primitives::U256,
    domain_verifying_contract: Address,
    configured_contract: Address,
) -> Result<(), crate::SdkError> {
    if !is_supported_chain_id(client_chain_id) {
        return Err(crate::SdkError::UnsupportedChain(client_chain_id));
    }
    if !chain_id_matches(domain_chain_id, client_chain_id) {
        return Err(crate::SdkError::DomainChainIdMismatch {
            domain: domain_chain_id.to_string(),
            client: client_chain_id,
        });
    }
    if domain_verifying_contract != configured_contract {
        return Err(crate::SdkError::DomainVerifyingContractMismatch {
            domain: domain_verifying_contract,
            configured: configured_contract,
        });
    }
    Ok(())
}

/// [`assert_signed_domain_matches_client_and_config`] を、設定アドレスを [`crate::config::transfer_with_commitment_address`] が返す値で呼び出す。
///
/// # 引数
///
/// * `provider_chain_id` — プロバイダのチェーン ID。
/// * `domain_chain_id` — 署名バンドルの `domain.chainId`。
/// * `domain_verifying_contract` — 署名バンドルの `domain.verifyingContract`。
///
/// # 戻り値
///
/// [`assert_signed_domain_matches_client_and_config`] と同じ。
#[inline]
pub fn assert_signed_domain_matches_provider_and_config(
    provider_chain_id: u64,
    domain_chain_id: alloy::primitives::U256,
    domain_verifying_contract: Address,
) -> Result<(), crate::SdkError> {
    assert_signed_domain_matches_client_and_config(
        provider_chain_id,
        domain_chain_id,
        domain_verifying_contract,
        config::transfer_with_commitment_address(),
    )
}

#[cfg(test)]
mod tests {
    use alloy::primitives::{address, U256};

    use super::*;

    #[test]
    fn is_supported_chain_id_matches_documented_networks() {
        assert!(is_supported_chain_id(1));
        assert!(is_supported_chain_id(11155111));
        assert!(is_supported_chain_id(137));
        assert!(is_supported_chain_id(42161));
        assert!(!is_supported_chain_id(999_999));
    }

    #[test]
    fn is_supported_chain_none_is_false() {
        assert!(!is_supported_chain(None));
    }

    #[test]
    fn is_supported_chain_some_supported_is_true() {
        assert!(is_supported_chain(Some(1)));
    }

    #[test]
    fn chain_id_matches_u256_and_u64() {
        assert!(chain_id_matches(U256::from(1u64), 1));
        assert!(chain_id_matches(U256::from(137u64), 137));
        assert!(!chain_id_matches(U256::from(137u64), 1));
    }

    #[test]
    fn assert_signed_domain_matches_ok_when_ids_and_contract_match() {
        let vc = address!("0x2222222222222222222222222222222222222222");
        assert!(assert_signed_domain_matches_client_and_config(
            1,
            U256::from(1u64),
            vc,
            vc,
        )
        .is_ok());
    }

    #[test]
    fn assert_signed_domain_matches_fails_unsupported_client_chain() {
        let vc = address!("0x2222222222222222222222222222222222222222");
        assert!(matches!(
            assert_signed_domain_matches_client_and_config(
                999_999,
                U256::from(999_999u64),
                vc,
                vc,
            ),
            Err(crate::SdkError::UnsupportedChain(999_999))
        ));
    }

    #[test]
    fn assert_signed_domain_matches_fails_domain_chain_id_mismatch() {
        let vc = address!("0x2222222222222222222222222222222222222222");
        assert!(matches!(
            assert_signed_domain_matches_client_and_config(1, U256::from(137u64), vc, vc),
            Err(crate::SdkError::DomainChainIdMismatch { .. })
        ));
    }

    #[test]
    fn assert_signed_domain_matches_fails_verifying_contract_mismatch() {
        let a = address!("0x2222222222222222222222222222222222222222");
        let b = address!("0x4444444444444444444444444444444444444444");
        assert!(matches!(
            assert_signed_domain_matches_client_and_config(1, U256::from(1u64), a, b),
            Err(crate::SdkError::DomainVerifyingContractMismatch { .. })
        ));
    }
}
