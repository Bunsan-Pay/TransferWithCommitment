//! トランザクションレシートのログからイベントをデコードするための定義（コントラクト ABI と同一シグネチャ）。
//!
//! [`crate::verify`] は RPC ログの **`inner`**（`alloy_primitives::Log`）を `decode_log` に渡してデコードします。

use alloy::sol;

sol! {
    /// 送金が実行されたことを示すイベント（`indexed` 付きトピックとデータペイロード）。
    event TransferWithCommitmentSent(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 value,
        bytes32 commitment
    );
}
