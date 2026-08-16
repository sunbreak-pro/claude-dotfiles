# Plan: 常駐コンテキストの棚卸しと痩身

- **Status**: COMPLETED（2026-08-16 実施・Phase A〜E 完了。D-1 / D-2 の `~/.claude` 清掃のみユーザー確認待ち）
- **Created**: 2026-08-16
- **Project**: claude-dotfiles
- **位置づけ**: `docs/plans/2026-08-13-context-efficiency-rollout.md` の **P3（グローバル rules の常駐最小化）の実施計画**。設計原則の正本は `docs/meta-harness.md`（特に原則 2「自由の原資はコンテキストの余白」・原則 4「規範は宣言、強制は決定論」）。
- **やらないこと**: エージェントの棚卸しは `docs/plans/2026-08-13-agent-portfolio-and-meta-harness.md`（IN PROGRESS）が担当。本計画では `claude/agents/` に触れない（二重管理の回避）。

## Context

### 常駐層の実測（2026-08-16）

「毎セッション必ず読まれるもの」= CLAUDE.md ＋ `paths:` 無し rules ＋ output style ＋ skill/agent description。

| 区分                        | 内訳                                                                                                                                                                       | サイズ      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `claude/CLAUDE.md`          | 61 行                                                                                                                                                                      | 4,545 B     |
| output style                | `output-styles/tone-persona.md`（settings.json で常時有効）                                                                                                                | 4,594 B     |
| rules（`paths:` 無し 8 本） | tone 4,711 / bash-tool-stability 3,160 / heavy-workflows 2,191 / memory-boundary 1,036 / skill-launch 801 / conversation-workflow 555 / tool-usage 165 / session-start 128 | 12,747 B    |
| skill description × 19      | 最大 lead-pipeline 886 B、次いで execution-router 718 B                                                                                                                    | 約 8,900 B  |
| agent description × 7       | 最大 deep-web-research 855 B                                                                                                                                               | 約 5,119 B  |
| **合計**                    |                                                                                                                                                                            | **約 36KB** |

`paths:` 付きの 3 本（`agent-management` / `skill-management` / `plan-mode-quality`）は既にオンデマンド化済みで、本調査セッションでも常駐していないことを確認した。P3 の残作業は上記 8 本と CLAUDE.md 本体。

### スキル起動実績（`~/.claude/projects/**/*.jsonl` 全走査、2026-07〜08 の 2 か月・約 700 セッション）

| スキル                                                                 | 7 月    | 8 月    | 判定                                                     |
| ---------------------------------------------------------------------- | ------- | ------- | -------------------------------------------------------- |
| task-tracker                                                           | 44      | 57      | 中核                                                     |
| session-verifier                                                       | 16      | 44      | 中核                                                     |
| lead-pipeline / execution-router / code-review / git-workflow          | 8/4/6/7 | 6/8/5/3 | 現役                                                     |
| ask-user / git-branch-flow / git-conflict-resolver                     | 1/2/1   | 3/1/1   | 少ないが現役                                             |
| graphify / efficient-codebase-nav / playwright-verify                  | 0       | 各 1    | 実績ほぼゼロ（後 2 者は 8/10 追加で判定保留）            |
| **code-teacher / code-refactoring / debug-strategy / life-editor-mcp** | 0       | 0       | **2 か月ゼロ**（いずれも 6/10 作成）                     |
| code-plan-editor                                                       | 0       | 0       | **2 か月ゼロ**（`plan-mode-quality` が正本として参照中） |
| project-setter / harness-reflect                                       | 0       | 0       | 用途上まれ（8/06）/ 新設直後（8/13）で判定不能           |

### 問題

