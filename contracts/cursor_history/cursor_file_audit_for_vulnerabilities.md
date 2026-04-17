# File audit for vulnerabilities
_Exported on 2026/4/1 at 14:32:12 JST from Cursor (2.6.22)_

---

**User**

@README.md @SPEC.md @src @test これらを見て、脆弱性や見落としなどがないか監査して

---

**Cursor**

README、SPEC、ソース、テストを読み、セキュリティ観点で監査します。



実装を詳しく読みます。



`TransferWithCommitmentDigest` と `State` のテストを確認します。



以下は、README・SPEC・`src`・`test` を踏まえた**設計・実装レベルの監査メモ**です。本回答はコード変更を伴いません（Ask モード）。

---

## 総評

コアは **EIP-712 + `from` ごとの commitment ビットマップ + `nonReentrant` + allowance チェック**で、典型的な「署名付き送金」「コミットメント再利用防止」の筋は通っています。SPEC にもあるとおり **Owner が `verifier` を差し替えられる点**が最大の信頼前提です。

---

## 高・中：運用・信頼モデル

1. **`verifier` と `owner` の権限**  
   `updateVerifier` は `onlyOwner`。悪意のある verifier は署名検証を常に成功／失敗させられます。SPEC 253–237 行付近の記載どおり、**Owner 鍵の侵害 = プロトコル全体の侵害**です。マルチシグ・タイムロック等はコード外の対策になります。

2. **`verifier` を `address(0)` にできないか**  
   コントラクト側に `address(0)` 禁止がなく、`updateVerifier(0)` 後は `IVerifier(0).verify` が未定義動作になり得ます。**デプロイ・運用で禁止する**か、オンチェーン検証があると安全です。

---

## 中：仕様・クライアント実装の齟齬リスク

3. **EIP-712 の「型文字列」と実際の structHash の対応**  
   単発送金は `abi.encode(TYPEHASH, from, to, token, msg.sender, value, validAfter, validBefore, commitment)` で一貫しています。  
   一方、バッチ系は `Hash` で **配列を `keccak256(abi.encodePacked(各明細ハッシュ…))`** としており、ウォレットが標準 EIP-712 の配列エンコードと**別実装**だと、**オフチェーンで組んだ署名がチェーンと一致しない**可能性があります。テストは `Hash` と同じ手順で署名しているため**リポジトリ内は整合**していますが、**第三者ウォレットをそのまま使う前提だと互換性リスク**があります。

4. **インターフェースと `Hash.sol` のコメントの不一致**  
   `ISignatureTransfer.sol` のコメントは `spender` ですが、`Hash.sol` は `executor` です（```6:8:src/SignatureTransfer/Hash.sol``` と ```7:12:src/SignatureTransfer/ISignatureTransfer.sol```）。**TYPEHASH を文字列から再計算する実装**を書くとバグりやすいので、仕様書・コメントの統一は推奨です（セキュリティというより実装バグ源）。

---

## 中・低：挙動の罠

5. **有効期限が厳密な不等号**  
   `validTimestamp` は `block.timestamp > validAfter` かつ `block.timestamp < validBefore`（```32:35:src/SignatureTransfer/SignatureTransfer.sol```）。**境界の瞬間は無効**です。仕様として明示されていればよいですが、オフチェーンで「ちょうど validAfter」で実行しようとすると失敗します。

6. **`validAfter` / `validBefore` の整合は未チェック**  
   `validBefore <= validAfter` のような誤設定はコントラクトでは弾かれず、**永久に実行不能な署名**になり得ます。ユーザ／フロントのバリデーション領域です。

7. **署名付きバッチ `CommittedTransferDetail[]` で空配列**  
   外側に `replayGuard` がないため、**空の `details` で署名が通れば、理論上は同じ署名を何度も成功させられる**（オンチェーンではトークン移動なし）。資金盗難には直結しにくい一方、**ログスパムやオフチェーンの「digest 消費」設計**と食い違う可能性があります。

