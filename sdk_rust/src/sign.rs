//! EIP-712 オフチェーン署名。
//!
//! - オンチェーン `eip712Domain()` からドメインを取得し、**ゼロ `salt`** は OpenZeppelin の domain separator と整合するよう [`domain_for_typed_data_sign`] から除外します。
//! - Alloy では **[`Provider`] + [`Signer`]** でドメイン取得と署名の両方に足ります（別クライアントに分ける必要はありません）。

use alloy::primitives::{Address, Bytes, B256, U256};
use alloy::providers::Provider;
use alloy::signers::Signer;
use alloy::sol_types::{Eip712Domain, SolStruct};

use crate::config::{self, assert_transfer_contract_configured};
use crate::contract::{
    BatchTransferWithCommit, CancelAuthorization, TransferDetail as SolTransferDetail,
    TransferWithCommit, TransferWithCommitment, UniCommitTransfers,
};
use crate::error::SdkError;
use crate::types::args::{
    BatchTransferWithCommitArgs, CancelAuthorizationArgs, SingleTransferArgs,
    UniCommitTransfersArgs,
};
use crate::types::signed_data::{
    SignedBatchTransferWithCommit, SignedCancelAuthorization, SignedTransferWithCommit,
    SignedUniCommitTransfers,
};
use crate::utils::{assert_onchain_eip712_domain_matches_config, assert_transfer_contract_deployed};

/// EIP-712 の `from` が実際に署名するキーの [`Signer::address`] と一致することを保証する。
///
/// 不一致のまま署名するとオンチェーンで `Invalid signature` になるため、呼び出し側の取り違えを防ぐ。
fn ensure_signer_is_message_from<S: Signer>(signer: &S, from: Address) -> Result<(), SdkError> {
    let signer_addr = signer.address();
    if signer_addr != from {
        return Err(SdkError::FromSignerMismatch {
            from,
            signer: signer_addr,
        });
    }
    Ok(())
}

/// `CancelAuthorization` の `authorizer` が署名キーと一致することを保証する。
fn ensure_signer_is_authorizer<S: Signer>(signer: &S, authorizer: Address) -> Result<(), SdkError> {
    let signer_addr = signer.address();
    if signer_addr != authorizer {
        return Err(SdkError::AuthorizerSignerMismatch {
            authorizer,
            signer: signer_addr,
        });
    }
    Ok(())
}

/// ERC-5267 の `eip712Domain().salt` がゼロワードのとき、OZ `EIP712` の domain separator と一致させるため **`salt` キーを付けない**形の [`Eip712Domain`] を構築する。
///
/// # 引数
///
/// * `name` — ドメイン名（コントラクトから取得した文字列）。
/// * `version` — ドメインバージョン。
/// * `chain_id` — EIP-155 チェーン ID（`U256`）。
/// * `verifying_contract` — 検証コントラクトアドレス。
/// * `salt` — ERC-5267 の `salt`。**ゼロなら**署名用 domain から省略される。
///
/// # 戻り値
///
/// [`sign_hash`](Signer::sign_hash) / [`eip712_signing_hash`](alloy::sol_types::SolStruct::eip712_signing_hash) に渡す [`Eip712Domain`]。
pub fn domain_for_typed_data_sign(
    name: String,
    version: String,
    chain_id: U256,
    verifying_contract: Address,
    salt: B256,
) -> Eip712Domain {
    let salt = if salt == B256::ZERO { None } else { Some(salt) };
    Eip712Domain {
        name: Some(name.into()),
        version: Some(version.into()),
        chain_id: Some(chain_id),
        verifying_contract: Some(verifying_contract),
        salt,
    }
}

/// コントラクトの `eip712Domain()` を読み、[`domain_for_typed_data_sign`] で正規化したドメインを返す。
async fn fetch_eip712_domain<P: Provider>(provider: &P) -> Result<Eip712Domain, SdkError> {
    let chain_id = provider.get_chain_id().await?;
    let c = TransferWithCommitment::new(config::transfer_with_commitment_address(), provider);
    let r = c.eip712Domain().call().await?;
    let _ = r.fields;
    let domain = domain_for_typed_data_sign(
        r.name,
        r.version,
        r.chainId,
        r.verifyingContract,
        r.salt,
    );
    assert_onchain_eip712_domain_matches_config(&domain, chain_id)?;
    Ok(domain)
}

