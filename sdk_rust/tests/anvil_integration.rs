//! Anvil + `contracts` デプロイに対する結合テスト。
//!
//! `scripts/test-sdk-rust-integration.sh`（docker compose ベース）から
//! `cargo test --features integration-test --test anvil_integration` で実行。

#![cfg(feature = "integration-test")]

use alloy::network::EthereumWallet;
use alloy::primitives::{address, keccak256, Address, U256};
use alloy::providers::ProviderBuilder;
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use reqwest::Url;

use eth_twc_sdk::send_transaction::{self_transfer, signature_transfer};
use eth_twc_sdk::types::{SelfSingleTransferArgs, SingleTransferArgs};
use eth_twc_sdk::verify::verify;
use eth_twc_sdk::{sign, VerifyArgs};

sol! {
    #[sol(rpc)]
    contract ERC20Mock {
        function mint(address account, uint256 amount) external;
        function approve(address spender, uint256 amount) external returns (bool);
    }
}

/// Anvil 既定アカウント #0
const ANVIL_SENDER_KEY: &str = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
/// Anvil 既定アカウント #1
const ANVIL_EXECUTOR_KEY: &str = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

fn env_addr(name: &'static str) -> Address {
    std::env::var(name)
        .unwrap_or_else(|_| panic!("{name} is required (run scripts/test-sdk-rust-integration.sh)"))
        .parse()
        .expect("invalid address")
}

fn rpc_url() -> Url {
    std::env::var("RPC_URL")
        .expect("RPC_URL is required (run scripts/test-sdk-rust-integration.sh)")
        .parse()
        .expect("invalid RPC_URL")
}

#[tokio::test]
#[ignore = "Anvil + forge デプロイが必要。scripts/test-sdk-rust-integration.sh を実行"]
async fn integration_self_call_mint_approve_transfer_verify() {
    let url = rpc_url();
    let token = env_addr("TOKEN_ADDRESS");
    let twc = env_addr("ETH_TWC_CONTRACT_ADDRESS");

    let sender_pk: PrivateKeySigner = ANVIL_SENDER_KEY.parse().expect("sender key");
    let sender_addr = sender_pk.address();
    assert_eq!(twc, eth_twc_sdk::transfer_with_commitment_address());

    let wallet = EthereumWallet::new(sender_pk.clone());
    let sender_provider = ProviderBuilder::new()
        .wallet(wallet)
        .connect_http(url.clone());
    let read = ProviderBuilder::new().connect_http(url);

    let recipient = address!("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    let value = alloy::primitives::utils::parse_ether("10").expect("parse ether");
    let commitment = keccak256("payload+nonce:self-call".as_bytes());

    let token_c = ERC20Mock::new(token, &sender_provider);
    let mint_pending = token_c
        .mint(sender_addr, alloy::primitives::utils::parse_ether("1000").unwrap())
        .send()
        .await
        .expect("mint");
    mint_pending.get_receipt().await.expect("mint receipt");

    let approve_pending = token_c
        .approve(twc, U256::MAX)
        .send()
        .await
        .expect("approve");
    approve_pending.get_receipt().await.expect("approve receipt");

    let tx_hash = self_transfer::transfer(
        &sender_provider,
        sender_addr,
        SelfSingleTransferArgs {
            token,
            to: recipient,
            value,
            commitment: commitment.into(),
        },
    )
    .await
    .expect("self transfer");

    verify(
        &read,
        tx_hash,
        &VerifyArgs {
            from: sender_addr,
            token,
            to: recipient,
            value,
            commitment: commitment.into(),
        },
    )
    .await
    .expect("verify");
}

#[tokio::test]
#[ignore = "Anvil + forge デプロイが必要。scripts/test-sdk-rust-integration.sh を実行"]
async fn integration_delegate_executor_sign_send_verify() {
    let url = rpc_url();
    let token = env_addr("TOKEN_ADDRESS");
    let twc = env_addr("ETH_TWC_CONTRACT_ADDRESS");
    assert_eq!(twc, eth_twc_sdk::transfer_with_commitment_address());

    let sender_pk: PrivateKeySigner = ANVIL_SENDER_KEY.parse().expect("sender key");
    let executor_pk: PrivateKeySigner = ANVIL_EXECUTOR_KEY.parse().expect("executor key");
    let sender_addr = sender_pk.address();
    let executor_addr = executor_pk.address();

    let read = ProviderBuilder::new().connect_http(url.clone());

    let executor_wallet = EthereumWallet::new(executor_pk);
    let executor_provider = ProviderBuilder::new()
        .wallet(executor_wallet)
        .connect_http(url.clone());

    let recipient = address!("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
    let value = alloy::primitives::utils::parse_ether("7").expect("parse ether");
    let commitment = keccak256("delegate-executor-seq".as_bytes());

    let sender_wallet = EthereumWallet::new(sender_pk.clone());
    let sender_provider = ProviderBuilder::new()
        .wallet(sender_wallet)
        .connect_http(url);

    let token_c = ERC20Mock::new(token, &sender_provider);
    let mint_pending = token_c
        .mint(sender_addr, alloy::primitives::utils::parse_ether("1000").unwrap())
        .send()
        .await
        .expect("mint");
    mint_pending.get_receipt().await.expect("mint receipt");

    let approve_pending = token_c
        .approve(twc, U256::MAX)
        .send()
        .await
        .expect("approve");
    approve_pending.get_receipt().await.expect("approve receipt");

    let signed = sign::single_transfer(
        &read,
        &sender_pk,
        SingleTransferArgs {
            from: sender_addr,
            to: recipient,
            token,
            executor: executor_addr,
            value,
            commitment: commitment.into(),
            valid_after: None,
            valid_before: None,
        },
    )
    .await
    .expect("sign");

    let tx_hash = signature_transfer::single_transfer(&executor_provider, executor_addr, signed)
        .await
        .expect("signature transfer");

    verify(
        &read,
        tx_hash,
        &VerifyArgs {
            from: sender_addr,
            token,
            to: recipient,
            value,
            commitment: commitment.into(),
        },
    )
    .await
    .expect("verify");
}
