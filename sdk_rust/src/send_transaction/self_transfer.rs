//! `msg.sender` による `transfer`。
//!
//! チェーン検証とコントラクト呼び出しに **同一の [`Provider`]** を使います（[`crate::utils::assert_provider_supported_chain`]）。
//! ブロードキャスト前に [`call`](alloy::contract::SolCallBuilder::call) 相当の **`eth_call` シミュレーション**を行い、失敗時は送信しません。

use alloy::primitives::{Address, TxHash};
use alloy::providers::Provider;

use crate::config::{self, assert_transfer_contract_configured};
use crate::contract::{CommittedTransferDetail as SolCommitted, TransferDetail as SolDetail, TransferWithCommitment};
use crate::error::SdkError;
use crate::types::args::{
    SelfBatchTransferWithCommitArgs, SelfSingleTransferArgs, SelfUniCommitTransfersArgs,
};
use crate::utils::assert_provider_supported_chain;

/// `transfer(address,address,uint256,bytes32)` — 単一トークン送金。
///
/// # 引数
///
/// * `provider` — チェーン検証・`TransferWithCommitment` の `.call()`（シミュレーション）と `.send()` に使用。
/// * `from` — トランザクション送信者（`msg.sender`）。送金元と一致させる必要があります。
/// * `args` — トークン・送金先・数量・コミットメント。
///
/// # 戻り値
///
/// ブロードキャストされたトランザクションのハッシュ（[`TxHash`]）。
///
/// # エラー
///
/// [`crate::SdkError`] — 未設定アドレス、非対応チェーン、RPC／送信失敗など。
pub async fn transfer<P: Provider>(
    provider: &P,
    from: Address,
    args: SelfSingleTransferArgs,
) -> Result<TxHash, SdkError> {
    assert_transfer_contract_configured()?;
    assert_provider_supported_chain(provider).await?;
    let c = TransferWithCommitment::new(config::transfer_with_commitment_address(), provider);
    c.transfer_0(args.token, args.to, args.value, args.commitment)
        .from(from)
        .call()
        .await?;
    let pending = c
        .transfer_0(args.token, args.to, args.value, args.commitment)
        .from(from)
        .send()
        .await?;
    Ok(*pending.tx_hash())
}

/// `transfer(TransferDetail[],bytes32)` — ユニファイド明細送金。
///
/// # 引数・戻り値・エラー
///
/// [`transfer`] と同様。`args` は [`SelfUniCommitTransfersArgs`]。
/// `args.details` が空のときは [`crate::SdkError::EmptyTransferDetails`]（コントラクトと [`crate::sign::uni_commit_transfers`] と同じ事前チェック）。
pub async fn unified_transfer<P: Provider>(
    provider: &P,
    from: Address,
    args: SelfUniCommitTransfersArgs,
) -> Result<TxHash, SdkError> {
    if args.details.is_empty() {
        return Err(SdkError::EmptyTransferDetails);
    }
    assert_transfer_contract_configured()?;
    assert_provider_supported_chain(provider).await?;
    let details: Vec<SolDetail> = args
        .details
        .iter()
        .map(|d| SolDetail {
            to: d.to,
            token: d.token,
            value: d.value,
        })
        .collect();
    let c = TransferWithCommitment::new(config::transfer_with_commitment_address(), provider);
    c.transfer_1(details.clone(), args.commitment)
        .from(from)
        .call()
        .await?;
    let pending = c
        .transfer_1(details, args.commitment)
        .from(from)
        .send()
        .await?;
    Ok(*pending.tx_hash())
}