1. **矛盾**: `CLAUDE.md:61` が「標準構造は project-setter スキルが正本。常時ロードから外した（2026-08-06）」と宣言しているのに、外す対象だった本文（34〜57 行）が残っている。`skills/project-setter/SKILL.md:10-33` と**逐語で同一**。移設先は完成済みで、削除し忘れているだけ。
2. **口調が 3 重**: output style（4.6KB・正本）→ `rules/tone.md`（4.7KB・補遺）→ `CLAUDE.md:8-16`（9 行・「保険としての要約」）。output style はシステムプロンプト直書きで最も強く効くため、3 段目の保険は費用に見合わない。`rules/tone.md` も「言葉のレベル」節が tone-persona の「説明のしかた」と重複する。
3. **常駐に置く必然性のない手順書**: `bash-tool-stability.md`（3.2KB）はハング発生時にだけ要る対処フロー。`heavy-workflows.md` の `/loop` 即貼りテンプレも提案する瞬間にしか要らない。meta-harness 原則「rules = 判断基準（常駐・短い）/ skills = 手順書（呼ばれたときだけ）/ docs = 背景知識」に照らすと配置が誤っている。
4. **ファイル 3 本ぶんのヘッダ負け**: `session-start.md`(4 行) / `tool-usage.md`(4 行) / `conversation-workflow.md`(6 行) は、中身より各ファイルに付くパスヘッダのほうが長い。
5. **使われないスキルの固定費**: 起動ゼロ 4 本と task-tracker(101 回) が同じ description 固定費を払っている。
6. **誤読・混乱のもと（トークンには効かない）**: `~/.claude` に死んだ symlink 15 本（全て存在しない `~/dev/claude-dotfiles` を指す）、`settings.json.bak.1〜5` ほか 6 本、README の実態ズレ（skills 15→19 / docs は hooks_guide.md のみ→ meta-harness.md と plans/ もある）。

## 検討した代替案

| 案                                                    | 採否 | 理由                                                                                                                                                   | 復活条件                         |
| ----------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| A: 重複解消 → 常駐外し → スキル退避 の 3 段階         | ✓    | 移送先が既にある順に処理でき、各段階が独立して差し戻せる                                                                                               | —                                |
| B: rules を全面リライトして数本に統合                 | ✗    | meta-harness が明示的に禁じている（「全面リライト運動はしない。摩擦シグナルが指した箇所だけ」）                                                        | —                                |
| C: 未使用スキルを削除                                 | ✗    | 2026-08-16 ユーザー判断で archive 退避を選択。削減効果は同じで復帰可能性が残る                                                                         | archive が溜まって邪魔になったら |
| D: `rules/skill-launch.md`(801B) も削除し hook だけに | 保留 | hook（`skill-launch-notice.mjs`）が強制済みで原則 4 上は削れるが、宣言の正本が消えると hook の意図が読めなくなる。Phase B で 2〜3 行に圧縮するに留める | —                                |
| E: `graphify-out/` を消して毎プロンプト注入を止める   | 保留 | 別リポジトリの運用にも関わるため本計画のスコープ外。Phase D で提案のみ                                                                                 | ユーザー判断が出たら             |

## Scope (Touchable Paths)

- **触ってよい**: `claude/CLAUDE.md`, `claude/rules/`（`paths:` 無しの 8 本）, `claude/docs/`, `claude/skills/`（description 行と archive 移動のみ）, `README.md`
- **触らない**: `claude/output-styles/`（口調の正本・変更禁止）, `claude/agents/`（8/13 計画の担当）, `claude/settings.json`, `claude/hooks/`
- **確認必須**: スキルの移動・削除は `rules/skill-management.md` §削除前の確認義務によりユーザー確認済み（2026-08-16 archive 退避で合意）

## Steps

### Phase A: 重複の解消（移送先が既にあるものだけ・リスク最小）

- A-1. `claude/CLAUDE.md` の「Project Documentation Structure」節（34〜57 行のファイル階層＋運用原則）を削除し、`project-setter` スキルへの 1 行ポインタに置換。61 行目の既存の宣言文と統合する。**削除前に `skills/project-setter/SKILL.md` に全項目が存在することを差分で確認**（現時点で逐語一致を確認済み）
- A-2. `claude/CLAUDE.md` の「口調・人格」節の「保険としての要約」3 行を削除。正本（output style）と補遺（rules/tone.md）へのポインタ 1 行だけ残す
- A-3. `claude/rules/tone.md` の「言葉のレベル」節を、tone-persona と重複しない部分（「使われた用語＝理解済み、とみなさない」）だけに圧縮
- A-4. `session-start.md` / `tool-usage.md` / `conversation-workflow.md` の 3 本を CLAUDE.md の 1 節（Working Rules）へ統合し、rules から削除

**見込み**: −約 4.0KB

### Phase B: 常駐から外す（移送先を作ってから移す）

