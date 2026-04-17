//! トランザクションレシート上の `TransferWithCommitmentSent` イベントの取得・検証。
//!
//! 信頼できる RPC から得たレシートを前提に、指定フィールドと一致するログの有無を確認します（チェーン最終性や悪意ある RPC の改ざんまでは防ぎません）。

use alloy::primitives::{Address, B256, TxHash, U256};
use alloy::providers::Provider;
use alloy::sol_types::SolEvent;

use crate::config::{self, assert_transfer_contract_configured};
use crate::error::SdkError;
use crate::events::TransferWithCommitmentSent;
use crate::utils::is_supported_chain_id;

/// [`verify`] に渡す、イベント内容との照合に使うフィールド集合。
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VerifyArgs {
    /// 送金元（ログの `from`）。
    pub from: Address,
    /// ERC-20 トークン（ログの `token`）。
    pub token: Address,
    /// 送金先（ログの `to`）。
    pub to: Address,
    /// 送金額（ログの `value`）。
    pub value: U256,
    /// コミットメント（ログの `commitment`）。
    pub commitment: B256,
}

/// 指定トランザクションのレシートから、`TransferWithCommitmentSent` をすべてデコードして返す。
///
/// 該当ログがなければ **空ベクタ**を返し、エラーにはしません。
///
/// # 引数
///
/// * `public_provider` — レシート取得に使用するプロバイダ（チェーン ID が対応リストに含まれること）。
/// * `hash` — 対象トランザクションのハッシュ。
///
/// # 戻り値
///
/// デコードに成功したイベント本体（`TransferWithCommitmentSent::decode_log` の戻り値の `.data`）の列。
///
/// # エラー
///
/// - [`crate::SdkError::ContractNotConfigured`]
/// - [`crate::SdkError::UnsupportedChain`]
/// - [`crate::SdkError::ReceiptNotFound`]
/// - RPC エラー（[`crate::SdkError::Alloy`] など）
pub async fn get_transfer_with_commitment_sent_event_logs<P: Provider>(
    public_provider: &P,
    hash: TxHash,
) -> Result<Vec<TransferWithCommitmentSent>, SdkError> {
    assert_transfer_contract_configured()?;
    let chain_id = public_provider.get_chain_id().await?;
    if !is_supported_chain_id(chain_id) {
        return Err(SdkError::UnsupportedChain(chain_id));
    }
    let receipt = public_provider
        .get_transaction_receipt(hash)
        .await?
        .ok_or(SdkError::ReceiptNotFound)?;
    let mut out = Vec::new();
    for log in receipt.logs() {
        if log.address() != config::transfer_with_commitment_address() {
            continue;
        }
        if let Ok(d) = TransferWithCommitmentSent::decode_log(&log.inner) {
            out.push(d.data);
        }
    }
    Ok(out)
}

/// レシート上に、[`VerifyArgs`] と一致する `TransferWithCommitmentSent` が **少なくとも 1 件**あることを検証する。
///
/// # 引数
///
/// * `public_provider` — レシート取得用プロバイダ。
/// * `hash` — 検証対象トランザクションのハッシュ。
/// * `args` — 期待する `from` / `token` / `to` / `value` / `commitment`。
///
/// # 戻り値
///
/// - `Ok(())` — 一致するログが 1 件以上ある。
///
/// # エラー
///
/// - [`crate::SdkError::ContractNotConfigured`]
/// - [`crate::SdkError::UnsupportedChain`]
/// - [`crate::SdkError::ReceiptNotFound`]
/// - [`crate::SdkError::EventNotFound`] — 一致するログが 0 件
/// - RPC エラー
pub async fn verify<P: Provider>(
    public_provider: &P,
    hash: TxHash,
    args: &VerifyArgs,
) -> Result<(), SdkError> {
    assert_transfer_contract_configured()?;
    let chain_id = public_provider.get_chain_id().await?;
    if !is_supported_chain_id(chain_id) {
        return Err(SdkError::UnsupportedChain(chain_id));
    }
    let receipt = public_provider
        .get_transaction_receipt(hash)
        .await?
        .ok_or(SdkError::ReceiptNotFound)?;
    for log in receipt.logs() {
        if log.address() != config::transfer_with_commitment_address() {
            continue;
        }
        let Ok(wrapped) = TransferWithCommitmentSent::decode_log(&log.inner) else {
            continue;
        };
        let ev = wrapped.data;
        if ev.from == args.from
            && ev.token == args.token
            && ev.to == args.to
            && ev.value == args.value
            && ev.commitment == args.commitment
        {
            return Ok(());
        }
    }
    Err(SdkError::EventNotFound)
}

#[cfg(all(test, not(feature = "test-config")))]
mod tests {
    use alloy::primitives::{address, B256, TxHash, U256};
    use alloy::providers::ProviderBuilder;

    use super::{get_transfer_with_commitment_sent_event_logs, verify, VerifyArgs};

    fn sample_verify_args() -> VerifyArgs {
        let a = address!("0x1111111111111111111111111111111111111111");
        VerifyArgs {
            from: a,
            token: a,
            to: a,
            value: U256::from(1u64),
            commitment: B256::repeat_byte(0xaa),
        }
    }

    #[tokio::test]
    async fn get_logs_fails_when_contract_not_configured() {
        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65533".parse().unwrap());
        let hash = TxHash::repeat_byte(0xab);
        let r = get_transfer_with_commitment_sent_event_logs(&provider, hash).await;
        assert!(matches!(r, Err(crate::SdkError::ContractNotConfigured)));
    }

    #[tokio::test]
    async fn verify_fails_when_contract_not_configured() {
        let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:65532".parse().unwrap());
        let hash = TxHash::repeat_byte(0xab);
        let args = sample_verify_args();
        let r = verify(&provider, hash, &args).await;
        assert!(matches!(r, Err(crate::SdkError::ContractNotConfigured)));
    }
}
