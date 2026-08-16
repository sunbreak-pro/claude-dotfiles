---
name: lead-pipeline
description: 外来の実装タスクを受けた瞬間に、軽重ティアを判定して必要工程だけを一気通貫で采配するメインチャット用プレイブック。ultracode キーワード検出時はティア判定を省略し references/ultracode-mode.md の並列采配へ切り替える。sub-agent は再帰起動不可のため、メイン自身が Agent ツールで task-tracker / role-pm / execution-router / role-engineer / session-verifier / playwright-ui-verifier / role-qa / git-workflow を順に起動する。質問・調査・雑談では使わない。Triggers include "実装して", "作って", "機能追加", "直して", "修正", "fix", "implement", "feature", "refactor", "一気通貫", "lead pipeline", "ultracode", "ウルトラコード", "総力戦", "並列で全力", "全エージェント投入", "multi-agent orchestration".
---

# Lead Pipeline — 実装タスク一気通貫プレイブック

## これは何か

**メインチャットが従う采配手順書**。sub-agent は他 sub-agent を起動できない（Agent ツールはメインのみ / 再帰禁止は意図的設計）。
よって全工程を回す主体はメイン自身。本スキルはメインが「タスクを読んだ瞬間に、どの工程をどの順で Agent 起動するか」を決めるための表。

引っ越しに例えると、メインは現場監督。荷物の量を見て「これは手で運ぶ / 軽トラ / 引っ越し業者フル手配」を即決し、各作業員（sub-agent）を順に呼ぶ。作業員同士は勝手に他の作業員を呼ばない。

## 非対象（起動しない）

- 純粋な質問・概念説明・調査のみ → 通常応答 / web-researcher
- 雑談・お礼・確認だけ
- 既に 1 手で終わる明確指示で采配判断が不要

## ティア判定（最初に必ずこれ）

| ティア | 目安                                                      | 工程                                           |
| ------ | --------------------------------------------------------- | ---------------------------------------------- |
| **軽** | typo / 1 ファイル自明 / コメント / 文言 / リネーム 1 箇所 | **そのまま実装して終了**。チェーン一切なし     |
| **中** | 複数ファイル / ロジック変更 / バグ修正 / contained な改修 | 実装 → **session-verifier** → **task-tracker** |
| **重** | 機能追加 / DB〜IPC〜UI 層横断 / アーキ変更 / 影響範囲不明 | 下記フルチェーン                               |

判定に迷ったら**一段重い方**に倒す（過剰実行より取りこぼし防止）。ただし軽を中に上げない（typo に verifier は過剰）。

## ultracode モード（キーワード検出時）

プロンプトに `ultracode` キーワードが含まれる場合はティア判定を省略して重ティア扱いとし、`references/ultracode-mode.md` を読んで並列最大化版の采配に切り替える。実装系キーワードのみ（ultracode なし）のときは上記ティア判定に従う。両者の判定は UserPromptSubmit の `pipeline-gate.mjs` が一括で行う（同一フック内で排他・二重注入なし）。

## 中ティアの手順

0. **ミニスコープ宣言**（計画書は作らない）— 着手時に「対象ファイル / 完了条件 / 触らないもの」を 1〜3 行チャットに宣言する。宣言の外に手を出したくなったら実装せず、判断キュー or Issue へ積んで現作業を続ける（life-editor なら POLICY P-008）。軽ティアは対象外（typo にゲートは過剰）
1. 実装（必要なら role-engineer を Agent 起動、軽めならメイン直接）
2. **session-verifier**（skill）— 型 / lint / test / 構造。失敗したら止めて修正
3. **playwright-ui-verifier**（agent）— UI に見える変更のみ。実ブラウザで runtime 検証（opus / xhigh・[[playwright-verify]] 手順）。BLOCKING findings はメインが修正 → 再検証
4. **task-tracker**（skill）— MEMORY/HISTORY 更新 + commit。**検証（2〜3）が緑になったらそのまま実行する** — ユーザーの確認も PR の merge も待たない（life-editor `D-20260810-main-1`）
5. commit 後に PR を出すなら **git-workflow**（skill）/ PR 手順は **git-branch-flow** へ

## 重ティアのフルチェーン

メインが Agent ツールで**逐次**起動（前段の出力が後段の入力）。各 sub-agent は結果をメインに返すだけ。

