---
name: lead-pipeline
description: 外来の実装タスクを軽重ティア判定し、必要工程だけをメインチャットから一気通貫で采配するプレイブック（ultracode 検出時は references/ultracode-mode.md の並列采配へ切替）。質問・調査・雑談では使わない。Triggers include "実装して", "作って", "機能追加", "直して", "修正", "implement", "fix", "refactor", "一気通貫", "ultracode".
---

# Lead Pipeline — 実装タスクの采配表

メインチャットが現場監督。サブエージェントは他のサブエージェントを起動できないので、全工程の起動と統合はメインが行う。監督は指示を出して待つ人ではなく、**自分も手を動かして**、作業員（サブエージェント）の報告が届いたら統合する。

## ティア判定（最初にこれ）

| ティア | 目安                                                      | 工程                                                  |
| ------ | --------------------------------------------------------- | ----------------------------------------------------- |
| **軽** | typo / 1 ファイル自明 / コメント / 文言 / リネーム 1 箇所 | そのまま実装して終了                                  |
| **中** | 複数ファイル / ロジック変更 / バグ修正 / contained な改修 | スコープ宣言 → 実装 → session-verifier → task-tracker |
| **重** | 機能追加 / 層横断 / アーキ変更 / 影響範囲不明             | 下記フルチェーン                                      |

迷ったら一段重い方。ただし軽を中に上げない。`ultracode` キーワードがあればティア判定を省いて `references/ultracode-mode.md`（並列最大化）へ。

## 中ティア

0. **スコープ宣言** — 「触るファイル / 完了条件 / 触らないもの」を 1〜3 行チャットに書く。外に手を出したくなったら直さず報告へ回す
1. 実装（メイン直接。並列に割れるならその部分だけ role-engineer）
2. **session-verifier** — 型 / lint / test / プロジェクト固有規約。失敗したら止めて修正
3. **playwright-ui-verifier** — UI に見える変更のみ。実ブラウザで runtime 検証。BLOCKING はメインが修正して再検証
4. **task-tracker (END)** — 検証が緑になったらそのまま実行する。ユーザー確認も PR の merge も待たない
5. PR を出すなら git-workflow（PR 手順は git-branch-flow）

## 重ティア

```
0. task-tracker (START)          ← 並行チャットの競合チェック込み
1. role-pm                       ← 要件分解・スコープ・並列 unit 分割表。仮定は置いて進める
2. role-engineer × unit          ← 互いに素な unit は 1 メッセージで並列起動。メインも 1 unit を担当する
3. session-verifier              ← 統合検証。失敗 unit だけ修正サイクル
3.5 playwright-ui-verifier       ← UI に見える変更のみ（同時 1 体まで）
4. role-qa (+ security-reviewer) ← 別コンテキストで並列監査。Blocking ゼロまで 2 に戻す
5. task-tracker (END)            ← 記録 + commit
6. git-workflow                  ← branch 保護判定。PR / マージの可否は git-workflow §0.1.1
```

- 依存があるのは `role-pm → role-engineer → session-verifier → role-qa` の鎖だけ。それ以外は並列。
- **待たない。** サブエージェントを起動したら、メインは次に自分ができる工程（自分の unit の実装、検証コマンドの準備、報告の下書き）に進む。完了通知が来てから統合する。
- `/goal` `/batch` `/loop` が向いていると判断したら、実行せずコマンド文字列を提示する（execution-router）。

## 安全則

- サブエージェントから サブエージェントを呼ばない。全起動はメイン。
- 同一ファイルを 2 つの unit に渡さない。競合したら unit を統合して逐次にする。
- session-verifier 失敗時は task-tracker を呼ばず修正へ。role-qa は必ず実装と別コンテキスト。
- commit / PR は branch 保護に従う（main 直 push 禁止）。破壊的 git 操作は実行直前に再確認。

## Worktree Policy（プロジェクトが採用している場合）

プロジェクトの CLAUDE.md に Multi-chat Worktree Policy があれば、ティア判定の前に `git rev-parse --show-toplevel` と `git branch --show-current` を読み、メインリポジトリ上で feature 作業を始めようとしていたら worktree 作成へ誘導する（手順は git-branch-flow。プロジェクト側に worktree スキルがあればそちら）。

## hook

`hooks/pipeline-gate.mjs`（UserPromptSubmit）が実装系キーワードと `ultracode` を検出して本スキルへのポインタを注入する。hook は注入のみで、判断と起動はメイン。
