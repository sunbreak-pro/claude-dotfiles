---
name: execution-router
description: 長時間・反復・並列・条件達成型の作業に /goal・/batch・/loop・subagent・/background のどれを使うか判断し、ユーザーが貼り付けるコマンド文字列を提示する実行戦略ルーター。Triggers include "全部通るまで", "回し続けて", "一括置換", "並列で", "定期的に", "放置で", "長時間タスク", "goal", "batch", "loop".
---

# Execution Router — 実行戦略の判断

`/goal` `/batch` `/loop` `/background` `/ultrareview` はユーザーがプロンプトに打つセッション制御コマンドで、Claude からは起動できない。本スキルは「どのモードが最適か」を判断し、**ユーザーが貼るコマンド文字列を提示する**ところまで。実作業は既存の agent / skill に委譲する。

## 判断マトリクス

| 状況                                                                | モード             | 連携先                            |
| ------------------------------------------------------------------- | ------------------ | --------------------------------- |
| 機械が判定できる完了条件があり、単一リポジトリ、逐次でよい          | **`/goal`**        | 条件提示 → 実装は通常フロー       |
| 大規模で機械的、5〜30 の独立単位に分解でき、各単位を PR 化したい    | **`/batch`**       | git-branch-flow / role-qa         |
| 時間・間隔ベースの反復、外部状態（CI / deploy / queue）のポーリング | **`/loop`**        | loop skill                        |
| 重量級 1 タスクで 2〜5 unit に並列分解でき、PR は 1 本に統合したい  | **`ultracode`**    | lead-pipeline（判断も起動も）     |
| 1 つの複雑多段タスクで隔離コンテキストが要る                        | **subagent**       | role-pm → role-engineer → role-qa |
| セッションごと切り離して放置したい                                  | **`/background`**  | 以後 `claude agents` で監視       |
| 変更済みコードの品質・重複・効率の手術                              | **`/simplify`**    | simplify skill                    |
| ブランチ / PR のマルチエージェント・クラウドレビュー                | **`/ultrareview`** | ユーザートリガー専用              |

## 出力

```
判断: <モード>（理由 1 行）

▶ これをそのまま貼ってください:
<コマンド文字列>

止めどき: <達成条件 or 停止の目安>
連携: <この後の委譲先>
```

- `/goal` … 観測可能な合格基準を英語で、4,000 文字以内。例: `/goal all tests under frontend/src pass and npm run build is clean`
- `/batch` … 何を→何に、を 1 文で。例: `/batch replace all moment.js imports with dayjs across the repo, updating call sites`
- `/loop` … 間隔 + 実行内容。例: `/loop 5m check the latest CI run on this branch; if it failed, diagnose and push a fix` / `/loop 10m check PR #<n> for new review comments and address them`
- `ultracode` … スラッシュコマンドではなくプロンプトに含めるキーワード。提案は 1 タスク 1 回まで。見送られたら lead-pipeline 通常運転

## 安全則

- Claude は `/goal` `/batch` `/loop` を実行しない。提示のみ。提案には必ず止めどきを添える
- `/goal` は CLI v2.1.139+。判定モデルは Haiku、評価はターン終了ごと
- `/batch` は worktree を量産し各ワーカーが `gh pr create` する。保護 branch への直 push にならないか（git-workflow §2）と大量 PR の妥当性（git-branch-flow）を先に確認する
- `/background` を提案するときは「制御を手放す」ことと監視方法（`claude agents`）を添える
- 大量 PR / force push を含む戦略は git-workflow §2 のガードレールに従い、実行直前に再確認する
