#!/usr/bin/env node
// pipeline-gate (UserPromptSubmit hook)
// 実装系キーワードと ultracode を 1 本で判定し、lead-pipeline へのポインタを注入する(排他・二重注入なし)。
// 非該当では何も出力せず context 消費ゼロ。取りこぼしは lead-pipeline スキルの auto-trigger が拾う。
import { readFileSync } from "node:fs";

let prompt = "";
try {
  prompt = JSON.parse(readFileSync(0, "utf8")).prompt || "";
} catch {
  /* no input */
}
if (!prompt) process.exit(0);

const ULTRA = /\bultracode\b|ウルトラコード/i;
const IMPL =
  /実装|作って|作りたい|つくって|直して|修正|なおして|機能追加|機能を追加|追加して|追加したい|変更して|改修|リファクタ|置換|対応して|動かない|エラー|バグ|fix|implement|feature|refactor|\bbug\b|build (a|an|the)|add (a|an|the)/i;

if (ULTRA.test(prompt)) {
  process.stdout.write(
    "[pipeline gate / ultracode] lead-pipeline の references/ultracode-mode.md に従う: ティア判定を省いて重ティア。偵察は Explore を 1 メッセージ複数起動、実装は互いに素な unit に割って role-engineer を並列起動しメインも 1 unit を担当、監査は role-qa + security-reviewer を並列。サブエージェントの完了を待たずに自分の工程を進める。質問・調査のみなら偵察だけ実施して報告。\n",
  );
} else if (IMPL.test(prompt)) {
  process.stdout.write(
    "[pipeline gate] 実装系タスクの可能性。lead-pipeline のティア判定に従う: 軽 = そのまま実装 / 中 = スコープ宣言 → 実装 → session-verifier → task-tracker / 重 = task-tracker(START) → role-pm → role-engineer(並列) → session-verifier → role-qa → task-tracker(END) → git-workflow。質問・調査・雑談なら無視してよい。\n",
  );
}
process.exit(0);