fn unwrap_valid_time_window(
    valid_after: Option<U256>,
    valid_before: Option<U256>,
) -> Result<(U256, U256), SdkError> {
    let valid_after = valid_after.unwrap_or(U256::ZERO);
    let valid_before = valid_before.unwrap_or(U256::MAX);
    if valid_after > valid_before {
        return Err(SdkError::InvalidValidTimeWindow {
            valid_after,
            valid_before,
        });
    }
    Ok((valid_after, valid_before))
}

/// 単一送金向け EIP-712（型 `TransferWithCommit`）に署名し、署名済みバンドルを返す。
///
/// `args.valid_after` / `args.valid_before` のデフォルトは `None` のとき `0` と [`U256::MAX`]。
/// 解決後は `validAfter <= validBefore` が必須です。
///
/// # 引数
///
/// * `provider` — `eip712Domain()` 読み取りとチェーン検証に使用。
/// * `signer` — [`sign_hash`](Signer::sign_hash) で EIP-712 ハッシュに署名。
/// * `args` — メッセージ本体。`from` は [`Signer::address`] と一致させること（[`crate::SdkError::FromSignerMismatch`]）。その他 `executor` / `valid_after` / `valid_before` 等。
///
/// # 戻り値
///
/// オフチェーン転送用の [`SignedTransferWithCommit`]（正規化済み `domain` と `signature` を含む）。
///
/// # エラー
///
/// [`crate::SdkError`] — [`crate::SdkError::FromSignerMismatch`]、[`crate::SdkError::InvalidValidTimeWindow`]、未設定アドレス、非対応チェーン、RPC 失敗、署名失敗など。
pub async fn single_transfer<P, S>(
    provider: &P,
    signer: &S,
    args: SingleTransferArgs,
) -> Result<SignedTransferWithCommit, SdkError>
where
    P: Provider,
    S: Signer + Send + Sync,
{
    let (valid_after, valid_before) =
        unwrap_valid_time_window(args.valid_after, args.valid_before)?;
    ensure_signer_is_message_from(signer, args.from)?;
    assert_transfer_contract_configured()?;
    assert_transfer_contract_deployed(provider).await?;
    let domain = fetch_eip712_domain(provider).await?;
    let msg = TransferWithCommit {
        from: args.from,
        to: args.to,
        token: args.token,
        executor: args.executor,
        value: args.value,
        validAfter: valid_after,
        validBefore: valid_before,
        commitment: args.commitment,
    };
    let hash = msg.eip712_signing_hash(&domain);
    let sig = signer.sign_hash(&hash).await?;
    let signature = Bytes::copy_from_slice(sig.as_bytes().as_slice());
    Ok(SignedTransferWithCommit {
        domain,
        from: args.from,
        to: args.to,
        token: args.token,
        value: args.value,
        commitment: args.commitment,
        valid_after,
        valid_before,
        signature,
    })
}

/// ユニファイド明細（型 `UniCommitTransfers`）への署名。
///
/// # 引数・戻り値・エラー
///
/// [`single_transfer`] と同様のパターン。戻り値は [`SignedUniCommitTransfers`]。`args.details` が空のときは [`crate::SdkError::EmptyTransferDetails`]。
///
/// `args.from` は [`Signer::address`] と一致している必要があります（[`crate::SdkError::FromSignerMismatch`]）。
pub async fn uni_commit_transfers<P, S>(
    provider: &P,
    signer: &S,
    args: UniCommitTransfersArgs,
) -> Result<SignedUniCommitTransfers, SdkError>
where
    P: Provider,
    S: Signer + Send + Sync,
{
    if args.details.is_empty() {
        return Err(SdkError::EmptyTransferDetails);
    }
    let (valid_after, valid_before) =
        unwrap_valid_time_window(args.valid_after, args.valid_before)?;
    ensure_signer_is_message_from(signer, args.from)?;
    assert_transfer_contract_configured()?;
    assert_transfer_contract_deployed(provider).await?;
    let domain = fetch_eip712_domain(provider).await?;
    let details: Vec<SolTransferDetail> = args
        .details
        .iter()
        .map(|d| SolTransferDetail {
            to: d.to,
            token: d.token,
            value: d.value,
        })
        .collect();
    let msg = UniCommitTransfers {
        from: args.from,
        executor: args.executor,
        details,
        validAfter: valid_after,
        validBefore: valid_before,
        commitment: args.commitment,
    };
    let hash = msg.eip712_signing_hash(&domain);
    let sig = signer.sign_hash(&hash).await?;
    let signature = Bytes::copy_from_slice(sig.as_bytes().as_slice());
    Ok(SignedUniCommitTransfers {
        domain,
        from: args.from,
        details: args.details,
        commitment: args.commitment,
        valid_after,
        valid_before,
        signature,
    })
}

