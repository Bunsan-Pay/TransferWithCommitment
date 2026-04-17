//! 統合テスト用の JSON-RPC モック（`eth_chainId` のみ）。

use serde_json::json;
use wiremock::{matchers::method, Mock, MockServer, ResponseTemplate};

/// すべての `POST` を `eth_chainId` の結果 `chain_id_hex`（例: `"0x1"`）で返す簡易サーバー。
pub async fn mock_server_eth_chain_id(chain_id_hex: &str) -> MockServer {
    let server = MockServer::start().await;
    let hex = chain_id_hex.to_string();
    Mock::given(method("POST"))
        .respond_with(move |req: &wiremock::Request| {
            let body: serde_json::Value = serde_json::from_slice(&req.body).unwrap_or(json!({}));
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
