#!/usr/bin/env node
// lead-pipeline-gate (UserPromptSubmit hook)
// 実装系タスクのプロンプトを安価なキーワード判定で検出し、検出時のみ
// lead-pipeline プレイブックへの 1 ブロックポインタを context に注入する。
// 非該当（質問 / 調査 / 雑談 / お礼）では何も出力せず context 消費ゼロ。
// 取りこぼしは lead-pipeline スキルの auto-trigger が保険として拾う。
import { readFileSync } from "node:fs";

let prompt = "";
try {
  prompt = JSON.parse(readFileSync(0, "utf8")).prompt || "";
} catch {
  /* no input */
}
if (!prompt) process.exit(0);

const pattern =
  /実装|作って|作りたい|つくって|直して|修正|なおして|機能追加|機能を追加|追加して|追加したい|変更して|改修|リファクタ|置換|対応して|動かない|エラー|バグ|fix|implement|feature|refactor|\bbug\b|build (a|an|the)|add (a|an|the)/i;

if (pattern.test(prompt)) {
  process.stdout.write(`[lead-pipeline gate] 実装系タスクの可能性が高い。lead-pipeline スキルのティア判定に従うこと:
- 軽 (typo / 1ファイル自明 / コメント) = そのまま実装。チェーン不要
- 中 (複数ファイル / ロジック変更 / バグ修正) = 実装 → session-verifier → task-tracker
- 重 (機能追加 / 層横断 / アーキ変更) = session-manager(START) → role-pm → execution-router → role-engineer → session-verifier → role-qa(別コンテキスト) → task-tracker(END) → git-orchestrator
注意: sub-agent は再帰起動不可。起動はメインが Agent ツールで逐次。質問 / 調査 / 雑談なら本注入は無視してよい。
`);
}
process.exit(0);
