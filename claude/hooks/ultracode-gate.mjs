#!/usr/bin/env node
// ultracode-gate (UserPromptSubmit hook)
// プロンプト中の "ultracode" キーワードを検出し、検出時のみ ultracode スキル
// （マルチエージェント並列采配プレイブック）への 1 ブロックポインタを context に注入する。
// 非該当では何も出力せず context 消費ゼロ。lead-pipeline-gate と同居し両方発火しうるが、
// その場合は ultracode が優先（ティア判定スキップ = 重ティア強制 + 並列最大化）。
import { readFileSync } from "node:fs";

let prompt = "";
try {
  prompt = JSON.parse(readFileSync(0, "utf8")).prompt || "";
} catch {
  /* no input */
}
if (!prompt) process.exit(0);

if (/\bultracode\b|ウルトラコード/i.test(prompt)) {
  process.stdout.write(`[ultracode gate] ultracode キーワード検出。ultracode スキル（マルチエージェント並列采配）に従うこと:
- ティア判定をスキップし重ティア扱い。lead-pipeline フルチェーンを並列最大化で実行（lead-pipeline gate と両発火時は本注入が優先）
- Phase 1: 偵察は Explore agent を 1 メッセージ複数起動でファンアウト
- Phase 3: 実装は互いに素な独立単位（unit）に分割し role-engineer を並列起動。依存 unit のみ逐次
- Phase 5: 監査は role-qa + security-reviewer を並列起動（必ず実装と別コンテキスト）
- sub-agent 再帰起動不可。並列含む全起動はメインが Agent ツールで行う
質問・調査のみのプロンプトなら Phase 1（偵察ファンアウト）のみ実施して報告する。
`);
}
process.exit(0);