/// バッチ明細（型 `BatchTransferWithCommit`）への署名。
///
/// # 引数・戻り値・エラー
///
/// [`single_transfer`] と同様。戻り値は [`SignedBatchTransferWithCommit`]。`args.details` が空のときは [`crate::SdkError::EmptyTransferDetails`]。
///
/// `args.from` は [`Signer::address`] と一致している必要があります（[`crate::SdkError::FromSignerMismatch`]）。
pub async fn batch_transfer_with_commit<P, S>(
    provider: &P,
    signer: &S,
    args: BatchTransferWithCommitArgs,
) -> Result<SignedBatchTransferWithCommit, SdkError>
where
    P: Provider,
    S: Signer + Send + Sync,
{
    if args.details.is_empty() {
        return Err(SdkError::EmptyTransferDetails);
    }
    let (valid_after, valid_before) =
        unwrap_valid_time_window(args.valid_after, args.valid_before)?;
    ensure_signer_is_message_from(signer, args.from)?;
    assert_transfer_contract_configured()?;
    assert_transfer_contract_deployed(provider).await?;
    let domain = fetch_eip712_domain(provider).await?;
    let details: Vec<crate::contract::CommittedTransferDetail> = args
        .details
        .iter()
        .map(|d| crate::contract::CommittedTransferDetail {
            to: d.to,
            token: d.token,
            value: d.value,
            commitment: d.commitment,
        })
        .collect();
    let msg = BatchTransferWithCommit {
        from: args.from,
        executor: args.executor,
        details,
        validAfter: valid_after,
        validBefore: valid_before,
        batchCommitment: args.batch_commitment,
    };
    let hash = msg.eip712_signing_hash(&domain);
    let sig = signer.sign_hash(&hash).await?;
    let signature = Bytes::copy_from_slice(sig.as_bytes().as_slice());
    Ok(SignedBatchTransferWithCommit {
        domain,
        from: args.from,
        details: args.details,
        batch_commitment: args.batch_commitment,
        valid_after,
        valid_before,
        signature,
    })
}

/// 取消（型 `CancelAuthorization`）への署名。
///
/// # 引数
///
/// * `provider` — ドメイン取得・チェーン検証。
/// * `signer` — ハッシュ署名。
/// * `args` — `authorizer` と `commitment`（`authorizer` は [`Signer::address`] と一致させること）。
///
/// # 戻り値
///
/// [`SignedCancelAuthorization`]。
///
/// # エラー
///
/// [`crate::SdkError::AuthorizerSignerMismatch`] を含む [`crate::SdkError`] 系。
pub async fn cancel_authorization<P, S>(
    provider: &P,
    signer: &S,
    args: CancelAuthorizationArgs,
) -> Result<SignedCancelAuthorization, SdkError>
where
    P: Provider,
    S: Signer + Send + Sync,
{
    ensure_signer_is_authorizer(signer, args.authorizer)?;
    assert_transfer_contract_configured()?;
    assert_transfer_contract_deployed(provider).await?;
    let domain = fetch_eip712_domain(provider).await?;
    let msg = CancelAuthorization {
        authorizer: args.authorizer,
        commitment: args.commitment,
    };
    let hash = msg.eip712_signing_hash(&domain);
    let sig = signer.sign_hash(&hash).await?;
    let signature = Bytes::copy_from_slice(sig.as_bytes().as_slice());
    Ok(SignedCancelAuthorization {
        domain,
        authorizer: args.authorizer,
        commitment: args.commitment,
        signature,
    })
}

