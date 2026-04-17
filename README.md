# TransferWithCommitment

任意のコミットメントともにERC20トークンを送金したことを証明

| directory    | summary          |
| ------------ | ---------------- |
| `/contracts` | コントラクト実装 |
| `/sdk_js`    | Javascript SDK   |
| `/sdk_rust`  | Rust SDK         |

### Features

- 任意のcommitmentをオンチェーンで結びつけた送金、commitmentの生成schemaと元データとtxidを知る者のみが検証できる
- 各送金情報ごとにcommitmentを含めるバッチ送金
- 複数の送金情報にまとめて一つのcommitmentに結びつけるUnifiedTransfers

### Requirements

- 送金者の署名は1回だけ
- 送金情報と任意のコミットメントを含めたイベントを発行すること
- コミットメントには唯一性があること
- schemaと元データとtxidを知る者ならばいつでも検証可能であること

### Constraints

- 資金決済法上の交換業や電取業などに抵触しないこと
  - 他人のために他人の資産をカストディしない
  - 暗号資産や電子決済手段の売買をしない
  - 投資勧誘や取引の斡旋をしない

## OVERVIEW

### Self-Call

```mermaid
---
title: TransferWithCommitment self-call
---
graph LR
    subgraph Offchain[Off-chain]
        Sender([Sender])
        Verifier([Verifier])
        Proof(Commitment<br/>generator)
    end
    subgraph Onchain[Ethereum]
        subgraph Extention[TransferWithCommitment contract]
            Access(Access / Policy)
            Commit[(Commitment<br/>registory)]
            Event(Event<br/>emission)
        end
        Token(ERC-20 Token)
        Block[(Block)]
    end
    Sender -->|Call transfer| Access
    Sender -->|"Send info<br/>(payload, nonce, TxId)"| Verifier
    Sender -->Proof
    Proof -->|Include commitment| Access
    Access -->|Store used commitment| Commit
    Access -->|Emit event| Event
    Event -->|Include to Tx| Block
    Block -->|Get Tx receipt| Verifier
    Sender -->|approve| Token
    Access -->|Call<br/>transferFrom| Token
    Verifier -->|Notice schema| Sender
```

### Signature-Transfer

```mermaid
---
title: TransferWithCommitment signature-transfer
---
graph LR
    subgraph Offchain[Off-chain]
        Sender([Sender])
        Verifier([Verifier])
        Proof(Commitment<br/>generator)
        Signer(Signer)
        Executor([Executor])
    end
    subgraph Onchain[Ethereum]
        subgraph Extention[TransferWithCommitment contract]
            Access(Access / Policy<br/>)
            Commit[(Commitment<br/>registory)]
            Event(Event<br/>emission)
        end
        Token(ERC-20 Token)
        Block[(Block)]
    end
    Executor -->|Call transferWithAuthorization| Access
    Sender -->|Send metadata| Verifier
    Sender --> Proof
    Sender -->|Sign typed data| Signer
    Proof -->|Include commitment| Signer
    Signer -->|Send<br/>payload, signature| Executor
    Access -->|Store used commitment| Commit
    Access -->|Emit event| Event
    Event -->|Include to Tx| Block
    Block -->|Get Tx receipt| Verifier
    Sender -->|approve| Token
    Access -->|EIP-712 digest +<br/>SignatureChecker| Access
    Access -->|Call<br/>transferFrom| Token
    Verifier -->|Notice schema| Sender
```

## SEQUENCE

### Self-Call

```mermaid
sequenceDiagram
    title Self-Call Diagram
    autonumber
    participant Verifier@{"type": "actor"}
    participant Sender@{"type": "actor"}
    box Gray Ethereum
        participant Contract
        participant Token
        participant Block@{"type": "database"}
    end
    Sender->>Token: Call(One time only)<br/>approve(contractAddress, type(uint256).max)
    Verifier->>Sender: Send verifiable schema
    Note over Sender: Create<br/>payload, commitment<br/><br/>commitment = H(payload, nonce)
    Sender->>+Contract: Call<br/>transfer(token, to, value commitment)
    Contract->>Token: Call<br/>transferFrom(msg.sender, to, value)
    Contract->>Block: Emit event<br/>(msg.sender, to, token, value, commitment)
    Contract-->>-Sender: Receive TxId
    Sender->>+Verifier: Send<br/>(payload, nonce, TxId)
    Verifier->>+Block: Fetch receipt from TxId
    Block-->>-Verifier: Receive receipt
    Note over Verifier: Parse event from receipt
    Note over Verifier: Verify<br/>signature, commitment<br/>commitment = H(payload, nonce)
    Verifier-->>-Sender: Done
```

