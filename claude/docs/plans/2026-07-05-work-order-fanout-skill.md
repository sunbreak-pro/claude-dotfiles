---
Status: DRAFT (handoff)
Created: 2026-07-05
Origin: life-editor chat-frontend（ClaudeDesign fan-out オーケストレータ）からの引き継ぎ
Branch: 未着手（本計画を実行するセッションが claude/work-order-fanout-skill 等を切る）
---

# Plan: work-order fan-out のスキル化 + 並列系資産のコンパクト化

## 0. 起動方法（このファイル自体が作業オーダー）

claude-dotfiles リポジトリで新セッションを開き、最初のメッセージに 1 行:

```text
計画書 .claude/docs/vision/plans/2026-07-05-work-order-fanout-skill.md を読み、ゴールまで実行してください。
```

---

## 1. 背景 — life-editor で実証済みの「work-order 方式」

life-editor の ClaudeDesign brief fan-out（10 並列セッション）で、当初の
「セッションごとに長い貼り付けプロンプトを配布する」方式に以下の問題が出た:

1. プロンプトが長大・複雑でユーザーの起動負担が大きい
2. 基盤変更（palette 変更等）で配布済みプロンプトが旧化しても直せない（SSOT が分散）
3. 同一 worktree を複数セッションで共有し、**ブランチ混線事故が実際に発生**（analytics の成果物が settings のブランチに commit される等）
4. 完了プロトコルが曖昧で、**未 commit のまま放置された成果物**が発生（後から salvage が必要になった）

これを 2026-07-05 に「work-order 方式」へ改定し、実運用で成立を確認した。
**参照実装（read-only で必読）**:

- 計画書の §Work Orders 節: `~/dev/apps/life-editor/.claude/docs/vision/plans/2026-07-04-claudedesign-screen-design-fanout.md`
- 起動スクリプト: `~/dev/apps/life-editor/.claude/scripts/design-work.sh`

ユーザーの起動 UX は「スクリプト 1 コマンド + セッション先頭に 1 行」まで縮んだ:

```bash
bash .claude/scripts/design-work.sh <slug>   # worktree / branch / セッション標識を自動作成
# → cd .claude/worktrees/<slug> && claude
# → 「計画書 <path> の作業オーダー <slug> をゴールまで実行してください。」
```

## 2. 方式の中核設計（スキル化すべき不変要素）

1. **slug 統一規約**: worktree = `.claude/worktrees/<slug>` / branch = `claude/<slug>` / session-name = `<slug>`。名前の対応表を不要にし、identity 検証を機械化する
2. **計画書の 4 部構成**: 起動手順（ユーザー向け）/ セッション共通プロトコル / タスク種別ごとの共通手順 / 作業レジストリ（slug・成果物・PR タイトル）+ オーダー詳細（差分のみ）
3. **セッション共通プロトコル**: ①SessionStart の identity 表示で worktree / branch を自己確認（不一致なら停止・報告）②必読順（計画書全体 → 自オーダー → 列挙ファイル）③単一書込者（成果物は互いに素に切る）④完了プロトコル = AC 自己チェック → task-tracker 記録 → draft PR（タイトルはレジストリで固定）→ 自分の outbox に要約 append → 報告 ⑤self-merge 禁止・main 直接 push 禁止
4. **機械検証可能性**: 埋め込み共通ブロックに版マーカー（例:「v2 / 2026-07-05」見出し）を入れて stale を grep 検出 / 旧値（hex 等）の残存を grep で 0 件確認 / AC は grep・ls で判定できる形に書く
5. **起動スクリプト**: `fetch origin main` → `worktree add -b claude/<slug> origin/main` → `.session-branch` / `.session-name` 書き込み → 次の手順（cd + claude + 1 行プロンプト）を echo。slug は whitelist 検証
6. **Gate 原則**: 🤖 = draft PR まで自律 / 🛑 = merge・外部サービス投入はユーザー

## 3. 運用の教訓（スキル本文に落とすべき gotcha）