/// `transfer(CommittedTransferDetail[])` — バッチ送金。
///
/// # 引数・戻り値・エラー
///
/// [`transfer`] と同様。`args` は [`SelfBatchTransferWithCommitArgs`]。
/// `args.details` が空のときは [`crate::SdkError::EmptyTransferDetails`]（コントラクトと [`crate::sign::batch_transfer_with_commit`] と同じ事前チェック）。
pub async fn batch_transfer<P: Provider>(
    provider: &P,
    from: Address,
    args: SelfBatchTransferWithCommitArgs,
) -> Result<TxHash, SdkError> {
    if args.details.is_empty() {
        return Err(SdkError::EmptyTransferDetails);
    }
    assert_transfer_contract_configured()?;
    assert_provider_supported_chain(provider).await?;
    let details: Vec<SolCommitted> = args
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
    c.transfer_2(details.clone())
        .from(from)
        .call()
        .await?;
    let pending = c.transfer_2(details).from(from).send().await?;
    Ok(*pending.tx_hash())
}

#[cfg(all(test, not(feature = "test-config")))]
mod tests {
    use alloy::primitives::{address, B256, U256};

    use alloy::providers::ProviderBuilder;

    use crate::types::{
        CommittedTransferDetail, SelfBatchTransferWithCommitArgs, SelfSingleTransferArgs,
        SelfUniCommitTransfersArgs, TransferDetail,
    };

    use super::{batch_transfer, transfer, unified_transfer};

    #[tokio::test]
    async fn transfer_fails_when_contract_not_configured() {
        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65531".parse().unwrap());
        let from = address!("0x1111111111111111111111111111111111111111");
        let args = SelfSingleTransferArgs {
            token: from,
            to: address!("0x3333333333333333333333333333333333333333"),
            value: U256::from(50u64),
            commitment: B256::repeat_byte(0xaa),
        };
        let r = transfer(&provider, from, args).await;
        assert!(matches!(r, Err(crate::SdkError::ContractNotConfigured)));
    }

    #[tokio::test]
    async fn unified_transfer_errors_on_empty_details_before_contract_configured() {
        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65529".parse().unwrap());
        let from = address!("0x1111111111111111111111111111111111111111");
        let args = SelfUniCommitTransfersArgs {
            details: vec![],
            commitment: B256::ZERO,
        };
        let r = unified_transfer(&provider, from, args).await;
        assert!(matches!(
            r,
            Err(crate::SdkError::EmptyTransferDetails)
        ));
    }

    #[tokio::test]
    async fn batch_transfer_errors_on_empty_details_before_contract_configured() {
        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65528".parse().unwrap());
        let from = address!("0x1111111111111111111111111111111111111111");
        let args = SelfBatchTransferWithCommitArgs { details: vec![] };
        let r = batch_transfer(&provider, from, args).await;
        assert!(matches!(
            r,
            Err(crate::SdkError::EmptyTransferDetails)
        ));
    }

    #[tokio::test]
    async fn unified_transfer_succeeds_past_empty_check_when_contract_not_configured() {
        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65527".parse().unwrap());
        let from = address!("0x1111111111111111111111111111111111111111");
        let detail = TransferDetail {
            to: address!("0x3333333333333333333333333333333333333333"),
            token: from,
            value: U256::from(1u64),
        };
        let args = SelfUniCommitTransfersArgs {
            details: vec![detail],
            commitment: B256::repeat_byte(0xbb),
        };
        let r = unified_transfer(&provider, from, args).await;
        assert!(matches!(
            r,
            Err(crate::SdkError::ContractNotConfigured)
        ));
    }

    #[tokio::test]
    async fn batch_transfer_succeeds_past_empty_check_when_contract_not_configured() {
        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65526".parse().unwrap());
        let from = address!("0x1111111111111111111111111111111111111111");
        let row = CommittedTransferDetail {
            to: address!("0x3333333333333333333333333333333333333333"),
            token: from,
            value: U256::from(1u64),
            commitment: B256::repeat_byte(0xcc),
        };
        let args = SelfBatchTransferWithCommitArgs {
            details: vec![row],
        };
        let r = batch_transfer(&provider, from, args).await;
        assert!(matches!(
            r,
            Err(crate::SdkError::ContractNotConfigured)
        ));
    }
}
