//! 署名付き `transferWithAuthorization` と `cancelAuthorization`。
//!
//! 送信前に [`crate::utils::assert_provider_supported_chain`] と、署名バンドルの [`Eip712Domain`](alloy::sol_types::Eip712Domain) がプロバイダのチェーンおよび [`crate::config::transfer_with_commitment_address`] が返すアドレスと一致することを検証します。
//! ブロードキャスト前に **`.call()` 相当の `eth_call` シミュレーション**を行い、失敗時は送信しません。

use alloy::primitives::{Address, TxHash};
use alloy::providers::Provider;

use crate::config::{self, assert_transfer_contract_configured};
use crate::contract::{CommittedTransferDetail as SolCommitted, TransferDetail as SolDetail, TransferWithCommitment};
use crate::error::SdkError;
use crate::types::signed_data::{
    SignedBatchTransferWithCommit, SignedCancelAuthorization, SignedTransferWithCommit,
    SignedUniCommitTransfers,
};
use crate::utils::{assert_provider_supported_chain, assert_signed_domain_matches_provider_and_config};

/// 署名付き送信の共通前提（コントラクト設定・チェーン・署名 `domain` と設定の整合）。
async fn assert_signature_transfer_context<P: Provider>(
    provider: &P,
    signed_domain: &alloy::sol_types::Eip712Domain,
) -> Result<(), SdkError> {
    assert_transfer_contract_configured()?;
    assert_provider_supported_chain(provider).await?;
    let chain_id = provider.get_chain_id().await?;
    let domain_chain = signed_domain
        .chain_id
        .ok_or_else(|| SdkError::Alloy("signed domain missing chainId".into()))?;
    let vc = signed_domain
        .verifying_contract
        .ok_or_else(|| SdkError::Alloy("signed domain missing verifyingContract".into()))?;
    assert_signed_domain_matches_provider_and_config(chain_id, domain_chain, vc)?;
    Ok(())
}

/// `transferWithAuthorization`（8 引数オーバーロード）— 単一送金の署名実行。
///
/// # 引数
///
/// * `provider` — チェーン検証・コントラクトの `.call()`（シミュレーション）と `.send()` に使用。
/// * `executor` — トランザクション送信者（`msg.sender`）。EIP-712 の `executor` と一致させる必要があります。
/// * `signed` — [`crate::sign::single_transfer`] 等で生成した署名済みデータ。
///
/// # 戻り値
///
/// トランザクションハッシュ。
///
/// # エラー
///
/// [`crate::SdkError`] — 前提検証失敗、シミュレーション／送信失敗など。
pub async fn single_transfer<P: Provider>(
    provider: &P,
    executor: Address,
    signed: SignedTransferWithCommit,
) -> Result<TxHash, SdkError> {
    assert_signature_transfer_context(provider, &signed.domain).await?;
    let c = TransferWithCommitment::new(config::transfer_with_commitment_address(), provider);
    c.transferWithAuthorization_0(
        signed.from,
        signed.to,
        signed.token,
        signed.value,
        signed.valid_after,
        signed.valid_before,
        signed.commitment,
        signed.signature.clone(),
    )
    .from(executor)
    .call()
    .await?;
    let pending = c
        .transferWithAuthorization_0(
            signed.from,
            signed.to,
            signed.token,
            signed.value,
            signed.valid_after,
            signed.valid_before,
            signed.commitment,
            signed.signature,
        )
        .from(executor)
        .send()
        .await?;
    Ok(*pending.tx_hash())
}

/// `transferWithAuthorization`（ユニファイド明細オーバーロード）。
///
/// # 引数・戻り値・エラー
///
/// [`single_transfer`] と同様。`signed` は [`SignedUniCommitTransfers`]。
pub async fn unified_transfer<P: Provider>(
    provider: &P,
    executor: Address,
    signed: SignedUniCommitTransfers,
) -> Result<TxHash, SdkError> {
    assert_signature_transfer_context(provider, &signed.domain).await?;
    let details: Vec<SolDetail> = signed
        .details
        .iter()
        .map(|d| SolDetail {
            to: d.to,
            token: d.token,
            value: d.value,
        })
        .collect();
    let c = TransferWithCommitment::new(config::transfer_with_commitment_address(), provider);
    c.transferWithAuthorization_1(
        signed.from,
        details.clone(),
        signed.valid_after,
        signed.valid_before,
        signed.commitment,
        signed.signature.clone(),
    )
    .from(executor)
    .call()
    .await?;
    let pending = c
        .transferWithAuthorization_1(
            signed.from,
            details,
            signed.valid_after,
            signed.valid_before,
            signed.commitment,
            signed.signature,
        )
        .from(executor)
        .send()
        .await?;
    Ok(*pending.tx_hash())
}

/// `transferWithAuthorization`（バッチ明細オーバーロード）。
///
/// # 引数・戻り値・エラー
///
/// [`single_transfer`] と同様。`signed` は [`SignedBatchTransferWithCommit`]。
pub async fn batch_transfer<P: Provider>(
    provider: &P,
    executor: Address,
    signed: SignedBatchTransferWithCommit,
) -> Result<TxHash, SdkError> {
    assert_signature_transfer_context(provider, &signed.domain).await?;
    let details: Vec<SolCommitted> = signed
        .details
        .iter()
        .map(|d| SolCommitted {
            to: d.to,
            token: d.token,
            value: d.value,
            commitment: d.commitment,
        })
        .collect();
    let c = TransferWithCommitment::new(config::transfer_with_commitment_address(), provider);
    c.transferWithAuthorization_2(
        signed.from,
        details.clone(),
        signed.valid_after,
        signed.valid_before,
        signed.signature.clone(),
    )
    .from(executor)
    .call()
    .await?;
    let pending = c
        .transferWithAuthorization_2(
            signed.from,
            details,
            signed.valid_after,
            signed.valid_before,
            signed.signature,
        )
        .from(executor)
        .send()
        .await?;
    Ok(*pending.tx_hash())
}