- **1 chat = 1 worktree = 1 branch は必須**。理屈（git は 1 worktree に 1 ブランチ）と実事故の両方が根拠
- 貼り付けプロンプトは「配布した瞬間に旧化が始まる」。計画書参照方式なら SSOT が 1 箇所で、改定は 1 ファイルの編集で済む
- オーダー本文が乗る PR の merge を全オーダーの起動条件にする（依存を 1 点に集約し、起動後の版ズレを構造的に防ぐ）
- 共通手順は 1 回だけ書き、各オーダーには**差分だけ**書く（重複記述が drift の温床）
- worktree はドキュメント作業なら軽量（npm install 不要）。コード作業では node_modules / .tsbuildinfo 非共有に注意
- 完了プロトコルを固定しないと未 commit 成果物が生まれる（実例あり）。「draft PR まで」を完了の定義にする
- 複数行シェルコマンドをチャットで配ると zsh 貼り付けで改行・`;` が欠けて parse error になる。**配るのは 1 コマンド（スクリプト）に畳む**

## 4. ゴール

### A. 新スキルの作成（本丸）

`claude/skills/` に汎用スキル（名称案: `work-order-fanout`。`plan-fanout` 等でも可）を新規作成する。
プロジェクト非依存に一般化し、責務は:

1. 計画書に §Work Orders 節を生成する手順 + テンプレート（§2 の 4 部構成）
2. 起動スクリプトのテンプレート（対象プロジェクトの `.claude/scripts/` に配置する形。slug whitelist は計画書のレジストリと二重管理にならない設計を検討 — 計画書から grep する等）
3. 1 行起動プロンプトの規約
4. 完了プロトコル・Gate・機械チェックの標準文面

### B. 並列系資産の棚卸し・コンパクト化

現状規模（2026-07-05 実測・claude-dotfiles 内）:

| 資産                                                    | 行数        | 初期見立て（最終判断はこのセッション + ユーザー）                                                       |
| ------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `skills/execution-router`                               | 99          | 維持寄り。/loop・/goal・/batch 判断は work-order と直交。ただし新スキルへの導線を追記                   |
| `skills/lead-pipeline`（+references）                   | 95+         | 維持寄り。fan-out 判断時に新スキルを選択肢に入れる改訂                                                  |
| `rules/heavy-workflows.md`                              | 22          | 新スキルへの参照を追加（並列 fan-out の標準手段として）                                                 |
| `agents/multi-session-coordinator.md`                   | 248         | **圧縮 or 削除候補**。work-order 方式では計画書レジストリ + task-tracker inspect で代替可能な監視が多い |
| `agents/role-pm.md` / `role-engineer.md` / `role-qa.md` | 157/153/180 | 直交（サブエージェント分業）なので原則維持。ただし重複前置きの圧縮余地                                  |

- 判断基準: ①新スキルと責務が重複する部分は新スキルへ吸収 ②「俯瞰・監視」系で実際に呼ばれていないものは削除候補 ③削除は 🛑（ユーザー承認後のみ実施）
- 関連（**別リポジトリ・本計画のスコープ外**だが記録): life-editor のプロジェクトスキル `parallel-orchestrator`（skill-lib/projects/life-editor/）は新スキルでほぼ代替可能になる見込み → 完了後に別途削除判断を提案すること

### C. 参照の更新

新スキル追加に伴い `rules/heavy-workflows.md`・`CLAUDE.md`（Heavy Work Modes 章）の導線を 1〜2 行で更新する。

## 5. Scope / Gate / 注意

- **Scope**: claude-dotfiles リポジトリ内（`claude/skills/` `claude/agents/` `claude/rules/` `claude/CLAUDE.md` `manifest.json`）。skill-lib と life-editor は read-only 参照
- **Gate**: 🤖 スキル作成・棚卸しレポート・draft PR まで ／ 🛑 既存スキル / エージェントの削除実施・merge はユーザー
- ⚠️ `claude/` 配下は `~/.claude` に **symlink されており、編集が全セッションに即時反映される**。必ずブランチを切って作業し、破壊的変更（削除・大幅改稿）は PR レビュー後に merge する
- manifest.json は skills ディレクトリ単位の link なので、スキル追加で個別エントリ追記は不要のはず（要確認）

## 6. Acceptance Criteria（機械検証可能）

- [ ] 新スキル `claude/skills/<name>/SKILL.md` が存在し、①計画書テンプレ ②起動スクリプトテンプレ ③1 行起動プロンプト規約 ④完了プロトコル、の 4 要素を含む（目標 150 行以下 — コンパクト化が趣旨なので肥大させない）
- [ ] 棚卸しレポート: §4-B の各資産に「維持 / 吸収 / 削除候補」の判定と理由が付いている
- [ ] 削除はユーザー承認済みのものだけ実施されている（承認前の削除 commit がない）
- [ ] `rules/heavy-workflows.md` に新スキルへの導線がある
- [ ] draft PR が作成されている（self-merge しない）
