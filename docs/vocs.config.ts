import { defineConfig } from "vocs";

const architectureSidebar = [
  { text: "Overview", link: "/architecture" },
  { text: "Fundamentals", link: "/architecture/fundamentals" },
  { text: "構成図", link: "/architecture/overview-graphs" },
  { text: "シーケンス図", link: "/architecture/sequences" },
  { text: "リポジトリマップ", link: "/architecture/repository-map" },
];

const contractsSidebar = [
  { text: "Overview", link: "/contracts" },
  { text: "クラス／継承図", link: "/contracts/class-diagram" },
  { text: "State とリプレイ防止", link: "/contracts/state-and-replay" },
  { text: "Events と Hash", link: "/contracts/events-and-hash" },
  { text: "SelfTransfer", link: "/contracts/self-transfer" },
  { text: "SignatureTransfer", link: "/contracts/signature-transfer" },
  {
    text: "仕様上の要点",
    link: "/contracts/specification-highlights",
  },
  {
    text: "Reference",
    items: [
      { text: "共有型 (Structs / Events)", link: "/contracts/reference/types" },
      { text: "State", link: "/contracts/reference/state" },
      { text: "SelfTransfer", link: "/contracts/reference/self-transfer" },
      {
        text: "SignatureTransfer",
        link: "/contracts/reference/signature-transfer",
      },
      { text: "Hash", link: "/contracts/reference/hash" },
      {
        text: "TransferWithCommitment",
        link: "/contracts/reference/transfer-with-commitment",
      },
    ],
  },
];

const contributingSidebar = [
  { text: "Overview", link: "/contributing" },
  {
    text: "Monorepo",
    items: [
      { text: "CI と開発フロー", link: "/contributing/monorepo-ci" },
      { text: "リポジトリ構成と規約", link: "/contributing/repository-layout" },
      { text: "ドキュメントサイト", link: "/contributing/docs-site" },
    ],
  },
  {
    text: "Contracts",
    items: [
      {
        text: "開発・ツールチェーン",
        link: "/contributing/contracts-development",
      },
    ],
  },
  {
    text: "SDK (JS)",
    items: [
      { text: "リリースと公開手順", link: "/contributing/sdk-js-release" },
      { text: "内部 API", link: "/contributing/sdk-js-internals" },
    ],
  },
  {
    text: "SDK (Rust)",
    items: [
      { text: "リリースと公開手順", link: "/contributing/sdk-rust-release" },
      { text: "feature フラグ", link: "/contributing/sdk-rust-feature-flags" },
      { text: "結合テスト", link: "/contributing/sdk-rust-integration-tests" },
      { text: "内部 API", link: "/contributing/sdk-rust-internals" },
    ],
  },
];

const sdkJsIntro = [
  { text: "Why", link: "/sdk-js/introduction/why" },
  { text: "Installation", link: "/sdk-js/introduction/installation" },
  { text: "Getting Started", link: "/sdk-js/introduction/getting-started" },
  { text: "Compatibility", link: "/sdk-js/introduction/compatibility" },
  { text: "FAQ", link: "/sdk-js/introduction/faq" },
];

const sdkJsGuides = [
  {
    text: "Tutorial: Self-Call (end-to-end)",
    link: "/sdk-js/guides/tutorial-self-call",
  },
  {
    text: "Tutorial: EIP-712 + Executor",
    link: "/sdk-js/guides/tutorial-signature-executor",
  },
  {
    text: "Tutorial: verify（レシート検証）",
    link: "/sdk-js/guides/tutorial-verify",
  },
  { text: "Commitment の生成", link: "/sdk-js/guides/commitment" },
  {
    text: "EIP-712 domain とゼロ salt",
    link: "/sdk-js/guides/eip712-domain-salt",
  },
  {
    text: "Off-chain verification の限界",
    link: "/sdk-js/guides/verification-limits",
  },
  { text: "エラーと切り分け", link: "/sdk-js/guides/errors" },
];

const sdkJsApi = [
  {
    text: "Import パス一覧（package.json exports）",
    link: "/sdk-js/api/exports",
  },
  { text: "`config`", link: "/sdk-js/api/config" },
  { text: "`utils`", link: "/sdk-js/api/utils" },
  { text: "署名（`signatureTransfer/*/sign`）", link: "/sdk-js/api/sign" },
  { text: "`verify`", link: "/sdk-js/api/verify" },
  { text: "`selfTransfer/*`", link: "/sdk-js/api/self-transfer" },
  {
    text: "`signatureTransfer/*` の `sendTx`",
    link: "/sdk-js/api/signature-transfer",
  },
  {
    text: "型と arktype（primitives・args・signed）",
    link: "/sdk-js/api/types",
  },
];

const sdkReactIntro = [
  { text: "Why", link: "/sdk-react/introduction/why" },
  { text: "Installation", link: "/sdk-react/introduction/installation" },
  { text: "Getting Started", link: "/sdk-react/introduction/getting-started" },
  { text: "FAQ", link: "/sdk-react/introduction/faq" },
];