#[cfg(test)]
mod tests {
    use alloy::primitives::{address, B256, U256};

    use super::domain_for_typed_data_sign;

    #[test]
    fn domain_for_typed_data_sign_omits_zero_salt() {
        let d = domain_for_typed_data_sign(
            "TransferWithCommitment".to_string(),
            "1".to_string(),
            U256::from(1u64),
            address!("0x2222222222222222222222222222222222222222"),
            B256::ZERO,
        );
        assert!(d.salt.is_none());
    }

    #[test]
    fn domain_for_typed_data_sign_keeps_nonzero_salt() {
        let salt = B256::from_slice(&[0xbb; 32]);
        let d = domain_for_typed_data_sign(
            "TransferWithCommitment".to_string(),
            "1".to_string(),
            U256::from(1u64),
            address!("0x2222222222222222222222222222222222222222"),
            salt,
        );
        assert_eq!(d.salt, Some(salt));
    }

    #[tokio::test]
    #[cfg(not(feature = "test-config"))]
    async fn single_transfer_fails_when_provider_unreachable() {
        use alloy::providers::ProviderBuilder;
        use alloy::primitives::B256;
        use crate::error::SdkError;
        use crate::types::SingleTransferArgs;

        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65534".parse().unwrap());
        let signer = alloy::signers::local::PrivateKeySigner::random();
        let from = signer.address();
        let args = SingleTransferArgs {
            from,
            to: address!("0x3333333333333333333333333333333333333333"),
            token: address!("0x1111111111111111111111111111111111111111"),
            executor: address!("0x1111111111111111111111111111111111111111"),
            value: U256::from(100u64),
            commitment: B256::repeat_byte(0xaa),
            valid_after: None,
            valid_before: None,
        };
        let r = super::single_transfer(&provider, &signer, args).await;
        assert!(matches!(r, Err(SdkError::Alloy(_))));
    }

    #[tokio::test]
    async fn single_transfer_errors_when_from_does_not_match_signer() {
        use alloy::providers::ProviderBuilder;
        use crate::error::SdkError;
        use crate::types::SingleTransferArgs;

        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65535".parse().unwrap());
        let signer = alloy::signers::local::PrivateKeySigner::random();
        let wrong_from = address!("0x1111111111111111111111111111111111111111");
        assert_ne!(signer.address(), wrong_from);
        let args = SingleTransferArgs {
            from: wrong_from,
            to: address!("0x3333333333333333333333333333333333333333"),
            token: address!("0x1111111111111111111111111111111111111111"),
            executor: address!("0x1111111111111111111111111111111111111111"),
            value: U256::from(100u64),
            commitment: B256::repeat_byte(0xaa),
            valid_after: None,
            valid_before: None,
        };
        let r = super::single_transfer(&provider, &signer, args).await;
        assert!(matches!(
            r,
            Err(SdkError::FromSignerMismatch { .. })
        ));
    }

    #[tokio::test]
    async fn single_transfer_fails_when_valid_after_gt_valid_before() {
        use alloy::providers::ProviderBuilder;
        use crate::error::SdkError;
        use crate::types::SingleTransferArgs;

        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65534".parse().unwrap());
        let signer = alloy::signers::local::PrivateKeySigner::random();
        let from = signer.address();
        let args = SingleTransferArgs {
            from,
            to: address!("0x3333333333333333333333333333333333333333"),
            token: address!("0x1111111111111111111111111111111111111111"),
            executor: address!("0x1111111111111111111111111111111111111111"),
            value: U256::from(100u64),
            commitment: B256::repeat_byte(0xaa),
            valid_after: Some(U256::from(10u64)),
            valid_before: Some(U256::from(5u64)),
        };
        let r = super::single_transfer(&provider, &signer, args).await;
        assert!(matches!(
            r,
            Err(SdkError::InvalidValidTimeWindow { .. })
        ));
    }

    #[tokio::test]
    async fn uni_commit_transfers_errors_on_empty_details() {
        use alloy::providers::ProviderBuilder;
        use crate::error::SdkError;
        use crate::types::UniCommitTransfersArgs;

        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65534".parse().unwrap());
        let signer = alloy::signers::local::PrivateKeySigner::random();
        let a = address!("0x1111111111111111111111111111111111111111");
        let args = UniCommitTransfersArgs {
            from: a,
            executor: a,
            details: vec![],
            commitment: B256::ZERO,
            valid_after: None,
            valid_before: None,
        };
        let r = super::uni_commit_transfers(&provider, &signer, args).await;
        assert!(matches!(r, Err(SdkError::EmptyTransferDetails)));
    }

