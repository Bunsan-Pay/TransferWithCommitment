import { mock } from "bun:test";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";

import { buildMockSdkConfigModule } from "./sdkConfigState.ts";
import { wagmiState } from "./wagmiState.ts";

const sdkJsRoot = fileURLToPath(new URL("../../sdk_js/", import.meta.url));
const sdkJsConfigPath = `${sdkJsRoot}config.ts`;

/**
 * tsup の dist は各バンドルに config をインライン化するため、`dist/config.js` を mock しても verify/sign 等はゼロアドレスのまま。
 * テストではソースモジュールを読み、`config.ts` だけをモックして切り替える。
 */
mock.module(sdkJsConfigPath, () => buildMockSdkConfigModule());

const verifyModule = await import("../../sdk_js/verify.ts");

const sigSingleSrc = await import(
  "../../sdk_js/signatureTransfer/single/index.ts"
);
const sigBatchSrc = await import(
  "../../sdk_js/signatureTransfer/batch/index.ts"
);
const sigUnifiedSrc = await import(
  "../../sdk_js/signatureTransfer/unified/index.ts"
);
const sigCancelSrc = await import(
  "../../sdk_js/signatureTransfer/cancelAuthorization/index.ts"
);

const selfSingleSrc = await import("../../sdk_js/selfTransfer/single/index.ts");
const selfBatchSrc = await import("../../sdk_js/selfTransfer/batch/index.ts");
const selfUnifiedSrc = await import(
  "../../sdk_js/selfTransfer/unified/index.ts"
);

mock.module("eth-twc-sdk-js/verify", () => verifyModule);

mock.module("eth-twc-sdk-js/signatureTransfer/single", () => sigSingleSrc);
mock.module("eth-twc-sdk-js/signatureTransfer/batch", () => sigBatchSrc);
mock.module("eth-twc-sdk-js/signatureTransfer/unified", () => sigUnifiedSrc);
mock.module(
  "eth-twc-sdk-js/signatureTransfer/cancelAuthorization",
  () => sigCancelSrc,
);

mock.module("eth-twc-sdk-js/selfTransfer/single", () => selfSingleSrc);
mock.module("eth-twc-sdk-js/selfTransfer/batch", () => selfBatchSrc);
mock.module("eth-twc-sdk-js/selfTransfer/unified", () => selfUnifiedSrc);

mock.module("eth-twc-sdk-js/config", () => buildMockSdkConfigModule());

const window = new Window({ url: "http://localhost/" });
(globalThis as unknown as { window: Window }).window = window;
(globalThis as unknown as { document: Document }).document = window.document;
(globalThis as unknown as { navigator: Navigator }).navigator =
  window.navigator as unknown as Navigator;
(globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;

(window as unknown as { SyntaxError?: typeof Error }).SyntaxError ??= Error;
(globalThis as unknown as { SyntaxError?: typeof Error }).SyntaxError ??= Error;

mock.module("wagmi", () => ({
  useConfig: () => ({}),
  useChainId: () => wagmiState.publicClient?.chain?.id ?? 1,
  usePublicClient: () => wagmiState.publicClient,
  useWalletClient: () => ({
    data: wagmiState.walletClient,
    error: null,
    isError: false,
    isPending: false,
    status: wagmiState.walletClient ? "success" : "pending",
  }),
  useConnection: () => ({
    address: wagmiState.address,
    chainId: wagmiState.publicClient?.chain?.id,
    status: wagmiState.address ? "connected" : "disconnected",
    connector: undefined,
  }),
}));