### Delegate to Executor

```mermaid
sequenceDiagram
    title Delegate to Executor Diagram
    autonumber
    participant Verifier@{"type": "actor"}
    participant Sender@{"type": "actor"}
    participant Executor@{"type": "control"}
    box Gray Ethereum
        participant Contract
        participant Token
        participant Block@{"type": "database"}
    end
    Sender->>Token: Call(One time only)<br/>approve(contractAddress, type(uint256).max)
    Verifier->>Sender: Send verifiable schema
    Note over Sender: Create<br/>payload, commitment<br/><br/>commitment = H(payload, nonce)
    Note over Sender: Sign typed data for delegating transfer<br/><br/>additionalInclude:<br/>executor, commitment, validAfter, validBefore
    Sender->>+Executor: Send<br/>(typed data, nonce, signature)
    Executor->>+Contract: Call<br/>transferWithAuthorization
    Note over Contract: Verify typed data
    Contract->>Token: Call<br/>transferFrom(msg.sender, to, value)
    Contract->>Block: Emit event<br/>(msg.sender, to, token, value, commitment)
    Contract-->>-Executor: Receive TxId
    Executor-->>-Sender: Receive TxId
    Sender->>+Verifier: Send<br/>(payload, nonce, TxId)
    Verifier->>+Block: Fetch receipt from TxId
    Block-->>-Verifier: Receive receipt
    Note over Verifier: Parse event from receipt
    Note over Verifier: Verify<br/>signature, commitment<br/>commitment = H(payload, nonce)
    Verifier-->>-Sender: Done
```

### OneTime Receive-Verify

```mermaid
sequenceDiagram
    title OneTime Receive-Verify Diagram
    autonumber
    participant Verifier@{"type": "actor"}
    participant Sender@{"type": "actor"}
    box Gray Ethereum
        participant Contract
        participant Token
        participant Block@{"type": "database"}
    end
    Sender->>Token: Call(One time only)<br/>approve(contractAddress, type(uint256).max)
    Verifier->>Sender: Send verifiable schema
    Note over Sender: Create<br/>payload, commitment<br/><br/>commitment = H(payload, nonce)
    Note over Sender: Sign typed data for delegating transfer<br/><br/>additionalInclude:<br/>executor, commitment, validAfter, validBefore<br/>executor = Verifier
    Sender->>+Verifier: Send<br/>(typed data, nonce, signature)
    Note over Verifier: Verify<br/>signature, commitment<br/>commitment = H(payload, nonce)
    Verifier->>+Contract: Call<br/>transferWithAuthorization
    Note over Contract: Verify typed data
    Contract->>Token: Call<br/>transferFrom(msg.sender, to, value)
    Contract->>Block: Emit event<br/>(msg.sender, to, token, value, commitment)
    Contract-->>-Verifier: Done
    Verifier-->>-Sender: Done
```

## Development

ローカルの CI 再現と SDK 結合テストは、すべてリポジトリルートの [`docker/compose.yml`](docker/compose.yml) が提供する隔離コンテナで実行する。ホスト側の必要要件は **`docker` + `docker compose`（v2）のみ** で、`forge` / `anvil` / `cast` / `slither` / `bun` / `cargo` / `python` / `uv` などのホストインストールは不要。

| 目的 | コマンド |
|------|---------|
| contracts の CI（forge fmt/build/test + slither） | `./scripts/ci-contracts.sh` |
| Slither 監査バンドルのみ | `./scripts/slither.sh` |
| sdk_js 結合テスト（anvil + デプロイ + bun test） | `./scripts/test-sdk-js-integration.sh` |
| sdk_rust 結合テスト（anvil + デプロイ + cargo test） | `./scripts/test-sdk-rust-integration.sh` |
| キャッシュ・ボリュームを全て破棄 | `docker compose -f docker/compose.yml down -v` |

GitHub Actions（[.github/workflows/contracts-ci.yml](.github/workflows/contracts-ci.yml)）も同じ compose サービスを呼び出すため、ローカルと CI のフローは一致する。
