# Plan: エージェント棚卸しとメタハーネス最小ループ

- **Status**: IN PROGRESS（2026-08-13 ユーザー判断: MSC 削除 / security-reviewer 痩身存続 / Phase A+B 着手。実装ブランチ: `chore/agent-portfolio-and-meta-harness`）
- **Created**: 2026-08-13
- **Project**: claude-dotfiles
- **計画書**: claude/docs/plans/2026-08-13-agent-portfolio-and-meta-harness.md
- **関連**: `docs/meta-harness.md`（設計原則の正本）/ `docs/plans/2026-07-19-multiagent-harness-cost-optimization.md`（tier 引き下げ等の正本・本計画で一部補正）/ `docs/plans/2026-08-13-context-efficiency-rollout.md`（常駐痩身の正本）

## Context

### 使用実績（`~/.claude/projects/*/*.jsonl` 全走査、2026-07〜08）

| エージェント                | 起動回数（7月/8月） | 定義行数 | 傾向                                            |
| --------------------------- | ------------------- | -------- | ----------------------------------------------- |
| role-qa                     | 90 / 19             | 198      | 最多。8月は減少（メイン直接実装の増加と連動か） |
| role-engineer               | 13 / 41             | 167      | 増加中                                          |
| general-purpose（組み込み） | 16 / 17             | —        | 安定                                            |
| Explore（組み込み）         | 12 / 11             | —        | 安定                                            |
| role-pm                     | 7 / 0               | 168      | **8月ゼロ**                                     |
| security-reviewer           | 4 / 0               | 220      | 7月のみ                                         |
| web-researcher              | 2 / 1               | 81       | 少・継続                                        |
| deep-web-research           | 1 / 1               | 95       | 少・継続                                        |
| playwright-ui-verifier      | 0 / 2               | 60       | 新設直後                                        |
| multi-session-coordinator   | 0 / 1               | 248      | **最大定義・最少使用**                          |

### 調査結果の要点（deep-web-research, 2026-08-13）

- 役職型逐次パイプライン（pm→engineer→qa）は公式の想定用途（delegation boundary）どおりで陳腐化していない。並列・相互対話が要る場合のみ agent teams（実験的機能）へ。
- 組み込み Explore（read-only・既定 Haiku）が「探索専用カスタムエージェント」を代替する。**7/19 計画の role-explorer 新設はこの点で補正が必要**。
- 「作ったが使われない」3 類型: 逐次依存があるのに分割 / 些細タスクに 20k トークンの起動オーバーヘッド / description が曖昧で呼ばれない。
- 個人開発者の伸びしろ 3 領域: 永続メモリ、コスト観測性、自己改善（reflection）。
- 自己改善ループの先行事例: Anthropic Managed Agents の "dreaming"（人間レビュー選択可）と Outcomes（別コンテキストの grader で評価分離）、コミュニティの self-improving-skills（stop hook + /reflect + スナップショット/ロールバック）。公式は自律スポーンに濃度・深度・総数制限を段階導入しており、**自由度を上げるなら暴走対策とセットが定石**。

### 問題

1. 定義行数と使用実績が逆転している（248 行の multi-session-coordinator が 2 ヶ月で 1 回）。agent description は毎セッション常駐するため、これは「毎回机に載る固定費」。
2. role-pm が 8 月に使用ゼロ。Plan mode + 組み込み Plan agent + ask-user と役割が重なる。
3. メタハーネス（自己観測→提案→人間ゲート）の観測ループがまだ存在せず、今回のような棚卸しが手作業になっている。

## 検討した代替案

| 案                                                  | 採否 | 却下理由                                                                                                  | 復活条件                      |
| --------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------- | ----------------------------- |
| A: 実績ベース棚卸し + reflection スキルを小さく新設 | ✓    | —                                                                                                         | —                             |
| B: 7/19 計画をそのまま全実装                        | ✗    | 規模過大。先に土台（エージェント数・常駐量）を軽くしてから。tier 引き下げ等は 7/19 の該当節だけ個別に着手 | 棚卸し完了後                  |
| C: role-* を全廃し組み込み agent へ寄せる           | ✗    | role-engineer/role-qa は実績が濃く、評価役分離（qa 独立）は公式原則とも一致                               | 使用実績が枯れたら            |
| D: hook による自動自己書換（full self-modifying）   | ✗    | 暴走・回帰リスク。公式/コミュニティとも人間ゲート・ロールバックが定石                                     | 公式が CLI 向け機能を出したら |

## Scope (Touchable Paths)

- 触ってよい: `claude/agents/`, `claude/skills/`（harness-reflect 新設・参照更新）, `claude/rules/agent-management.md`, `claude/docs/`, `claude/templates/comm-protocol/README.md`
- 触らない: `claude/output-styles/`, `claude/rules/tone.md`, `claude/settings.json`（hooks 変更なし）, `claude/hooks/`（今回変更なし）

## Steps

### Phase A: エージェント棚卸し（判定表）