- B-1. `claude/docs/bash-tool-stability.md` を**先に作成**（rules 版の全文を移送）。その後 `rules/bash-tool-stability.md` を削除し、CLAUDE.md に「ツール実行直後にハングしたら `docs/bash-tool-stability.md`（原因は本体側・ローカル調査は無駄）」の 2 行を残す
- B-2. `rules/heavy-workflows.md` の `/loop` 即貼りテンプレ 4 本を `skills/execution-router/SKILL.md` へ移送し、rules 側は「提案の責務」と「安全則」だけに絞る
- B-3. `rules/memory-boundary.md` を境界宣言 3 行に圧縮（sui-memory 未インストールの現況報告は README の「マシン固有・共有しないもの」節へ移送）
- B-4. `rules/skill-launch.md` を 2〜3 行に圧縮（強制は hook 側にあることを明記し、宣言だけ残す）

**見込み**: −約 3.6KB

### Phase C: スキルの棚卸し

- C-1. `claude/skills-archive/` を新設（`install.mjs` の manifest 対象外＝ `~/.claude/skills` に配られないことを確認する。ここが肝で、`~/.claude/skills/` 配下に置くと description が常駐し続けて意味がない）
- C-2. `code-teacher` / `code-refactoring` / `debug-strategy` / `life-editor-mcp` を `skills-archive/` へ移動
- C-3. 移動した 4 本への参照を全文検索して修復（`rules/` `skills/` `docs/` `README.md`）。特に `code-refactoring` は `assets/templates/SKILL.md.template` を持つため、他スキルからの参照が無いか確認する
- C-4. description が重い上位 5 本（lead-pipeline 886B / execution-router 718B / playwright-verify 649B / task-tracker 593B / code-teacher は退避済み）を `rules/skill-management.md` §Description 最適化の基準（1 行要約＋トリガー語 5〜10 語）に合わせて圧縮
- C-5. `code-plan-editor`（2 か月ゼロ）は**退避しない**。`rules/plan-mode-quality.md` が書式の正本として参照しており、Plan mode 経由で暗黙に効いているため。代わりに description のトリガー語を見直す

**見込み**: −約 3.0KB

### Phase D: 清掃（コンテキストではなく誤読防止）

- D-1. `~/.claude` の死んだ symlink 15 本（`agents.bak` `CLAUDE.md.bak` 等・全て存在しない `~/dev/claude-dotfiles` を指す）を削除。**repo 外の破壊操作のためユーザー確認を取ってから実行**
- D-2. `~/.claude/settings.json.bak`〜`.bak.5` の 6 本を最新 1 本だけ残して削除（同上・要確認）
- D-3. `README.md` の構成表を実態に合わせる（skills 19 個 / docs は hooks_guide.md・meta-harness.md・plans/ / hooks 表から退役済み `adversarial-review-gate` の記述が残っていないか確認）
- D-4. `graphify-out/`（2026-07-28 生成・2MB・graphify 起動実績 通算 1 回）がこのリポジトリで毎プロンプト約 350 字を注入している件を**提案として記載のみ**。削除の可否はユーザー判断

### Phase E: 観測ループへの還元

- E-1. 本調査は `harness-reflect` スキルの守備範囲そのものだった（手作業で実施）。実際に使った計測コマンド（`~/.claude/projects/**/*.jsonl` からの skill / subagent_type 集計、description バイト数の測り方）を `skills/harness-reflect/SKILL.md` に反映する
- E-2. 本計画の結果（36KB → 実測値）を `docs/plans/2026-08-13-context-efficiency-rollout.md` の P3 に追記し、P3 を DONE にする

## Files

| ファイル                                                     | 変更                                            |
| ------------------------------------------------------------ | ----------------------------------------------- |
| `claude/CLAUDE.md`                                           | 34〜57 行削除 / 口調要約削除 / rules 3 本を統合 |
| `claude/rules/tone.md`                                       | 重複節の圧縮                                    |
| `claude/rules/session-start.md`                              | 削除（CLAUDE.md へ統合）                        |
| `claude/rules/tool-usage.md`                                 | 削除（同上）                                    |
| `claude/rules/conversation-workflow.md`                      | 削除（同上）                                    |
| `claude/rules/bash-tool-stability.md`                        | 削除 → `claude/docs/bash-tool-stability.md`     |
| `claude/rules/heavy-workflows.md`                            | テンプレを execution-router へ移送              |
| `claude/rules/memory-boundary.md`                            | 3 行に圧縮                                      |
| `claude/rules/skill-launch.md`                               | 2〜3 行に圧縮                                   |
| `claude/skills-archive/`（新設）                             | 未使用スキル 4 本の退避先                       |
| `claude/skills/execution-router/SKILL.md`                    | `/loop` テンプレ受け入れ                        |
| `claude/skills/harness-reflect/SKILL.md`                     | 計測手順の追記                                  |
| `claude/docs/plans/2026-08-13-context-efficiency-rollout.md` | P3 を DONE に更新                               |
| `README.md`                                                  | 構成表の実態合わせ                              |