```
0. task-tracker (skill, START)            ← active-sessions 競合チェック込み
1. role-pm (agent)                        ← 要件分解・スコープ・Tier 判定
2. execution-router (skill)               ← /goal /batch /loop /subagent のどれで回すか判断
       └─ /goal /batch /loop が最適なら、コマンド文字列をユーザーに提示して指示を仰ぐ
3. role-engineer (agent)                  ← 実装（or execution-router が出した方式で実行）
4. session-verifier (skill)               ← 自己検証ゲート（静的）。失敗で停止
4.5 playwright-ui-verifier (agent)        ← UI に見える変更のみ。実ブラウザ runtime 検証（opus / xhigh）
5. role-qa (agent, 別コンテキスト)         ← 独立監査。自己評価バイアス回避で必ず別 Agent
       └─ 観点独立なら security-reviewer / life-editor 系 validator を role-qa と並列起動可
6. task-tracker (skill, END)              ← MEMORY/HISTORY 詳細記録 + plan archive + commit
7. git-workflow (skill)                   ← branch 保護判定。PR は git-branch-flow へ
8. PR マージ                              ← 可否の正本 = git-workflow §0.1.1
```

> **PR マージの規定の正本 = `git-workflow` §0.1.1**（自動マージの条件・軽 / 中ティアで PR を出す場合の扱いを含む）。ここには転記しない。**プロジェクト側の POLICY / CLAUDE.md による override が常に優先**する（例: life-editor は P-001「merge は常にユーザー」で自動マージ不適用）。

### 並列化の判断

- 順次必須: `role-pm → role-engineer → role-qa`（依存鎖）
- 並列可: `role-qa` + `security-reviewer` / life-editor の `ipc-validator`+`migration-validator`+`sync-auditor`（全 Read のみ・観点独立）
- `role-qa` + `playwright-ui-verifier` も並列可（コード監査と実行時検証で観点独立）。ただし playwright を使うエージェントは**同時 1 体まで**（ブラウザ実体がセッションに 1 つ）
- 並列起動は 1 メッセージ内で複数 Agent 呼び出し

## 安全則（必須）

- **sub-agent から sub-agent を呼ばない**。各役職は結果をメインに返す。次段起動はメインが Agent ツールで行う
- `execution-router` が `/goal` `/batch` `/loop` を選んだら、Claude は実行せず**コマンド文字列を提示**しユーザーが貼る（[[execution-router]] 準拠）
- commit / PR は branch 保護に従う（main 直 push 禁止 / pre-push hook 前提）。破壊的 git 操作は実行直前に再確認
- session-verifier 失敗時は task-tracker を呼ばずに停止し修正へ
- role-qa は必ずメインが**別 Agent**として起動（role-engineer と同一コンテキスト禁止）

## 既存資産との関係（重複しない）

本スキルは采配表のみ。実作業は委譲する: 要件=role-pm / 戦略=execution-router / 実装=role-engineer / 静的検証=session-verifier / 実行時検証=playwright-ui-verifier（UI 変更時のみ・[[playwright-verify]] 手順） / 監査=role-qa / 記録・セッション状態=task-tracker / git=git-workflow（PR は git-branch-flow）。

UserPromptSubmit hook (`~/.claude/hooks/pipeline-gate.mjs`) が実装系キーワード（および `ultracode`）検出時に本スキルへのポインタを context 注入し、確実な発火を保証する。hook は注入のみ・判断と起動はメイン。

## Worktree Policy（プロジェクトに採用されている場合）

プロジェクトの `CLAUDE.md` に "Multi-chat Worktree Policy" 節 (例: life-editor §7.4) がある場合、ティア判定の**前**に以下を確認する:

1. **現在 main repo か worktree か** — `git rev-parse --show-toplevel` と `git branch --show-current` を読む
2. **メインリポジトリで feature 作業を始めようとしていないか** — メイン (`/path/to/repo`) 上で `main` 以外のブランチに切り替えようとしている場合、停止して worktree 提案へ誘導する。**手順の正本 = `git-branch-flow`（worktree 作成の 4 ステップ 1 セット）**。プロジェクトに worktree 用スキルがあればそちらが優先（例: life-editor の `worktree-policy`）
3. **`.session-branch` 書き出しは ifガードではなく作成手順の一部** — 担当 branch の宣言ファイルを書く step を省略すると `pwd` の branch と担当宣言の突き合わせができない。「未宣言なら促す」(reactive) ではなく「作成手順に組み込む」(proactive) が正

引っ越しに例えると、メイン台所で別の家族の引っ越し作業を始めると混乱する。新規プロジェクトは別の部屋（worktree）に荷物を運んでから作業する。

policy 不在のプロジェクトでは本節をスキップ。
