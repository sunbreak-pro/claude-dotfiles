---
name: execution-router
description: 実行戦略のオーケストレーター判断ガイド。長時間・反復・並列・条件達成型の作業に対し /goal・/batch・/loop・subagent・/background・/simplify・/ultrareview のどれを使うべきか判断し、ユーザーが貼るコマンド文字列を具体的に提案する。既存 role-* agent / session-verifier / git-workflow / task-tracker と連携。Triggers include "全部通るまで", "回し続けて", "自動で進めて", "一括置換", "全置換", "並列で", "リポジトリ全体", "定期的に", "ずっと監視", "放置で", "長時間タスク", "どうやって回す", "goal", "batch", "loop", "auto run", "long running", "parallelize".
---

# Execution Router — 実行戦略の判断ガイド

## このスキルの立ち位置

`/goal` `/batch` `/loop` `/ultrareview` は **ユーザーがプロンプトに打つセッション制御コマンド**で、Claude 側からツール／Bash で起動できない（`/ultrareview` と同じ扱い）。
よって本スキルは **「今どの実行モードが最適かを判断し、ユーザーが貼り付ける正確なコマンド文字列を提示する」** オーケストレーター。実作業は既存 agent / skill に委譲する（重複実装しない）。

冷蔵庫の整理に例えると、本スキルは「これは冷凍庫、これは野菜室、これは常温の棚」と仕分けを指示する役で、実際に物を入れる手は role-\* agent や各 skill が担う。

## 起動条件

次のいずれかの意図が読めたら起動する:

- 「全部通るまで自動で回して」「テスト全緑になるまで」=条件達成型
- 「○○を全部△△に置換」「リポジトリ全体を一括で」=大規模機械的変更
- 「5 分ごとに CI 見て」「デプロイ完了まで監視」=時間／外部状態ポーリング
- 「長時間かかるけど放置で進めたい」=セッション分離
- 実行戦略そのものを相談された（「これどうやって回すのが効率いい?」）

### 非起動（Anti-Trigger）

- 単発の小修正・タイポ・1 ファイル編集 → そのまま実装
- 純粋な質問・調査のみ → 通常応答 or web-researcher
- 既に明確な 1 タスクで戦略判断が不要 → role-engineer 直送

## 判断マトリクス

| 状況                                                                                             | 最適モード         | 委譲先                                                   |
| ------------------------------------------------------------------------------------------------ | ------------------ | -------------------------------------------------------- |
| **検証可能な完了条件**があり、単一リポジトリ、逐次でよい（「○○が通るまで」「△△が解消するまで」） | **`/goal`**        | 条件提示 → 実装は通常フロー                              |
| **大規模で機械的**、5〜30 の独立単位に分解可、並列化したい、各単位 PR 化したい                   | **`/batch`**       | git-branch-flow（PR/branch 保護）/ role-qa（各 PR 監査） |
| **時間・間隔ベース**の反復、外部状態（CI/deploy/remote queue）のポーリング                       | **`/loop`**        | loop skill                                               |
| 1 つの複雑多段タスク、隔離コンテキストが要る、多数並列ではない                                   | **subagent**       | role-pm → role-engineer → role-qa                        |
| 重量級 1 タスク、**独立単位へ並列分解可**（2〜5 unit）、PR は 1 本に統合したい                   | **`ultracode`**    | **判断も起動も `lead-pipeline`（入口はそちら一本）**     |
| セッション全体を切り離して放置したい                                                             | **`/background`**  | （以後 `claude agents` で監視）                          |
| 変更済みコードの品質・重複・効率の手術                                                           | **`/simplify`**    | simplify skill                                           |
| ブランチ/PR のマルチエージェント・クラウドレビュー                                               | **`/ultrareview`** | （ユーザートリガー専用）                                 |

判断に迷う軸:

- **「終わり」を機械が判定できるか** → Yes かつ単一リポジトリで逐次 → `/goal`
- **独立単位に割れて並列が効くか** → Yes かつ各単位 PR 化 → `/batch`
- **終わりが時刻・外部イベント依存か** → `/loop`
- **並列が効く重タスクで PR を割る必要が無いか** → Yes → `ultracode`（採否と並列采配の正本 = `lead-pipeline` の ultracode モード。unit ごとに PR 化したいなら `/batch`）
- **どれでもなく単に重い 1 タスク** → subagent 分散（`/batch` ではない）

## 出力フォーマット

判断したら、次の 3 ブロックで返す:

```
判断: <モード名>（理由 1 行）

▶ これをそのまま貼ってください:
<コマンド文字列>

連携: <この後の委譲先と一言>
```

### コマンドテンプレート

- `/goal` … 条件は**観測可能な合格基準**を英語で。最大 4,000 文字。
  例: `/goal all tests under frontend/src pass and `npm run build` is clean`
- `/batch` … **何を→何に**を 1 文で。分解は /batch 側が行う。
  例: `/batch replace all moment.js imports with dayjs across the repo, updating call sites to dayjs syntax`
- `/loop` … 間隔 + 実行内容。即貼りテンプレ集は [[heavy-workflows]] ルール参照。
  例: `/loop 5m check the latest GitHub Actions run on this branch and report only on failure`
- `ultracode` … スラッシュコマンドではなく**プロンプトに含めるキーワード**。提案の可否・並列采配の中身は `lead-pipeline`（`references/ultracode-mode.md`）が正本。

## 安全則（必須）

**基本の安全則の正本 = `rules/heavy-workflows.md`**（Claude が `/goal` `/batch` `/loop` を実行せずコマンド文字列の提示に留めること・提案には停止条件を添えること・ultracode 提案は 1 タスク 1 回）。本節が持つのはモード固有の注意だけ:

- `/goal` は **CLI v2.1.139+** が必要。判定モデルは Haiku、評価はターン終了ごと。条件 ≤ 4,000 文字。古い CLI なら `claude --version` を促す。
- **`/batch` は worktree を量産し各ワーカーが自動 `gh pr create` する**。実行前に必ず:
  - main / master / production への直 push にならないか（branch 保護 / pre-push hook 前提 — 判定は `git-workflow` §2）
  - 大量 PR の妥当性を **git-branch-flow** に判断委譲することを提案
  - life-editor の場合 Cloud Sync / migration の整合は専用 validator agent 連携を案内
- `/background` 移行を提案するときは「制御を手放す」ことと監視方法（`claude agents`）を必ず添える。
- 破壊的になりうる戦略（大量 PR / force push を含む rebase 戦略）は `git-workflow` §2 のガードレールに従い、実行直前の再確認を明記する。

## 既存資産との連携（重複しない）

| 局面               | 委譲先           | 本スキルの役割                               |
| ------------------ | ---------------- | -------------------------------------------- |
| 要件分解・スコープ | role-pm          | どのモードで回すか提案                       |
| 実装               | role-engineer    | モード選定とコマンド提示のみ                 |
| 品質ゲート         | session-verifier | `/goal` の条件に verifier 相当を織り込む助言 |
| 独立監査           | role-qa          | `/batch` 後に各 PR を role-qa へ回す導線     |
| branch/PR 戦略     | git-branch-flow  | `/batch` の PR 群を渡す                      |
| 計画書             | code-plan-editor | 大規模 `/batch` 前にプラン化を提案           |
| 進捗記録           | task-tracker     | モード実行の開始／完了を記録                 |

本スキルは状況判断と振り分けに専念し、実装・レビュー・git 操作・記録は上記へ委譲する。
