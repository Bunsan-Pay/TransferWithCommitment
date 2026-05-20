//! チェーン検証および EIP-712 `domain` と設定アドレスの照合。

use alloy::primitives::Address;
use alloy::providers::Provider;
use alloy::sol_types::Eip712Domain;

use crate::config::{
    self, assert_transfer_contract_configured, EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION,
};
use crate::error::SdkError;

/// EIP-712 `domain.chainId`（[`U256`](alloy::primitives::U256)）が、数値のクライアントチェーン ID と等しいか。
#[inline]
pub fn chain_id_matches(domain_chain_id: alloy::primitives::U256, client_chain_id: u64) -> bool {
    domain_chain_id == alloy::primitives::U256::from(client_chain_id)
}

/// 接続先に canonical TWC がデプロイされていることを `eth_getCode` で確認する。
pub async fn assert_transfer_contract_deployed<P: Provider>(
    provider: &P,
) -> Result<(), SdkError> {
    assert_transfer_contract_configured()?;
    let addr = config::transfer_with_commitment_address();
    let chain_id = provider.get_chain_id().await?;
    let code = provider.get_code_at(addr).await?;
    if code.is_empty() {
        return Err(SdkError::ContractNotDeployed {
            address: addr,
            chain_id,
        });
    }
    Ok(())
}

/// `assert_transfer_contract_deployed` のエイリアス（旧名前との互換）。
#[inline]
pub async fn assert_provider_supported_chain<P: Provider>(
    provider: &P,
) -> Result<(), SdkError> {
    assert_transfer_contract_deployed(provider).await
}

/// オンチェーンから読んだ EIP-712 ドメインが設定 TWC / 接続チェーンと一致すること。
pub fn assert_onchain_eip712_domain_matches_config(
    domain: &Eip712Domain,
    provider_chain_id: u64,
) -> Result<(), SdkError> {
    let twc = config::transfer_with_commitment_address();
    let vc = domain.verifying_contract.ok_or_else(|| {
        SdkError::Alloy("eip712Domain: verifyingContract missing".into())
    })?;
    if vc != twc {
        return Err(SdkError::DomainVerifyingContractMismatch {
            domain: vc,
            configured: twc,
        });
    }
    let domain_chain = domain
        .chain_id
        .ok_or_else(|| SdkError::Alloy("eip712Domain: chainId missing".into()))?;
    if !chain_id_matches(domain_chain, provider_chain_id) {
        return Err(SdkError::DomainChainIdMismatch {
            domain: domain_chain.to_string(),
            client: provider_chain_id,
        });
    }
    let name_ok = domain
        .name
        .as_ref()
        .map(|n| n.as_ref() == EIP712_DOMAIN_NAME)
        .unwrap_or(false);
    if !name_ok {
        return Err(SdkError::Alloy(format!(
            "eip712Domain: unexpected name (expected {EIP712_DOMAIN_NAME})"
        )));
    }
    let ver_ok = domain
        .version
        .as_ref()
        .map(|v| v.as_ref() == EIP712_DOMAIN_VERSION)
        .unwrap_or(false);
    if !ver_ok {
        return Err(SdkError::Alloy(format!(
            "eip712Domain: unexpected version (expected {EIP712_DOMAIN_VERSION})"
        )));
    }
    Ok(())
}

/// 署名済みバンドルの `Eip712Domain` が、クライアントのチェーンおよび設定コントラクトアドレスと整合するか検証する。
pub fn assert_signed_domain_matches_client_and_config(
    client_chain_id: u64,
    domain_chain_id: alloy::primitives::U256,
    domain_verifying_contract: Address,
    configured_contract: Address,
) -> Result<(), SdkError> {
    if !chain_id_matches(domain_chain_id, client_chain_id) {
        return Err(SdkError::DomainChainIdMismatch {
            domain: domain_chain_id.to_string(),
            client: client_chain_id,
        });
    }
    if domain_verifying_contract != configured_contract {
        return Err(SdkError::DomainVerifyingContractMismatch {
            domain: domain_verifying_contract,
            configured: configured_contract,
        });
    }
    Ok(())
}

/// [`assert_signed_domain_matches_client_and_config`] を、設定アドレスを [`crate::config::transfer_with_commitment_address`] が返す値で呼び出す。
#[inline]
pub fn assert_signed_domain_matches_provider_and_config(
    provider_chain_id: u64,
    domain_chain_id: alloy::primitives::U256,
    domain_verifying_contract: Address,
) -> Result<(), SdkError> {
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
    fn assert_signed_domain_matches_fails_domain_chain_id_mismatch() {
        let vc = address!("0x2222222222222222222222222222222222222222");
        assert!(matches!(
            assert_signed_domain_matches_client_and_config(1, U256::from(137u64), vc, vc),
            Err(SdkError::DomainChainIdMismatch { .. })
        ));
    }

    #[test]
    fn assert_signed_domain_matches_fails_verifying_contract_mismatch() {
        let a = address!("0x2222222222222222222222222222222222222222");
        let b = address!("0x4444444444444444444444444444444444444444");
        assert!(matches!(
            assert_signed_domain_matches_client_and_config(1, U256::from(1u64), a, b),
            Err(SdkError::DomainVerifyingContractMismatch { .. })
        ));
    }
}
