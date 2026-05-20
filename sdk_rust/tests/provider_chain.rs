//! [`eth_twc_sdk::assert_provider_supported_chain`] の JSON-RPC モック検証（`eth_getCode` によるデプロイ確認）。

mod common;

use alloy::providers::ProviderBuilder;
use eth_twc_sdk::assert_provider_supported_chain;
use eth_twc_sdk::SdkError;

#[tokio::test]
async fn assert_provider_supported_chain_ok_when_code_present() {
    let server = common::mock_server_chain_and_code("0x1", "0x6000").await;
    let url = server.uri().parse().unwrap();
    let provider = ProviderBuilder::new().connect_http(url);
    assert!(assert_provider_supported_chain(&provider).await.is_ok());
}

#[tokio::test]
async fn assert_provider_supported_chain_err_when_expected_address_has_no_code() {
    let server = common::mock_server_chain_and_code("0xf423f", "0x").await; // chain 999999, empty code
    let url = server.uri().parse().unwrap();
    let provider = ProviderBuilder::new().connect_http(url);
    let r = assert_provider_supported_chain(&provider).await;
    assert!(matches!(
        r,
        Err(SdkError::ContractNotDeployed {
            chain_id: 999_999,
            ..
        })
    ));
}
