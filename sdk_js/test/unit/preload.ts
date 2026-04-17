/**
 * `config` を非ゼロアドレスに差し替える（sign / sendTransaction の単体テスト用）。
 * `bun test --preload ./test/unit/preload.ts ...` でのみ読み込む。
 */
import { mock } from "bun:test";
import { mockConfigModule } from "./mockConfig";

mock.module(
  new URL("../../config.ts", import.meta.url).pathname,
  () => mockConfigModule(),
);