8. **Self の `transfer(TransferDetail[], commitment)` で空配列**  
   `replayGuard` は先に走るため、**コミットメントだけ消費して送金ゼロ**にできます（自己DoS）。攻撃というより利用者のフットガンです。

9. **`cancelAuthorization` に `nonReentrant` がない**  
   ERC-1271 検証中にスマートウォレットが他の `external` を呼ぶ**再入は理論上可能**です。ただし `replayGuard` の順序と commitment の消費により、**同じ commitment の二重キャンセル**は防げます。ERC-20 の `nonReentrant` と組み合わせた「クロスファンクション再入」の可否は、**検証コールバック内で何を許すか**の設計次第で、一般的には **signer（ウォレット）を信頼するモデル**に収まります。

---

## 低：トークン・ERC20 周り

10. **手数料トークン・rebasing**  
    `allowance >= value` のあと `safeTransferFrom(from, to, value)` のみで、**受取額が `value` 未満になるトークン**は想定外になり得ます。ラッパーとしてはよくある注意です。

11. **`nonReentrant` + `SafeERC20`**  
    悪意ある ERC777 的コールバックからの再入は、送金系の `nonReentrant` で抑止されています（```67:67:src/SignatureTransfer/SignatureTransfer.sol``` 等）。

---

## 設計上は妥当と判断した点（簡潔）

- **`replayGuard` が本体より先に commitment をセットするが、失敗時はトランザクション全体が revert**するため、単発署名送金で allowance 不足のときに commitment が消費されないのは正しいです。  
- **バッチで同一 commitment が二重**の場合、2 行目で `replayGuard` が revert（Self 側テストで確認済み）。  
- **`cancel` 後に同じ commitment で送金できない**こともテストでカバーされています。  
- **Self と Signature で同一 `from` の commitment 空間を共有**するため、一方で使った commitment を他方で再利用することはできません（意図どおりなら問題なし）。

---

## テストで薄い可能性がある箇所（見落としになりやすい）

- 署名付き **`CommittedTransferDetail[]` の空配列**の挙動・リプレイ。  
- **境界タイムスタンプ**（`validAfter` / `validBefore` ちょうど）。  
- **EIP-712 を「標準ウォレットの JSON スキーマだけ」で組んだ場合**とオンチェーン `Hash` の一致確認（結合テスト）。

---

## まとめ

**資金を直接盗む型の論理バグ**は、読んだ範囲では目立ちません。**Owner／verifier 信頼**、**EIP-712 バッチのハッシュ手順とウォレット実装の一致**、**境界の有効期限**、**空バッチ・空 Self バッチ**が、主なリスク・仕様ギャップです。本格的なデプロイ前には、**Slither / aderyn 等の静的解析**と、**想定ウォレットでの署名一致 E2E**を足すと安心です。

必要なら Agent モードで、コメント統一・`verifier != address(0)`・テスト追加などに落とし込めます。

---

**User**

2, 4, 6, 7, 8, 9に対処しました。再度監査をお願いします。また、コードを参照して、必要があれば@SPEC.md を更新してください。
5に関しては@SPEC.md に追記してください。
6に関しては`validAfter: 有効になる時刻,validBefore: 無効になる時刻`なので、やるとしたら`validAfter<=validBefore`であるべきです。なので、それに基づいて実装しました。
10は非対応とします。それも追記してください。

---

**Cursor**

前回指摘した観点（2,4,6,7,8,9）を反映したとのことなので、まずはリポジトリの差分（`git diff`）と現行コードを確認します。その上で、もう一度脆弱性/見落としを監査し、必要なら `@SPEC.md` を追記・修正します。

反映状況をもう一度確認します。いま手元の `src` を読むと `verifier!=0`、`validAfter<=validBefore`、`details.length>0`、`cancelAuthorization` の `nonReentrant` などが入っているのは見えましたが、`git diff` に出ていないので、まず差分の実体（未追跡/反映漏れ/別ブランチ）を特定します。