const sdkReactGuides = [
  {
    text: "Providers をセットアップする",
    link: "/sdk-react/guides/providers-setup",
  },
  { text: "チュートリアル一覧", link: "/sdk-react/guides/tutorial" },
  {
    text: "Tutorial: Self-Call (end-to-end)",
    link: "/sdk-react/guides/tutorial-self-call",
  },
  {
    text: "Tutorial: EIP-712 + Executor",
    link: "/sdk-react/guides/tutorial-signature-executor",
  },
  {
    text: "Tutorial: verify（レシート検証）",
    link: "/sdk-react/guides/tutorial-verify",
  },
  { text: "Commitment", link: "/sdk-react/guides/commitment" },
  { text: "Hooks と JS SDK の対応表", link: "/sdk-react/guides/hooks-map" },
];

const sdkReactApi = [
  { text: "全エクスポート一覧", link: "/sdk-react/api/exports" },
  { text: "フック完全リファレンス", link: "/sdk-react/api/hooks" },
  {
    text: "`narrowWriteClients` とよくある失敗",
    link: "/sdk-react/api/clients-errors",
  },
];

const sdkRustIntro = [
  { text: "Why", link: "/sdk-rust/introduction/why" },
  { text: "Installation", link: "/sdk-rust/introduction/installation" },
  { text: "Getting Started", link: "/sdk-rust/introduction/getting-started" },
  { text: "FAQ", link: "/sdk-rust/introduction/faq" },
];

const sdkRustGuides = [
  {
    text: "Tutorial: Self-Call (end-to-end)",
    link: "/sdk-rust/guides/tutorial-self-call",
  },
  {
    text: "Tutorial: EIP-712 + Executor",
    link: "/sdk-rust/guides/tutorial-signature-executor",
  },
  {
    text: "Tutorial: verify（レシート検証）",
    link: "/sdk-rust/guides/tutorial-verify",
  },
  { text: "Commitment", link: "/sdk-rust/guides/commitment" },
  {
    text: "オフチェーン検証の限界",
    link: "/sdk-rust/guides/verification-limits",
  },
  { text: "エラーと切り分け", link: "/sdk-rust/guides/errors" },
];

const sdkRustApi = [
  { text: "クレート概要と再エクスポート", link: "/sdk-rust/api/crate-root" },
  { text: "`utils`", link: "/sdk-rust/api/utils" },
  { text: "`sign`", link: "/sdk-rust/api/sign" },
  { text: "`verify`", link: "/sdk-rust/api/verify" },
  {
    text: "`send_transaction::self_transfer`",
    link: "/sdk-rust/api/self-transfer",
  },
  {
    text: "`send_transaction::signature_transfer`",
    link: "/sdk-rust/api/signature-transfer",
  },
  { text: "主な型", link: "/sdk-rust/api/types" },
  { text: "`SdkError`", link: "/sdk-rust/api/sdk-error" },
];

const sdkJsSidebar = [
  { text: "Overview", link: "/sdk-js" },
  { text: "Introduction", items: sdkJsIntro },
  { text: "Guides", items: sdkJsGuides },
  { text: "API reference", items: sdkJsApi },
];

const sdkReactSidebar = [
  { text: "Overview", link: "/sdk-react" },
  { text: "Introduction", items: sdkReactIntro },
  { text: "Guides", items: sdkReactGuides },
  { text: "API reference", items: sdkReactApi },
];

const sdkRustSidebar = [
  { text: "Overview", link: "/sdk-rust" },
  { text: "Introduction", items: sdkRustIntro },
  { text: "Guides", items: sdkRustGuides },
  { text: "API reference", items: sdkRustApi },
];

const pagesBasePath =
  process.env.TWC_PAGES_BASE_PATH ?? "/TransferWithCommitment/";

export default defineConfig({
  title: "TransferWithCommitment",
  description:
    "TransferWithCommitment — アーキテクチャ、Solidity、公式 SDK（TypeScript / React / Rust）のドキュメント。",
  basePath: pagesBasePath,
  rootDir: ".",
  aiCta: false,
  vite: {
    build: {
      outDir: "dist",
    },
  },
  sidebar: {
    "/": [
      { text: "Overview", link: "/" },
      {
        text: "Architecture",
        link: "/architecture",
      },
      {
        text: "Contracts",
        link: "/contracts",
      },
      {
        text: "SDKs",
        items: [
          { text: "JavaScript / TypeScript", link: "/sdk-js" },
          { text: "React", link: "/sdk-react" },
          { text: "Rust", link: "/sdk-rust" },
        ],
      },
      { text: "Contributing", link: "/contributing" },
    ],
    "/architecture": architectureSidebar,
    "/contracts": contractsSidebar,
    "/sdk-js": sdkJsSidebar,
    "/sdk-react": sdkReactSidebar,
    "/sdk-rust": sdkRustSidebar,
    "/contributing": contributingSidebar,
  },
  topNav: [
    { text: "Overview", link: "/", match: "/" },
    { text: "Architecture", link: "/architecture", match: "/architecture" },
    { text: "Contracts", link: "/contracts", match: "/contracts" },
    { text: "SDK (JS)", link: "/sdk-js", match: "/sdk-js" },
    { text: "SDK (React)", link: "/sdk-react", match: "/sdk-react" },
    { text: "SDK (Rust)", link: "/sdk-rust", match: "/sdk-rust" },
    {
      text: "Sepolia Demo",
      link: "https://bunsan-pay.github.io/TransferWithCommitment/demo/",
    },
    { text: "Contributing", link: "/contributing", match: "/contributing" },
  ],
  ogImageUrl: undefined,
});