    #[tokio::test]
    async fn batch_transfer_with_commit_errors_on_empty_details() {
        use alloy::providers::ProviderBuilder;
        use crate::error::SdkError;
        use crate::types::BatchTransferWithCommitArgs;

        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65534".parse().unwrap());
        let signer = alloy::signers::local::PrivateKeySigner::random();
        let a = address!("0x1111111111111111111111111111111111111111");
        let args = BatchTransferWithCommitArgs {
            from: a,
            executor: a,
            details: vec![],
            batch_commitment: B256::ZERO,
            valid_after: None,
            valid_before: None,
        };
        let r = super::batch_transfer_with_commit(&provider, &signer, args).await;
        assert!(matches!(r, Err(SdkError::EmptyTransferDetails)));
    }

    #[tokio::test]
    async fn uni_commit_transfers_errors_when_from_does_not_match_signer() {
        use alloy::providers::ProviderBuilder;
        use crate::error::SdkError;
        use crate::types::{TransferDetail, UniCommitTransfersArgs};

        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65525".parse().unwrap());
        let signer = alloy::signers::local::PrivateKeySigner::random();
        let wrong_from = address!("0x1111111111111111111111111111111111111111");
        assert_ne!(signer.address(), wrong_from);
        let detail = TransferDetail {
            to: address!("0x3333333333333333333333333333333333333333"),
            token: address!("0x4444444444444444444444444444444444444444"),
            value: U256::from(1u64),
        };
        let args = UniCommitTransfersArgs {
            from: wrong_from,
            executor: signer.address(),
            details: vec![detail],
            commitment: B256::ZERO,
            valid_after: None,
            valid_before: None,
        };
        let r = super::uni_commit_transfers(&provider, &signer, args).await;
        assert!(matches!(
            r,
            Err(SdkError::FromSignerMismatch { .. })
        ));
    }

    #[tokio::test]
    async fn batch_transfer_with_commit_errors_when_from_does_not_match_signer() {
        use alloy::providers::ProviderBuilder;
        use crate::error::SdkError;
        use crate::types::{BatchTransferWithCommitArgs, CommittedTransferDetail};

        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65524".parse().unwrap());
        let signer = alloy::signers::local::PrivateKeySigner::random();
        let wrong_from = address!("0x1111111111111111111111111111111111111111");
        assert_ne!(signer.address(), wrong_from);
        let row = CommittedTransferDetail {
            to: address!("0x3333333333333333333333333333333333333333"),
            token: address!("0x4444444444444444444444444444444444444444"),
            value: U256::from(1u64),
            commitment: B256::repeat_byte(0xdd),
        };
        let args = BatchTransferWithCommitArgs {
            from: wrong_from,
            executor: signer.address(),
            details: vec![row],
            batch_commitment: B256::repeat_byte(0xdd),
            valid_after: None,
            valid_before: None,
        };
        let r = super::batch_transfer_with_commit(&provider, &signer, args).await;
        assert!(matches!(
            r,
            Err(SdkError::FromSignerMismatch { .. })
        ));
    }

    #[tokio::test]
    async fn cancel_authorization_errors_when_authorizer_does_not_match_signer() {
        use alloy::providers::ProviderBuilder;
        use crate::error::SdkError;
        use crate::types::CancelAuthorizationArgs;

        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65523".parse().unwrap());
        let signer = alloy::signers::local::PrivateKeySigner::random();
        let wrong_authorizer = address!("0x1111111111111111111111111111111111111111");
        assert_ne!(signer.address(), wrong_authorizer);
        let args = CancelAuthorizationArgs {
            authorizer: wrong_authorizer,
            commitment: B256::repeat_byte(0xee),
        };
        let r = super::cancel_authorization(&provider, &signer, args).await;
        assert!(matches!(
            r,
            Err(SdkError::AuthorizerSignerMismatch { .. })
        ));
    }
}
