//! 統合テスト用の JSON-RPC モック（`eth_chainId` / `eth_getCode`）。

use serde_json::json;
use wiremock::{matchers::method, Mock, MockServer, ResponseTemplate};

/// `eth_chainId` と `eth_getCode` をリクエストごとに返すモック（TWC デプロイ検証用）。
pub async fn mock_server_chain_and_code(chain_id_hex: &str, code_hex: &str) -> MockServer {
    let server = MockServer::start().await;
    let cid = chain_id_hex.to_string();
    let code = code_hex.to_string();
    Mock::given(method("POST"))
        .respond_with(move |req: &wiremock::Request| {
            let body: serde_json::Value = serde_json::from_slice(&req.body).unwrap_or(json!({}));
            let id = body.get("id").cloned().unwrap_or(json!(1));
            let m = body.get("method").and_then(|x| x.as_str()).unwrap_or("");
            let result = match m {
                "eth_chainId" => json!(cid.clone()),
                "eth_getCode" => json!(code.clone()),
                _ => json!(null),
            };
            ResponseTemplate::new(200).set_body_json(json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": result
            }))
        })
        .mount(&server)
        .await;
    server
}