現状、`git diff` がソース差分を示していないのは、リポジトリ自体がまだ未コミット/未追跡状態っぽい（`HEAD` が無い）ためです。なので監査は「いま読める現行コード」と「現行の `SPEC.md` 記載」を基準に再評価します。まず `SPEC.md` の該当追記（5,6,10）を確認します。

`SPEC.md` を見る限り、コード側で反映したはずの `validAfter<=validBefore`、`details.length > 0`、`cancelAuthorization` の `nonReentrant`、`verifier != address(0)`、さらにトークン前提（デフレ/リベース非対応）はまだ表の記述と一致していないようです。次に `SPEC.md` の該当テーブル行を、現行コードに合わせて書き換えます。あわせて「手数料・リベースERC20非対応」を追記します。

`SPEC.md` の該当箇所（`SelfTransfer`/`SignatureTransfer` の前提条件テーブル、`validTimestamp`、`cancelAuthorization`、最後の「要求との対応」）を、現行 `src` の挙動に合わせて書き換えます。特に `validAfter<=validBefore`、空 `details` 非許容、`nonReentrant` 付与、そして「デフレ/リベース ERC20 非対応」の追記を入れます。

`@SPEC.md` は、現行 `src` の挙動に合わせて再整合しました（`validAfter<=validBefore`、`details.length > 0`、`cancelAuthorization` の `nonReentrant`、および「手数料・リベース ERC20 非対応」追記）。その上で、改めて監査結果を整理します。

## 懸念点（残っているリスク / 見落としになりうる点）

1. `verifier` の信頼前提（高）
   - `updateVerifier()` は `owner()` だけが呼べますが、**owner キーが侵害されると署名検証の完全な回避/DoSが可能**です。これは実装上の根本前提で、今回の `address(0)` ガード追加は「誤設定による詰み」を減らすだけです。
   - 参照: `src/SignatureTransfer/SignatureTransfer.sol`（`updateVerifier`）、`SPEC.md`（owner 侵害の記述）

2. オフチェーン側の EIP-712 互換実装ミス（中）
   - とくにバッチ系は `Hash.hashBatchCommitedTransferDetails(details)` / `Hash.hashBatchTransferDetails(details)` と同一手順（各要素を `keccak256(abi.encode(...))` → `keccak256(abi.encodePacked(hashes))`）で折り畳まないと、署名が「無効」になります（逆に言うと、ここを厳密に合わせる必要がある）。
   - `SPEC.md` には「同手順で折り畳み」旨を明記し直しましたが、**クライアント/ウォレット実装の一貫性**は引き続き運用上の重要点です。

3. `verifier` を EOA/不正コントラクトにしてしまう運用リスク（中）
   - `address(0)` は弾くようになりましたが、**コントラクトかどうか、期待する `verify()` を持つか**の検証はありません（誤設定だと全署名系が機能停止し得ます）。
   - 追加で `code.length` チェック等を仕様/実装に入れる選択肢はあります（今回は未対応でも致命ではないですが、DoS要因になります）。

4. `details` 配列長の上限がない（低〜中）
   - ループで全要素を処理するため、極端に長い配列はガス消費/実行不能（out-of-gas）になり得ます。
   - これは「攻撃というより DoS/UX」寄りですが、署名側が意図した件数に制限する運用（またはコントラクト側上限）を検討余地があります。

## 今回 “対処済み” として再確認できた点

- `validTimestamp` の境界と整合
  - 実装: `validAfter<=validBefore` を require し、`block.timestamp > validAfter` かつ `< validBefore`（境界は不許可）
  - `SPEC.md` にも同内容を追記済みです。

- 空 `details` 非許可
  - 実装: Self / Signature 双方で `require(details.length > 0)`
  - `SPEC.md` にも反映済みです。