| エージェント                       | 判定                           | 処置                                                                                                                               |
| ---------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| role-engineer                      | keep                           | 変更なし（tier 引き下げは 7/19 §5.2 に委ねる）                                                                                     |
| role-qa                            | keep                           | description 痩身のみ（tier 引き下げは同上）                                                                                        |
| web-researcher / deep-web-research | keep                           | 変更なし。軽重 2 段の梯子として機能している                                                                                        |
| playwright-ui-verifier             | keep（観察）                   | 新設直後。次回棚卸しで再判定                                                                                                       |
| role-pm                            | **slim/demote**                | description を数行へ痩身し、起動条件を「lead-pipeline 重ティアのみ」に限定。8月ゼロが続けば次回棚卸しで削除候補                    |
| security-reviewer                  | **ユーザー判断**               | 案 1: 削除して組み込み /security-review スキルへ寄せる。案 2: 存続 + description 痩身（監査系の独立コンテキストを保持）            |
| multi-session-coordinator          | **削除（推奨・ユーザー判断）** | 競合チェックの実務（`.claude/active-sessions/` 照会）は task-tracker 内の手順に畳み込み、エージェントは削除。参照 5 ファイルを更新 |

1. [x] multi-session-coordinator 削除 + 参照更新（task-tracker SKILL ×3 箇所 / lead-pipeline SKILL / ultracode-mode / git-branch-flow / comm-protocol README）
2. [x] security-reviewer の処遇反映（ユーザー選択: 痩身して存続）
3. [x] role-pm の description 痩身と起動条件の限定
4. [x] 全 keep エージェントの description 痩身（起動条件の箇条書きを圧縮、非対象は 1 行）。目標: frontmatter description 合計を半減
5. [x] `rules/agent-management.md` に「棚卸し規約」を 3 行追記: 半年ごとに使用実績を集計し、2 ヶ月連続ゼロの agent は削除候補にする（観測コマンドは harness-reflect スキルへ）

### Phase B: メタハーネス最小ループ（reflection）

6. [x] `skills/harness-reflect/SKILL.md` 新設。内容:
   - 摩擦シグナル収集: transcripts からの agent/skill 起動集計・permission 拒否・hook 失敗の grep レシピ（今回手作業でやった集計をレシピ化する）
   - 出力: 「観測サマリ + 提案 diff」形式。**変更の適用はしない**（ブランチ + ユーザー承認の人間ゲート。meta-harness.md 原則 3）
   - 安全策: スナップショット前提（git）・対象は claude-dotfiles 配下のみ・settings.json / hooks は提案どまり
7. [ ] `rules/` の goal-shaped 点検: 手順が書かれた常駐 rule を洗い出し、skill への移設候補一覧を harness-reflect の初回実行で出す（本計画では一覧化まで）

### Phase C: 7/19 計画との整合

8. [x] 7/19 計画に補正 note を追記: role-explorer 新設（§5.1）は組み込み Explore agent で代替とし取り下げ。同計画の他項目（tier 引き下げ・role-fixer・deterministic-gate 等）の採否は別途判断
9. [x] コスト観測性は当面 `/usage` + harness-reflect の集計で足りると判断し、OTel 常設は見送り（実測の痛みが出たら再検討）

## Files

| File                                                                   | Operation      | Notes                                                    |
| ---------------------------------------------------------------------- | -------------- | -------------------------------------------------------- |
| `claude/agents/multi-session-coordinator.md`                           | delete         | ユーザー承認後                                           |
| `claude/skills/task-tracker/SKILL.md`                                  | edit           | 競合チェックをエージェント起動なしの手順に置換（3 箇所） |
| `claude/skills/lead-pipeline/SKILL.md`                                 | edit           | 同上の参照 1 行                                          |
| `claude/skills/lead-pipeline/references/ultracode-mode.md`             | edit           | 同上の参照 1 行                                          |
| `claude/skills/git-branch-flow/SKILL.md`                               | edit           | Layer 1 確認手順を直接記述に置換                         |
| `claude/templates/comm-protocol/README.md`                             | edit           | Phase 4 の統合予定記述を更新                             |
| `claude/agents/security-reviewer.md`                                   | delete or edit | ユーザー選択後                                           |
| `claude/agents/role-pm.md`                                             | edit           | description 痩身 + 起動条件限定                          |
| `claude/agents/role-qa.md` ほか keep 組                                | edit           | description 痩身                                         |
| `claude/rules/agent-management.md`                                     | edit           | 棚卸し規約 3 行                                          |
| `claude/skills/harness-reflect/SKILL.md`                               | create         | Phase B の核                                             |
| `claude/docs/plans/2026-07-19-multiagent-harness-cost-optimization.md` | edit           | role-explorer 取り下げ note                              |
| `claude/docs/meta-harness.md`                                          | created        | 設計原則の正本（本計画と同日作成済み）                   |

## Verification

- [ ] 削除・痩身後、残存する各エージェントを Agent ツールで smoke 起動できる（description 起点の自動起動が壊れていない）
- [ ] `grep -r "multi-session-coordinator" claude/` が定義ファイル以外 0 件（削除実施時）
- [ ] agent description 合計トークンの before/after を実測し半減を確認
- [ ] harness-reflect の初回実行で、今回の手作業集計と同じ表が再現できる
- [ ] lead-pipeline の重ティアフロー（pm→engineer→qa）が一連で通る
