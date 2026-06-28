#!/usr/bin/env node
// pipeline-gate (UserPromptSubmit hook)
// 旧 lead-pipeline ゲートと ultracode ゲートを 1 本に統合した単一ゲート。
// ultracode キーワードを先に判定し、該当時は並列采配の注入のみ(排他、旧仕様の「両発火時 ultracode 優先」を内蔵)。
// 非該当では何も出力せず context 消費ゼロ。取りこぼしは lead-pipeline スキルの auto-trigger が保険として拾う。
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
  process.stdout.write(`[pipeline gate / ultracode] ultracode キーワード検出。lead-pipeline スキルの references/ultracode-mode.md(マルチエージェント並列采配)に従うこと:
- ティア判定をスキップし重ティア扱い。フルチェーンを並列最大化で実行
- Phase 1: 偵察は Explore agent を 1 メッセージ複数起動でファンアウト
- Phase 3: 実装は互いに素な独立単位(unit)に分割し role-engineer を並列起動。依存 unit のみ逐次
- Phase 5: 監査は role-qa + security-reviewer を並列起動(必ず実装と別コンテキスト)
- sub-agent 再帰起動不可。並列含む全起動はメインが Agent ツールで行う
質問・調査のみのプロンプトなら Phase 1(偵察ファンアウト)のみ実施して報告する。
`);
} else if (IMPL.test(prompt)) {
  process.stdout.write(`[pipeline gate] 実装系タスクの可能性が高い。lead-pipeline スキルのティア判定に従うこと:
- 軽 (typo / 1ファイル自明 / コメント) = そのまま実装。チェーン不要
- 中 (複数ファイル / ロジック変更 / バグ修正) = 実装 → session-verifier → task-tracker
- 重 (機能追加 / 層横断 / アーキ変更) = task-tracker(START・競合チェック込み) → role-pm → execution-router → role-engineer → session-verifier → role-qa(別コンテキスト) → task-tracker(END) → git-workflow
注意: sub-agent は再帰起動不可。起動はメインが Agent ツールで逐次。質問 / 調査 / 雑談なら本注入は無視してよい。
`);
}
process.exit(0);