- `cancelAuthorization` の `nonReentrant`
  - 実装に合わせて `SPEC.md` へ反映済みです。

- 「手数料・リベース ERC20 非対応」
  - `SPEC.md` の要約テーブルに追記済みです（`value` と実受取額のズレをコントラクト側では検証できないため）。

## 追加で確認したいこと（質問）
`verifier` の運用は「owner が単独」前提のままですか？ もしマルチシグ/タイムロック等を使う予定があるなら、その前提を `SPEC.md` の信頼モデルにも反映できます。

---

**User**

verifierの運用に関しては、このプロジェクトが現状個人開発で管理者が自分一人だけなんだけど、どうすればいいかな？

---

**Cursor**

`verifier` の運用は、この設計だと **`Ownable` の `owner` を守れるかにほぼ尽きます**。`updateVerifier()` で verifier を差し替えられるため、もし `owner` の鍵が侵害されると、悪意ある verifier によって「無効な署名でも通る」状態になり、`from` が既に `allowance` を出している限り不正送金できる余地が出ます（重大）。

個人開発で管理者が自分一人だけの場合の現実的な選択肢を、優先度順にまとめます。

## 1. まずは「更新を凍結」できないか検討（最も安全）
- `verifier` の実装が十分監査済みで、将来的な差し替えが不要なら、**次のデプロイでは `owner` を `address(0)`（またはコントロール不能なアドレス）にして upgrade 不能**にするのが一番事故が減ります。
- トレードオフは「バグが見つかっても `verifier` を差し替えられない」点です。

## 2. 差し替えを許すなら「owner を multisig / timelock にする」
単独でも、実質的に鍵を複数管理に寄せるのがコツです。

- `owner` を Gnosis Safe などの **2/3 multisig** にする（自分1人でも、鍵を 2〜3 個のデバイス/バックアップに分散）
- さらに可能なら **Timelock** 経由にして、更新が即時反映されないようにする（“侵害されても気づく猶予”を作る）

このプロジェクトは実装的にガードが “`onlyOwner`” しかないので、ここを governance レイヤで補うのが安全です。

## 3. 「更新手順」を運用で堅くする（技術追加なしでできる）
コード変更なしでできるガードです。

- `updateVerifier()` を呼ぶための鍵は **普段は決して使わない**（普段の送金やデプロイと分離）
- hardware wallet（またはオフライン署名）で署名する
- 新しい verifier を差し替える前に、少なくとも
  - コントラクトのソース/バイナリが期待通りか
  - `verify()` が「想定外に true を返さない」こと（テスト・監査）
  - 既存署名系（EOA/ERC-1271）が壊れていないこと
  を確認するランブック化

## 4. 監視（Detection）を入れる
侵害の前提で「気づける」ことも重要です。
- チェーン監視で `verifier` が変わったトランザクションをアラート
- その後の送金イベント `TransferWithCommitmentSent` が急増していないか監視
（このあたりはコード追加でイベントを増やすより、まず運用で十分効きます）

---

確認したいです：
1. `verifier` は将来的に差し替える予定がありますか？（耐量子対応で必要になる想定？）
2. upgrade は「ゼロに近づけたい」か「必要なら安全にできればOK」か、どちらの方針ですか？

これが分かると、「凍結（owner=0 で upgrade不可）」と「multisig/timelock」をどこまで強めるべきか、あなたの前提に合わせて提案を絞れます。

---

**User**

方針転換した
現状ethereumのPQアップデートの指針が固まっていない以上、現在のベストプラクティスに則りownableやupgradeといったガバナンスリスクがあるものを避けて直接openzeppelinのsignature checkerを利用するEOA,ERC-1271に対応したimmutableなコントラクトにするね
@src/SignatureTransfer/SignatureTransfer.sol @src/SignatureTransfer/ISignatureTransfer.sol でverifierとupdateVerifierとOwnableの継承と初期化を削除し、署名検証を直接`SignatureChecker.isValidSignatureNow()`で検証するようにした
そしてsrc/SignatureTransfer/Verifierディレクトリをすべて削除し、@src/TransferWithCommitment.sol の初期化も修正した
コントラクトコードは修正したから、@src 全体を見渡して、前回の修正も含めテストが足りていない部分を@test に追加して、また@SPEC.md も@src に合わせて修正して
もしテストが通らないもしくは@src で抜け漏れを見つけたら教えて

