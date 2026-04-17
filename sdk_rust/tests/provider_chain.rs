//! [`eth_twc_sdk::assert_provider_supported_chain`] の JSON-RPC モック検証。

mod common;

use alloy::providers::ProviderBuilder;
use eth_twc_sdk::assert_provider_supported_chain;
use eth_twc_sdk::SdkError;

#[tokio::test]
async fn assert_provider_supported_chain_ok_for_mainnet() {
    let server = common::mock_server_eth_chain_id("0x1").await;
    let url = server.uri().parse().unwrap();
    let provider = ProviderBuilder::new().connect_http(url);
    assert!(assert_provider_supported_chain(&provider).await.is_ok());
}

#[tokio::test]
async fn assert_provider_supported_chain_err_for_unknown_chain() {
    let server = common::mock_server_eth_chain_id("0xf423f").await; // 999999
    let url = server.uri().parse().unwrap();
    let provider = ProviderBuilder::new().connect_http(url);
    let r = assert_provider_supported_chain(&provider).await;
    assert!(matches!(r, Err(SdkError::UnsupportedChain(999_999))));
}