## Verification

- **定量**: 変更前後で常駐層のバイト数を同じ方法（`wc -c` on CLAUDE.md + `paths:` 無し rules + output style、および description 抽出の合計）で測り、36KB → 25〜26KB を確認する
- **回帰**: `paths:` 無し rules が意図どおりの本数になっているか、`grep -L 'paths:' claude/rules/*.md` で確認
- **参照切れ**: 削除・移動したファイル名をリポジトリ全文検索して、宙に浮いた参照がゼロであることを確認（`bash-tool-stability` / `session-start` / `tool-usage` / `conversation-workflow` / 退避 4 スキル名）
- **実効確認**: `node install.mjs` を再実行し、`~/.claude/skills/` に `skills-archive` が配られていないこと、削除した rules が `~/.claude/rules/` から消えていることを確認
- **体感確認**: 新規セッションを 1 本開き、システムプロンプトに退避したスキルの description と削除した rules が現れないことを目視する
- **コミット単位**: Phase ごとに 1 コミット（A / B / C / D / E）。ブランチは新規に切る（現在の `chore/agent-portfolio-and-meta-harness` は 8/13 計画の実装中のため混ぜない）

## 実施結果（2026-08-16）

ブランチ `chore/resident-context-diet`。計測は同一スクリプト（CLAUDE.md ＋ output style ＋ `paths:` 無し rules ＋ skill / agent description のバイト合計）を実施前コミット `c91d73e` と実施後で回した。

| 区分                             | Before        | After        | 差                    |
| -------------------------------- | ------------- | ------------ | --------------------- |
| `claude/CLAUDE.md`               | 4,545 B       | 2,474 B      | −2,071 B              |
| 常駐 rules                       | 8 本 12,747 B | 4 本 7,212 B | −5,535 B              |
| skill description                | 19 本         | 15 本        | −2,693 B              |
| output style / agent description | 変更なし      | 変更なし     | 0                     |
| **合計**                         | **36,527 B**  | **26,217 B** | **−10,310 B（−28%）** |

目標レンジ（25〜26KB）にほぼ着地。回帰確認は全て通過:

- `paths:` 無し rules は `tone` / `heavy-workflows` / `memory-boundary` / `skill-launch` の 4 本
- 削除・移動したファイル名の全文検索で宙に浮いた参照ゼロ
- `node install.mjs` 再実行で `~/.claude/skills/` に `skills-archive` が配られず、削除した rules も `~/.claude/rules/` から消えていることを確認（`.bak` の増殖なし）

### 計画からの逸脱

- **`claude/agents/role-engineer.md` を 1 行だけ触った**（Scope の「触らない」に反する）。frontmatter の `skills:` に `code-refactoring` が載っており、退避で参照先が消えるため。8/13 計画のポートフォリオ判断には踏み込んでいない。
- **`skills/playwright-verify/SKILL.md` の `MANDATORY FIRST ACTION` 行を削除**。`rules/skill-launch.md` が「個々の SKILL.md 本文には書かない」と宣言しているのに残っていた転記。C-4 で description を触るついでに解消した。

### D-1 / D-2 の現況（ユーザー確認待ち）

- 死んだ symlink は実測 **9 本**（計画の記載は 15 本）。全て `~/dev/claude-dotfiles`（不在）を指す `*.bak`: `agents` `CLAUDE.md` `docs` `hooks` `output-styles` `rules` `skills` `statusline-command.mjs` `templates`
- `settings.json.bak` は **7 本**（`.bak` 〜 `.bak.6`）。最新 `.bak.6`（8/16 17:45・11,229 B）は今日の install で退避された旧ライブ設定なので、これだけ残すのが妥当

### D-4: `graphify-out/` の提案（ユーザー判断待ち）

`hooks/graphify-nudge.mjs` が `graphify-out/graph.json` のある repo で毎プロンプト約 350 字を注入している。本リポジトリのグラフは 2026-07-28 生成で、graphify スキルの起動実績は通算 1 回。**このリポジトリでは注入コストが実績に見合っていない**ため、`graphify-out/` の削除か nudge の対象外化を提案する。他リポジトリの運用には影響しない。