---

**Cursor**

`src` と `test` の現状を確認し、テスト追加と `SPEC.md` の更新を進めます。



`SignatureTransfer.sol` に未使用の `Ownable` import が残っています。テスト類と `SPEC.md` を読み、修正します。



`SignatureTransfer.sol` から未使用の `Ownable` import を削除し、テスト・ヘルパー・`SPEC.md` を一括更新します。



テストは全て成功しました。`SPEC.md` を `src` に合わせて全面更新します。



SelfTransfer の空 `details` テストを追加し、`forge fmt` を実行します。



## 実施内容

### `src` の抜け漏れ
- `SignatureTransfer.sol` に **未使用の `Ownable` import** が残っていたため削除しました（継承はしていませんでした）。

### テスト (`test/`)
- **`SignatureTransfer.t.sol`**: `Verifier` / `owner` / `updateVerifier` を削除し、`TransferWithCommitmentDigest("TWC","1")` のみに変更。revert 文言を現行実装に合わせました。  
  **追加**: `validAfter > validBefore`、空 `details`（署名バッチ2種）、**ERC-1271**（`ERC1271WalletMock` ベースの `ERC1271WalletWithApprove` + 署名は owner の EOA）。
- **`SelfTransfer.t.sol`**: コンストラクタを `new TransferWithCommitment("TWC","1")` に変更。  
  **追加**: 空 `details` の revert（2種）。
- **`TransferWithCommitment.t.sol`**: EIP-712 ドメインのみ検証（owner/verifier なし）。
- **`test/SignatureTransfer/Verifier.t.sol`**: 削除（`Verifier` コントラクト廃止のため）。
- **`test/helpers/TransferWithCommitmentDigest.sol`**: `(name, version)` のみ。

### `SPEC.md`
- `Verifier.sol` / `IVerifier` / `updateVerifier` / `Ownable` 前提を削除し、**`SignatureChecker.isValidSignatureNow`**・**immutable**・PQ は **再デプロイ想定** に更新。
- クラス図・`SignatureTransfer` 説明・要件テーブル・`TransferWithCommitment` / `State` の記述を `src` に整合。

### テスト結果
`forge test`: **33 tests すべて PASS**。

---

## 補足（仕様上の注意）
- ダイアグラム内の **「Verifier」はオフチェーンの検証者アクター**の意味で残しています（オンチェーンの `Verifier` コントラクトとは別物）。混乱しやすければノード名を `OffchainVerifier` などに変えると分かりやすいです。

---

**User**

@SPEC.md の一貫性のために、CONTRACT IMPLEMENTATIONのOverviewの箇条書き部分を日本語に直して

---

**Cursor**

Overview の英語箇条書きと冒頭の説明文を日本語に統一します。



228行目の重複表現を修正します。



対応しました。変更内容は次のとおりです。

1. **Overview 冒頭**（図の直前）  
   - `OpenZeppelin_*.sol` の意味を、日本語で「便宜上の表記であり実ファイル名ではない」と説明する文に置き換え。

2. **各ファイルの箇条書き**（`TransferWithCommitment.sol` ～ `Hash.sol`）  
   - 内容は維持したまま、仕様書の他節と揃うよう**日本語**に翻訳。  
   - `SignatureTransfer.sol` の技術用語（EIP-712、EOA、ERC-1271、PQ、再デプロイなど）はそのまま残し、説明だけ日本語化。

3. **表記の微修正**  
   - 「デプロイ後は実装は」→「デプロイ後の実装は」に修正。