/// `cancelAuthorization`。
///
/// # 引数
///
/// * `provider` — [`single_transfer`] と同じ。
/// * `executor` — トランザクション送信者（`msg.sender`）。
/// * `signed` — [`crate::sign::cancel_authorization`] で生成したデータ。
///
/// # 戻り値
///
/// トランザクションハッシュ。
pub async fn cancel_authorization<P: Provider>(
    provider: &P,
    executor: Address,
    signed: SignedCancelAuthorization,
) -> Result<TxHash, SdkError> {
    assert_signature_transfer_context(provider, &signed.domain).await?;
    let c = TransferWithCommitment::new(config::transfer_with_commitment_address(), provider);
    c.cancelAuthorization(
        signed.authorizer,
        signed.commitment,
        signed.signature.clone(),
    )
    .from(executor)
    .call()
    .await?;
    let pending = c
        .cancelAuthorization(signed.authorizer, signed.commitment, signed.signature)
        .from(executor)
        .send()
        .await?;
    Ok(*pending.tx_hash())
}

#[cfg(all(test, feature = "test-config"))]
mod tests {
    use alloy::primitives::{address, Bytes, B256, U256};
    use alloy::providers::ProviderBuilder;
    use alloy::sol_types::Eip712Domain;
    use serde_json::json;
    use wiremock::{matchers::method, Mock, MockServer, ResponseTemplate};

    use crate::types::SignedTransferWithCommit;

    use super::single_transfer;

    async fn mock_server_eth_chain_id(chain_id_hex: &str) -> MockServer {
        let server = MockServer::start().await;
        let hex = chain_id_hex.to_string();
        Mock::given(method("POST"))
            .respond_with(move |req: &wiremock::Request| {
                let body: serde_json::Value =
                    serde_json::from_slice(&req.body).unwrap_or(json!({}));
                let id = body.get("id").cloned().unwrap_or(json!(1));
                ResponseTemplate::new(200).set_body_json(json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": hex
                }))
            })
            .mount(&server)
            .await;
        server
    }

    fn sample_signed(domain: Eip712Domain) -> SignedTransferWithCommit {
        let addr = address!("0x1111111111111111111111111111111111111111");
        SignedTransferWithCommit {
            domain,
            from: addr,
            to: address!("0x3333333333333333333333333333333333333333"),
            token: addr,
            value: U256::from(100u64),
            commitment: B256::repeat_byte(0xaa),
            valid_after: U256::ZERO,
            valid_before: U256::MAX,
            signature: Bytes::from(vec![0xcc; 65]),
        }
    }

    #[tokio::test]
    async fn single_transfer_errors_when_domain_chain_id_differs_from_provider() {
        let server = mock_server_eth_chain_id("0x1").await;
        let url = server.uri().parse().unwrap();
        let provider = ProviderBuilder::new().connect_http(url);

        let domain = crate::sign::domain_for_typed_data_sign(
            "TransferWithCommitment".to_string(),
            "1".to_string(),
            U256::from(137u64),
            address!("0x2222222222222222222222222222222222222222"),
            B256::ZERO,
        );
        let signed = sample_signed(domain);
        let exec = address!("0x1111111111111111111111111111111111111111");

        let r = single_transfer(&provider, exec, signed).await;
        assert!(matches!(
            r,
            Err(crate::SdkError::DomainChainIdMismatch { .. })
        ));
    }

    #[tokio::test]
    async fn single_transfer_errors_when_domain_verifying_contract_mismatches_config() {
        let server = mock_server_eth_chain_id("0x1").await;
        let url = server.uri().parse().unwrap();
        let provider = ProviderBuilder::new().connect_http(url);

        let domain = crate::sign::domain_for_typed_data_sign(
            "TransferWithCommitment".to_string(),
            "1".to_string(),
            U256::from(1u64),
            address!("0x5555555555555555555555555555555555555555"),
            B256::ZERO,
        );
        let signed = sample_signed(domain);
        let exec = address!("0x1111111111111111111111111111111111111111");

        let r = single_transfer(&provider, exec, signed).await;
        assert!(matches!(
            r,
            Err(crate::SdkError::DomainVerifyingContractMismatch { .. })
        ));
    }
}

#[cfg(all(test, not(feature = "test-config")))]
mod tests_contract_not_configured {
    use alloy::primitives::{address, Bytes, B256, U256};
    use alloy::providers::ProviderBuilder;
    use alloy::sol_types::Eip712Domain;

    use crate::types::SignedTransferWithCommit;

    use super::single_transfer;

    #[tokio::test]
    async fn single_transfer_fails_when_contract_not_configured_without_test_config() {
        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65530".parse().unwrap());
        let domain = Eip712Domain {
            name: Some("TransferWithCommitment".into()),
            version: Some("1".into()),
            chain_id: Some(U256::from(1u64)),
            verifying_contract: Some(address!(
                "0x2222222222222222222222222222222222222222"
            )),
            salt: None,
        };
        let addr = address!("0x1111111111111111111111111111111111111111");
        let signed = SignedTransferWithCommit {
            domain,
            from: addr,
            to: address!("0x3333333333333333333333333333333333333333"),
            token: addr,
            value: U256::from(100u64),
            commitment: B256::repeat_byte(0xaa),
            valid_after: U256::ZERO,
            valid_before: U256::MAX,
            signature: Bytes::from(vec![0xcc; 65]),
        };
        let r = single_transfer(&provider, addr, signed).await;
        assert!(matches!(
            r,
            Err(crate::SdkError::ContractNotConfigured)
        ));
    }
}
