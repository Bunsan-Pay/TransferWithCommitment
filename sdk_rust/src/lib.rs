//! # eth-twc-sdk
//!
//! **TransferWithCommitment（TWC）** 向け Ethereum クライアント SDK（EIP-712・コントラクト呼び出し・レシート検証）。
//!
//! ## Usage
//!
//! 1. **TWC アドレス** — 通常ビルドでは [`config`] のソース（[`transfer_with_commitment_address`] が返すコンパイル時定数）をデプロイ先に合わせる。`integration-test` 時のみ環境変数 `ETH_TWC_CONTRACT_ADDRESS` を参照します。
//! 2. **プロバイダ** — Alloy の [`Provider`](alloy::providers::Provider)（例: `ProviderBuilder::new().connect_http(url)`）を用意します。
//! 3. **送金** — EIP-712 委任なら [`sign`] で署名バンドルを作り [`send_transaction::signature_transfer`] で送信。`msg.sender` 送金なら [`send_transaction::self_transfer`] を直接呼びます。
//! 4. **検証** — マイニング後のトランザクションハッシュと [`VerifyArgs`] で [`verify`] を呼び、レシート上の `TransferWithCommitmentSent` を照合します。
//!
//! `msg.sender` で送金して検証する例（TWC が [`config`] に設定済みで、RPC が対応チェーンであること）。
//!
//! ```ignore
//! use alloy::primitives::{address, utils::parse_ether, B256};
//! use alloy::providers::ProviderBuilder;
//! use eth_twc_sdk::{
//!     send_transaction::self_transfer,
//!     types::SelfSingleTransferArgs,
//!     verify,
//!     VerifyArgs,
//! };
//!
//! #[tokio::main]
//! async fn main() -> Result<(), eth_twc_sdk::SdkError> {
//!     let provider = ProviderBuilder::new().connect_http("http://127.0.0.1:8545".parse().unwrap());
//!     let from = address!("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
//!     let token = address!("0x5FbDB2315678afecb367f032d93F642f64180aa3");
//!     let to = address!("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
//!     let value = parse_ether("1").unwrap();
//!     let commitment = B256::ZERO;
//!
//!     let args = SelfSingleTransferArgs {
//!         token,
//!         to,
//!         value,
//!         commitment,
//!     };
//!     let tx_hash = self_transfer::transfer(&provider, from, args).await?;
//!
//!     verify::verify(
//!         &provider,
//!         tx_hash,
//!         &VerifyArgs {
//!             from,
//!             token,
//!             to,
//!             value,
//!             commitment,
//!         },
//!     )
//!     .await?;
//!     Ok(())
//! }
//! ```
//!
//! EIP-712 署名を executor が送信し、同じく検証する例（読み取り用 Provider・署名者・executor 用ウォレット付き Provider）。
//!
//! ```ignore
//! use alloy::network::EthereumWallet;
//! use alloy::primitives::{address, utils::parse_ether, B256};
//! use alloy::providers::ProviderBuilder;
//! use alloy::signers::local::PrivateKeySigner;
//! use eth_twc_sdk::{
//!     send_transaction::signature_transfer,
//!     sign,
//!     types::SingleTransferArgs,
//!     verify,
//!     VerifyArgs,
//! };
//!
//! #[tokio::main]
//! async fn main() -> Result<(), eth_twc_sdk::SdkError> {
//!     let read_provider =
//!         ProviderBuilder::new().connect_http("http://127.0.0.1:8545".parse().unwrap());
//!
//!     let sender: PrivateKeySigner =
//!         "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
//!             .parse()
//!             .unwrap();
//!     let executor: PrivateKeySigner =
//!         "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
//!             .parse()
//!             .unwrap();
//!
//!     let token = address!("0x5FbDB2315678afecb367f032d93F642f64180aa3");
//!     let to = address!("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
//!     let value = parse_ether("1").unwrap();
//!     let commitment = B256::ZERO;
//!
//!     let signed = sign::single_transfer(
//!         &read_provider,
//!         &sender,
//!         SingleTransferArgs {
//!             from: sender.address(),
//!             to,
//!             token,
//!             executor: executor.address(),
//!             value,
//!             commitment,
//!             valid_after: None,
//!             valid_before: None,
//!         },
//!     )
//!     .await?;
//!
//!     let executor_provider = ProviderBuilder::new()
//!         .wallet(EthereumWallet::new(executor.clone()))
//!         .connect_http("http://127.0.0.1:8545".parse().unwrap());
//!     let tx_hash =
//!         signature_transfer::single_transfer(&executor_provider, executor.address(), signed).await?;
//!
//!     verify::verify(
//!         &read_provider,
//!         tx_hash,
//!         &VerifyArgs {
//!             from: sender.address(),
//!             token,
//!             to,
//!             value,
//!             commitment,
//!         },
//!     )
//!     .await?;
//!     Ok(())
//! }
//! ```
//!
//! ## 構成
//!
//! | モジュール | 役割 |
//! |------------|------|
//! | [`config`] | コントラクトアドレス・対応チェーン ID |
//! | [`sign`] | EIP-712 署名（[`Provider`](alloy::providers::Provider) + [`Signer`](alloy::signers::Signer)） |
//! | [`verify`] | トランザクションレシート上のイベント検証 |
//! | [`send_transaction::self_transfer`] | `msg.sender` による `transfer` |
//! | [`send_transaction::signature_transfer`] | 署名付き `transferWithAuthorization` / `cancelAuthorization` |
//! | [`types`] | 引数・署名済みバンドル・明細型 |
//! | [`utils`] | チェーン／domain 整合の検証ヘルパ |
//! | [`events`] | ログデコード用イベント型 |
//!
//! オンチェーン呼び出し・型生成は **alloy** に依存します。
//!
//! ## クイックリンク
//!
//! - エラー型: [`SdkError`]（署名 API は [`SdkError::FromSignerMismatch`] / [`SdkError::AuthorizerSignerMismatch`] で `from` / `authorizer` と署名キーの不一致を検出）
//! - 検証用イベント引数: [`VerifyArgs`]
//!
//! ## ドキュメントの生成
//!
//! ```text
//! cargo doc --no-deps
//! ```
//!
//! 非公開モジュール（`contract` など）を含める場合は `--document-private-items` を付けます。

pub mod config;

pub use config::transfer_with_commitment_address;
pub mod error;
pub mod sign;
pub mod types;
pub mod utils;
pub mod verify;

/// レシート解析用の `sol!` イベント定義。
pub mod events;

/// トランザクション送信（自己送金・署名付き）。
pub mod send_transaction;

/// Ethereum アドレス（[`alloy::primitives::Address`] の再エクスポート）。
pub use alloy::primitives::Address;
/// EIP-712 ドメイン（[`alloy::sol_types::Eip712Domain`] の再エクスポート）。
pub use alloy::sol_types::Eip712Domain;
/// SDK 全体で用いるエラー型。
pub use error::SdkError;
pub use types::signed_data::{
    SignedBatchTransferWithCommit, SignedCancelAuthorization, SignedTransferWithCommit,
    SignedUniCommitTransfers,
};
/// [`verify`] に渡すオフチェーン検証引数。
pub use verify::VerifyArgs;
/// `sol!` が生成する `TransferWithCommitmentSent` イベント型（[`SolEvent::decode_log`](alloy::sol_types::SolEvent::decode_log) の `.data` と同型）。
pub use events::TransferWithCommitmentSent;
pub use utils::{
    assert_provider_supported_chain, assert_signed_domain_matches_client_and_config,
    assert_signed_domain_matches_provider_and_config, is_supported_chain, is_supported_chain_id,
};

mod contract;
