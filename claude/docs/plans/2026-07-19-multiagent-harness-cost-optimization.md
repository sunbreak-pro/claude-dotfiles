# マルチエージェント・ハーネス コスト最適化 — 既存構成への適用実装計画

> レポート「AI マルチエージェント・ハーネス設計およびコスト最適化ガイドライン」を、既存の Claude Code グローバル構成（claude-dotfiles）と life-editor に接ぐための実装計画書。**今回は計画のみで実装はしない。** 各施策は既存のマルチエージェント土台に「再配線」で接ぐ Phase 1 と、実データで痛みが出たら着手する Phase 2 に振り分けてある。

## 1. メタ情報

**Status:** PLANNED
**対象:** claude-dotfiles（実体 `C:/Users/user/OneDrive/Desktop/dev/claude-dotfiles/claude`、`~/.claude/` へシンボリックリンク配布）
**適用先プロジェクト:** life-editor（ハーネスを回す実対象。詳細は §7）
**前提環境:** Windows 11 / PowerShell + git-bash / Node.js フック（.mjs）/ メインループ model = `claude-fable-5[1m]`（effort xhigh, ultracode 運用）/ sub-agent は再帰起動不可・メインが Agent ツールで逐次起動
**配置:** 本計画書は指示どおり `claude/docs/plans/2026-07-19-multiagent-harness-cost-optimization.md` に置く（`docs/plans/` は本計画で新設）。CLAUDE.md の Document System 規約（software プロジェクトは `docs/vision/plans/`）とはズレるが、本 dotfiles リポは `docs/` 直下運用のため `docs/plans/` を採用する。恒久規約 SSOT（`report-envelope-schema.md` 等）は `claude/docs/` 直下に置く。
**最終更新:** 2026-07-19

---

## 2. 背景と目的

report は「フェーズごとに最適なモデルを使い分け、探索と実装を分離し、状態と成果物を外部化し、決定論ツールで前後を挟み、報告を構造化し、キャッシュを効かせる」という 6 次元の運用改善を提案している。これを一から作るのではなく、*_既存のマルチエージェント土台（lead-pipeline / role-_ / pipeline-gate / task-tracker / session-verifier / comm-protocol）に接ぐ**のが本計画の狙いである。

現状の一番の痛みは、メインループを常に `claude-fable-5[1m]`（最上位・1M ctx・fast）で回している点にある。料理でいえば、味見からメイン調理から皿洗いまで全部いちばん腕のいい料理人にやらせているようなもので、探索や軽い修正のような「腕を落としても足りる工程」まで最上位が走ってコストが過多になる。ここをサブエージェントのティア引き下げで削るのが Phase 1 の本丸である。

ただし report には到達不能な誇張（キャッシュ 90% 削減、親による機械的な報告集約など）と、この環境では原理的に成立しない配線（Stop フックから MCP を叩く等）が混じっている。本計画はそれらを正直に補正し、**「今すぐ効く再配線（Phase 1）」と「実データで痛みが出たら着手する新規インフラ（Phase 2、大半は保留・不採用）」**の二段に振り分ける。

## 3. 設計方針

- **二段構え。** Phase 1 は新規サーバ・DB を一切足さず、既存の skill / agent / hook / model 設定を書き換える「再配線」だけで完結させる。Phase 2 は AST/シンボル抽出 MCP や外部状態ストアといった新規インフラだが、敵対的レビューの結果ほとんどが drop または「note に留める」判定になった。
- **正本は 1 箇所に寄せ、他はリンクで参照する。** model ルーティングは `agent-management.md` のマトリクス、報告エンベロープは `docs/report-envelope-schema.md`、成果物の物理規定は `rules/artifact-referencing.md` を SSOT にする。frontmatter・SKILL・フックには値をコピーせず参照リンクだけを置き、二重管理の回帰を防ぐ。
- **制約を正直に書く。** ティアを下げられるのは Agent ツールで起動するサブエージェント（Explore / Execute / QA / Fix）だけ。**オーケストレーターのメイン自身は `settings.json` で `claude-fable-5[1m]` 固定＝常に最上位で、フェーズごとに下げられない。** よって「メイン直接の実装」「メインが回す session-verifier（非AI 検証）」は最上位で走る。この非対称をマトリクスに明記する。
- **サブエージェントの `model:` は frontmatter 固定。** Task 起動時に per-call で opus へ差し替える確実な手段は無い。だから「失敗したら role-engineer を opus で再起動」は成立しない。エスカレーションは「メインが直接引き取る（メイン＝最上位に自然に上がる）」で実装する。
- **フックは決定論・fail-open・MCP 非依存。** Stop フックは MCP クライアントを持たない短命 node プロセスなので、フックから life-editor MCP は叩けない。MCP を呼べるのはモデル本体だけ。よって台帳・状態外部化を「フックが MCP に書く」設計は全て不採用にする。
- **既存資産は壊さない。** 既にある規律（efficient-codebase-nav の search-before-read、tool-usage の native>bash、task-tracker の状態管理、comm-protocol の参照渡し原則）は再定義せず、欠けている一点だけを足す。

## 4. 現状 vs report ギャップ一覧

| 次元                             | 既にある（既存で充足）                                                                                                      | 欠けている（本計画で埋める）                                               | 対応 Phase                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| model-routing                    | per-agent `model:` frontmatter 機構、メインは `fable-5[1m]` 固定                                                            | フェーズ×ティアの正本マトリクス、探索/実装/AI検証の tier 引き下げ          | P1（frontmatter＋matrix）/ P2（任意ローカル JSONL のみ）           |
| lazy-loading-explore             | search-before-read・offset/limit・全文 Read 上限（efficient-codebase-nav）、native>bash（tool-usage）、self-contained brief | 探索と実装の相分離、path:line マップという成果物概念、専任軽量エージェント | P1（マップ＋専任エージェント）/ P2（将来オプション・確定させない） |
| external-state（③ 成果物参照化） | 状態の外部化（① task-tracker）、comm-protocol の「詳細は…参照」原則                                                         | 物理ストア・命名・閾値・受け渡し書式・サブ→メインの担保                    | P1（filesystem 単独）/ P2（note のみ）                             |
| structured-reporting             | 3 意味フィールド（サマリ/変更ファイル/検証）が全テンプレに存在                                                              | キー名の統一・enum 化・canonical schema                                    | P1（md 編集のみ）/ P2（実データで痛むまで着手しない）              |
| deterministic-sandwich（④）      | session-verifier が tsc/lint 手順を保持、post-edit-prettier（fail-open）                                                    | Stop で型/lint を自動発火する「下パン」、検知↔修正のレイヤ分離             | P1（hook＋role-fixer）/ P2（原則 drop・縮退案のみ）                |
| prompt-caching                   | harness 自動キャッシュ、`paths:` スコープ機構                                                                               | 常駐 rules の予算規律、非キャッシュ末尾の軽量化規約                        | P1（退避＋規約）/ P2（薄い規約追記のみ）                           |

## 5. Phase 1: 既存資産の再配線

### 5.0 着手順（次元横断の依存を解いた順）

依存があるので次の順で入れる。特に「role-explorer が未作成のまま ultracode-mode / pipeline-gate から参照だけ入れると起動失敗」の順序依存に注意する。

1. `rules/agent-management.md`：マトリクス＋ティア解決表＋locate-only カーブアウトを追加（**routing の SSOT。全 frontmatter がこれを参照する**）
2. `agents/role-explorer.md` 新設（model-routing・lazy-loading の両次元が依存）
3. frontmatter 引き下げ：`role-engineer.md`（opus→sonnet）、`role-qa.md`（opus→sonnet, xhigh→high）
4. `agents/role-fixer.md` 新設（deterministic-sandwich が依存）
5. `hooks/deterministic-gate.mjs` 新設 ＋ `settings.json` の Stop 配列に登録
6. `skills/session-verifier/SKILL.md` の Gate1/2 を降格（二重実行回避）
7. rules / docs の新設・退避：`rule-authoring.md`（paths スコープ）、`tool-usage.md`＋1行、`session-start.md`＋1行、`artifact-referencing.md`、`docs/report-envelope-schema.md`、`docs/known-issues/001-sse-streaming-hang.md`、`docs/prompt-caching.md`
8. `skills/efficient-codebase-nav/SKILL.md` 編集（Explore Phase 節＋出口リンク）
9. agent の handoff／エンベロープ編集：`role-engineer.md` / `role-qa.md` / `role-pm.md`（external-state ＋ structured-reporting をまとめて）
10. 結線（依存先が揃ってから最後に）：`skills/lead-pipeline/SKILL.md`、`references/ultracode-mode.md`、`hooks/pipeline-gate.mjs`
11. prompt-caching の痩身：`bash-tool-stability.md` 退避、`tone.md` の重複チェックリスト削除、`CLAUDE.md` に 1 行アンカー
12. **口調回帰チェック（tone.md 編集後の必須ゲート）**

> 注: `agents/` の実配置は要確認。`agent-management.md` の一元管理ルールが「実体 `~/dev/Claude/agents-lib/global/` ＋ symlink ＋ `AGENT_INDEX.md` 追記」を正とするならそれに従い、実測で観測されたプレーンファイル運用ならそれに合わせる。symlink 前提を強制せずリポジトリの実配置に合わせる。

### 5.1 共有エージェント `role-explorer` の統合（2 次元の名前衝突を先に解消）

> **補正（2026-08-13・取り下げ）**: 組み込み Explore agent（read-only・既定 Haiku）が locate-only 偵察を代替するため、**role-explorer の新設は取り下げる**。本節および §5.2 手順 4〜5・§5.3 の role-explorer 結線は「組み込み Explore を locate-only 契約のプロンプト（全文 Read 禁止・成果物は path:line マップ）で起動する」に読み替える。根拠と経緯は `docs/plans/2026-08-13-agent-portfolio-and-meta-harness.md` の調査結果を参照。

model-routing は Explore を `role-explore`、lazy-loading は `role-explorer` と呼んでいるが、**両者は同一のエージェント**（軽量・Read-only・locate-only・path:line マップを返す偵察役）である。名前・frontmatter・契約を一本化する。

- **canonical 名 = `role-explorer`**（lazy-loading 側の契約が詳しいため）。`agents/role-explorer.md` を新設し、`agents/role-explore.md` は作らない。
- frontmatter（両次元の妥協案）:
  - `name: role-explorer` / `model: sonnet`（軽量ティア。haiku は可用性を実測後に段階移行、未解決なら sonnet フォールバック）/ `effort: medium`
  - `tools: [Read, Glob, Grep, Bash, Skill]`（**Write/Edit は持たせない**。Bash は read-only 検索の総当りフォールバック限定）/ `skills: [efficient-codebase-nav]` / `permissionMode: default`
  - model-routing の「厳密 Read-only（Bash 無し）」案と lazy-loading の「Bash 許可」案の折衷。Bash 由来のノイズが出るなら `[Read, Glob, Grep, Skill]` へ狭める。
- 本文契約（3 点固定）:
  1. **ファイル全文 Read 禁止。** Read は記号の行番号確定用に offset/limit 付き数行のみ。
  2. **唯一の成果物は path:line マップ**（表: `symbol | 種別(def/ref/config) | path:line | 1行要約`）。comm-protocol outbox 形式で、影響範囲・既存パターン・known-issues を返す。
  3. **提案・判断を持たない self-contained brief**（`role-pm.md:66-78` と同型）。メインが渡した対象範囲外は探索しない。
- 位置づけは「バグ修正」ではなく**契約の明文化・安定化**。Agent ツールは named agent 定義が無くても汎用エージェントで起動できるため `ultracode-mode.md:28` / `pipeline-gate.mjs:23` の "Explore agent" 参照は壊れてはいない。role-explorer 新設はそこを安定化するもの。

### 5.2 model-routing（Phase 1 の本丸）

対象ファイル: `rules/agent-management.md` / `agents/role-engineer.md` / `agents/role-qa.md` / `agents/role-explorer.md`（§5.1）/ `skills/lead-pipeline/references/ultracode-mode.md` / `skills/lead-pipeline/SKILL.md` / `hooks/pipeline-gate.mjs`

**手順 1 — `agent-management.md` L32-38 を「フェーズ×ティア」軸へ拡張し routing の唯一の正本にする。**

(a) 集約マトリクス表を新設:

| フェーズ       | 担当              | model ティア（現行解決値）              | effort | 理由                                                          |
| -------------- | ----------------- | --------------------------------------- | ------ | ------------------------------------------------------------- |
| Plan           | role-pm           | 最上位（agent=opus）                    | xhigh  | 判定ミスの手戻りが大きい                                      |
| Orchestrator   | main              | **最上位固定（fable-5[1m]・下げ不可）** | xhigh  | settings.json 固定。フェーズで下げられない                    |
| Explore        | role-explorer     | 軽量（当面 sonnet、haiku 将来）         | medium | locate-only＝記録系。精度依存が低い                           |
| Execute        | role-engineer     | 中位（sonnet）                          | high   | 重い決定論検証は session-verifier / deterministic-gate が担う |
| Verify（非AI） | session-verifier  | モデル非依存（起動主体のティアに従う）  | —      | 決定論ツール実行そのもの                                      |
| Verify（AI）   | role-qa           | 軽量（当面 sonnet）                     | high   | 重い決定論は委譲済み・security は別 Agent                     |
| Fix            | role-fixer        | 軽量（安価 fast tier）                  | low    | 診断が指す箇所の機械修正のみ                                  |
| Security       | security-reviewer | 最上位                                  | xhigh  | 据え置き（下げない）                                          |

(b) ティア→model-id 解決表:

| ティア | main          | agent                                                                 |
| ------ | ------------- | --------------------------------------------------------------------- |
| 最上位 | `fable-5[1m]` | `opus`                                                                |
| 中位   | —             | `sonnet`                                                              |
| 軽量   | —             | `haiku`（**未解決なら sonnet フォールバック。当面は sonnet を既定**） |

(c) 旧 L38「トークンより精度優先」を、スコープ付き方針へ書き換える:「判定ミスの手戻りが大きい Plan・Security のみ最上位固定。探索・実装・AI 検証は中〜軽量に落とし、失敗時はエスカレーションで精度を取り戻す」。**「メインは最上位固定＝下げ不可」の一文を必ず添える。**

**手順 2 — `role-engineer.md`:** L19 `model: opus`→`sonnet`（L20 `effort: high` 据え置き）。body に「中位で走る／重い決定論検証は session-verifier（非AI）と deterministic-gate が担うため実装層は中位で足りる」を追記。**エスカレーション条項（後述の現実形）を書く。**

**手順 3 — `role-qa.md`:** L18 `model: opus`→`sonnet`、L19 `effort: xhigh`→`high`。body に根拠追記（重い決定論検証は session-verifier 委譲済み・セキュリティは最上位固定の security-reviewer が別 Agent で担保）。QA 自身が高リスク（認証/認可/DB/IPC）と判定した diff は「最上位での再 QA を推奨」とメインへ返しエスカレート。

**手順 4 — `role-explorer.md` 新設:** §5.1 の通り。`agent-management.md` の一元管理ルールに従い、実配置（agents-lib/global 実体＋symlink＋AGENT_INDEX.md 追記、またはプレーンファイル）を plan 上で確認して合わせる。

**手順 5 — `ultracode-mode.md` L28** を role-explorer 名指し（軽量・Read-only ×2〜4、出力は path:line マップ＝Phase2 role-pm の入力）へ書き換え。unit 分割基準付近に「各 Phase のティアは agent-management.md のマトリクスに従う（ここで再定義しない）」を 1 行追加。**手順 4→手順 5 の順序依存（role-explorer 未作成のまま参照だけ入れると起動失敗）を守る。**

**手順 6 — `SKILL.md`:** 「## モデルルーティング(正本参照)」節を追加し agent-management.md を指す要旨のみ記載。L37「軽めならメイン直接」を**軽ティア（typo / 1 ファイル自明）に限定**し、中ティア（複数ファイル/ロジック）は role-engineer(sonnet) へ回す（メイン直接だと最上位で走り Execute=中位方針に反するため）。「### エスカレーション梯子」を安全則に追加。

**手順 7 — `pipeline-gate.mjs`:** ULTRA 分岐（L21-28）**のみ**にポインタ 1 行（「モデルルーティング詳細は agent-management.md のマトリクス」）を追加。IMPL 分岐（中ティア）は role-explorer 並列を起動しないので追加しない（ノイズ・三重管理回避）。マトリクス本体はフックに複製しない。

**エスカレーション梯子の現実形（最重要）:** サブエージェントの `model:` は frontmatter 固定で per-call 差し替え不可。よって「role-engineer を opus で再起動」は成立しない。代わりに——**中位 Execute が session-verifier / role-qa で失敗した unit は、メインが直接引き取る**（メイン＝fable-5 で自然に最上位化）。将来 opus 版が要るなら `role-engineer-heavy` を別エージェントとして用意する（frontmatter 上書きに依存しない）。この一文を `SKILL.md` と `role-engineer.md` の両方に書く。

### 5.3 lazy-loading-explore

対象ファイル: `agents/role-explorer.md`（§5.1）/ `skills/efficient-codebase-nav/SKILL.md` / `rules/tool-usage.md` / `rules/session-start.md` / `rules/agent-management.md` / 結線先（ultracode-mode / pipeline-gate / lead-pipeline SKILL / role-pm）

**手順 1 — role-explorer 新規作成:** §5.1 で統合済み。

**手順 2 — `agent-management.md` にカーブアウト 1 行:**「locate-only 偵察（提案・判断を持たず path:line のみ返す）は分析系ではなく記録系に準じ `model: sonnet` を許可」。これが無いと同ファイル既存の「探索＋提案→opus」規則と role-explorer の sonnet 選択が矛盾するため、**手順 5.2-1 のマトリクス整備と同時に入れる。**

**手順 3 — `efficient-codebase-nav/SKILL.md` 編集:** Level 3(51行) と Level 4(68行) の間に `## Explore Phase (locate-only)` を挿入。内容は探索/実装フェーズの明示分離と「探索フェーズでの全文 Read 禁止・成果物は path:line マップのみ」の**相分離とマップ成果物だけ**を足す。あわせて Level 4(70行) の「full file contents」と Context Budget(104行) の「Read at most 3-5 in full」に「実装フェーズ限定」の条件を付す（探索フェーズでの全文禁止との矛盾解消）。既存の files_with_matches / offset-limit ルールは再記述しない。

**手順 4 — 常時ルール化は tool-usage.md の 1 行追加のみ:**「Locate before reading — Grep files_with_matches / targeted content で先に path:line を得てから offset/limit で狭く読む。探索フェーズでは全文 Read を使わない」。`session-start.md` は既存の「Read existing code before modifying it」を**残したまま**、別軸の 1 行「Locate before reading; read narrowly (search → path:line → targeted read)」を追加する（**上書きしない**——既存行は「読む軸」の安全規律で、遅延読み込みの軸とは別物）。「全文 Read は実装フェーズのもの」の絶対化はしない（1 ファイル自明修正・レビュー等の正当な全文読みを潰さないため）。

**手順 5 — 采配経路に結線:**

- (a) `ultracode-mode.md:28` の「Explore agent ×2〜4」を role-explorer と明示し、出力を「path:line マップ（全文読込なし）」と規定。
- (b) `pipeline-gate.mjs:23` の文言を role-explorer 名に更新。
- (c) `lead-pipeline/SKILL.md` 重ティア chain の role-pm(1) の前に「0.5 role-explorer(agent) — locate-only 偵察 → path:line マップ」を挿入し、PM には生 context でなくマップを渡す。
- (d) `role-pm.md` 委譲マトリクス「コード探索が必要 → efficient-codebase-nav スキル」を「→ role-explorer agent(locate-only, マップ受領)」へ変更。**マップ受領時に PM が対象妥当性を 1 段確認する規律も併記**（誤パス実装の防止）。

**Phase 1 から外した項目:** 旧 `explore-read-guard.mjs`（PreToolUse:Read で全文 Read を nudge）は、規律が skill＋tool-usage＋session-start に既に載るため 4 重で重複し、正当な全文 Read にも発火してノイズ＋毎 Read の Node 起動コストを生む。一人運用に過剰。**任意・実験扱いに降格**（入れるなら閾値高め・非ブロッキング・1 行 nudge・撤去容易を前提。コア計画に含めない）。

### 5.4 external-state（Element ③: 成果物のパス参照化）

Element ①（状態の外部化）は task-tracker が per-chat `memory/` + `history/` で**既存で充足**のため再提案しない。本節は Element ③＝長大生成物を専用ストアへ逃がし、会話・handoff にはパスだけ渡す標準経路の確立に絞る。

対象ファイル: 新規 `rules/artifact-referencing.md` / 新規 `templates/artifact-store/.gitignore` / 編集 `agents/role-engineer.md`（L122-153）・`role-pm.md`・`role-qa.md` / 編集 `references/ultracode-mode.md`（Phase 3 / Phase 5）/ 編集 `efficient-codebase-nav/SKILL.md`（1 行相互リンク）

**手順 1 — `rules/artifact-referencing.md` 新設（物理規定のみ・原則は再掲しない）:**

- 保存先 = `.claude/artifacts/chat-<self>/YYYY-MM-DD-<slug>.<ext>`。`<self>` は task-tracker と同じく `.claude/comm/.session-name` から取得し、単一書込者原則（自分のディレクトリだけ書く）を継承。
- 外部化の閾値は**目安**（約 1500 トークン / 150 行、またはコードブロック 60 行超・ログ全文・探索ダンプ）。強制はせず、細切れファイル乱造を避ける。
- 受け渡し書式 = 本文には「1〜3 行要約 ＋（何のための成果物か・次アクション）＋ 絶対パス（必要なら行範囲）」のみ。comm-protocol の EXAMPLE outbox（「詳細は …参照」）を踏襲。
- 有界化 = 肥大時 `.claude/artifacts/archive/YYYY-MM/` へ退避（comm-protocol / task-tracker と同型）。
- git 扱い = 既定で非追跡。恒久化したいものだけ `docs/` へ昇格。
- バックエンド選択 = 既定 filesystem。**life-editor MCP が生きていれば** `write_file` を代替バックエンドにしてよいが、未ロード時（現 Windows 環境含む）は自動で `.claude/artifacts/` に degrade する、という分岐を 1 行 note で添える（life-editor-mcp SKILL に専用節は作らない）。
- 重複回避 = 原則は comm-protocol、`chat-<self>` 解決と rolling archive は task-tracker を参照させ、本ファイルは物理規定に徹する。

> **常駐コストの整合（prompt-caching との統合判断）:** `artifact-referencing.md` は situational なので rule-authoring.md の方針に従い `paths:` スコープ化する。ただし paths: マッチが実行時に効きにくいため、**実効の handoff 指示は各 agent md に inline で持たせ（agent 起動時ロード＝非常駐）**、`rules/artifact-referencing.md` は物理規定の参照先に徹して短く保つ。

**手順 2 — handoff 契約の再配線（本節の核・emission 漏れ口の封鎖）:**

- `role-engineer.md` の `## 変更ファイル` テーブル直後に一文追加: 生成コード全文・長大レポート・大ログ・探索ダンプが閾値を超える場合は本文に貼らず `.claude/artifacts/chat-<self>/…` に保存し、要約＋パスのみ返す。
- 同 `## メインチャットへの引き継ぎ` に `- 生成物: <要約> → <artifact パス>` 行を追加。
- `role-pm.md`（要件分解表・調査結果）/ `role-qa.md`（詳細指摘リスト）の各引き継ぎセクションにも同ルールを追記。
- `ultracode-mode.md` の Phase 3（unit 変更返却）と Phase 5（監査返却）に「成果物はパス参照で返し、メインはパス集合を受け取り必要な物だけ遅延 Read する」を追記（原則は artifact-referencing.md へリンク）。
- **要約は「パス先を開かなくても次段の判断ができる粒度」を必須化**し、痩せすぎてメインが結局 Read する二度手間を防ぐ。

**手順 3 — `efficient-codebase-nav` に出口リンクを 1 行だけ張る:** 入口（探索で context を膨らませない）と出口（生成物を貼らない）が同じ目的の表裏だと示す相互参照のみ。段落追記はせず、実効は手順 2 に依存すると割り切る。

### 5.5 structured-reporting（サブ→親報告の正準エンベロープ）

**狙いの正確化:** Agent ツールの返却は「サブの最終テキスト」しかチャネルが無く、親（Fable-5）はそのテキスト中の JSON を「読む」だけ。jq 等で決定的にマージ・検証する機械は挟まらない。よって効能は「親が機械集約・検証」ではなく**「キー名の衝突を消し、自由文 table より一貫した構造で LLM のパース信頼性を上げる」**に限定する。3 意味フィールド（サマリ/変更ファイル/検証）は全テンプレに**既存で充足**、作業はキー名統一・enum 化・写像であって新規設計ではない。

対象ファイル: 新規 `docs/report-envelope-schema.md`（恒久規約 SSOT・docs/ 直下）/ `agents/role-engineer.md`（L122-153）/ `agents/role-qa.md`（L145-180、L97/L109 参照記述）/ `references/ultracode-mode.md`（L30、L37-42/L48-49）/ `hooks/pipeline-gate.mjs`（L21-28、L29-36）

**手順 1 — schema doc は薄く作る。** コア 3 キー＋verification ネスト＋enum のみ:

- `target_files: [{path, operation:"Edit"|"Add"|"Delete"}]`
- `changes_summary: string`（1〜3 行、生データ禁止）
- `verification_status: {typecheck:"PASS"|"FAIL"|"SKIP", lint:同, tests:{passed:int, failed:int, status:同}}`

役割別拡張は「必須は `qa_verdict:"PASS"|"NEEDS_REVISION"|"FAIL"` と ultracode 時の `unit_id` のみ」に絞り、`review_hints` / `next_agent_suggestion` / `blockers` は任意で JSON ブロック後方の散文に書いてよい（層状の厚い拡張スキーマは作らない）。冒頭に鉄則 1 行:「サブ→親返却は本ブロックの ```json を先頭に 1 つだけ置き、補足散文はブロックの後ろに書く」。効能書きは「機械集約」ではなく「キー名を canonical に固定してパース衝突を除く」と正確に書く。末尾に参照元（role-engineer / role-qa / ultracode-mode / comm-protocol）を貼る。

**手順 2 — `role-engineer` L122-153** を「必須 JSON コア＋散文補足」に再構成。実装サマリ→`changes_summary`、変更ファイル table→`target_files`、セルフ検証→`verification_status`(enum) へ写像。本文 L109/L110 の「編集ファイル」表記を canonical 名 `target_files` に統一。JSON 直後に人間可読の 1 行サマリ併記を許可（table 派の読みやすさ担保）。

**手順 3 — `role-qa` L162-166** の型/lint/テストを schema と同一の `verification_status` enum に統一。QA 判定 L148 と Blocker L159-160 を先頭 JSON の `qa_verdict`/`blockers` へ格上げ。L97/L109 の「role-engineer 出力サマリ」を「role-engineer の要約 JSON エンベロープ(target_files/verification_status)」に書き換え、親が engineer のエンベロープを QA 起動プロンプトへそのまま横流しできる連結にする。QA は修正しないので engineer 値を再生成せず参照する旨を明記。

**手順 4 — `ultracode-mode` L30** を「各 engineer は schema の要約 JSON を返す。unit_id は親が Agent 起動プロンプトで指定（サブは自称しない）」に具体化。unit_id は role-pm 分割表に `unit_id` 列を持たせて機械的に引き回す。マージ検査は「親が全 unit の `target_files[].path` 集合を突き合わせ、重複なら L48-49 の競合ルールで逐次化」と書くが、**これは親 LLM の照合であって自動検査ではない点を明示**（過大表現を避ける）。

**手順 5 — `pipeline-gate.mjs`** の ultra 注入・重ティア注入に、それぞれ「サブ→親返却は docs/report-envelope-schema.md の要約 JSON を先頭に置く」の 1 行ポインタのみ追加。スキーマ本体はファイル参照に逃がし、毎ターン UserPromptSubmit の context 消費を最小化。

### 5.6 deterministic-sandwich（Element ④: 決定論ツールのサンドイッチ）

**埋める gap:** 実測で `settings.json` の Stop 配列は `[adversarial-review-gate check, sui-memory save]` のみで、型/lint を自動で回すフックは 1 本も無く、自動発火は fail-open の post-edit-prettier だけ。この「下パン（決定論検知の自動発火）」を薄く確実に入れる。

対象ファイル: 新規 `hooks/deterministic-gate.mjs` / `settings.json`（Stop 配列） / 新規 `agents/role-fixer.md` / `skills/session-verifier/SKILL.md` / `skills/lead-pipeline/SKILL.md` ＋ `hooks/pipeline-gate.mjs`（doctrine 追記）

**手順 1 — `deterministic-gate.mjs` 新設。** protect-files / post-edit-prettier の execSync+exit2 雛形と adversarial-review-gate の state 実装（ローカル `~/.claude/.cache/deterministic-gate/<session>.json`・原子的 rename・2 日 cleanup）を流用。`argv[2]='check'`、stdin から session_id/cwd。`git diff --name-only` ＋ `--cached` で `.ts/.tsx/.js/.jsx` に絞り 0 件なら exit0。package.json scripts から typecheck（無ければ `npx tsc --noEmit`）→lint を execSync(timeout 60s)。ツール不在/クラッシュは **prettier と同じく fail-open で exit0**、実エラー検出時のみ不合格。診断あり かつ attempts<2 → attempts++ 保存し stderr に `file:line:message` の生ログ＋「まず型/lint を role-fixer（軽量モデル推奨）で機械修正し、そのあと adversarial review へ進むこと」と**順序を文面で明記**して exit2。attempts>=2 → BLOCKING を記録し exit0 で素通り（無限ブロック回避、残差は上パンに委ねる）。

**手順 2 — `settings.json` の Stop 配列先頭に deterministic-gate check を挿入。** ただし「配列順＝実行順で下パン→上パンを物理保証」には**依存しない**。両フックは exit2 で独立にブロックし得るので、順序保証はサンドイッチ手順を書いた stderr 文面（手順 1）で担保する。配列順は best-effort。timeout は 60〜70s。

**手順 3 — `role-fixer.md` 新設。** frontmatter: `model` は claude-api スキルで確認した安価 fast tier（role-engineer の `model:` と同じ frontmatter 機構）、`effort: low`、`tools: [Read, Edit, Bash]`。本文は self-contained ブリーフ（診断リスト＋変更ファイル絶対パス＋再検証コマンド）受領→診断が指す箇所だけ機械修正（未使用 import 削除・型注釈・自明な不一致）→受領コマンドで再検証→最大 2 ループ→潰れない/設計判断要はメインへエスカレーション。禁止: 診断セット外の編集・リファクタ・`as any` 握り潰し。**「軽量モデル委譲は推奨であり強制ではない（hook は起動を物理強制できない。メイン判断で inline 修正もあり得る）」を明記。**

**手順 4 — `session-verifier/SKILL.md`:** 検証手順は変えない。二重実行を実効で防ぐため、Gate1/2 を「Stop の deterministic-gate が既に型/lint を潰した前提で、スキル単独起動（軽ティア/hook 未発火）時のみ実行。hook 発火経路では再実行せず結果を引き継ぐ」へ**明確に降格**。Gate3+ と構造レビューがスキルの主務。修正の実行者を role-fixer（軽量）へ寄せる但し書きを追加。

**手順 5 — lead-pipeline / pipeline-gate:** 中ティア行を「実装 →（Stop で deterministic-gate が型/lint 自動検知、不合格は role-fixer が機械修正）→ session-verifier（残差＋Gate3+）→ task-tracker」へ。重ティア図の step4/5 間に role-fixer を挿入。注入テキスト増は 1 行に抑え詳細はスキル本文へ逃がす。

### 5.7 prompt-caching

**前提の正確化:** dotfiles 側が動かせる唯一のレバーは「常駐プレフィックス（frontmatter `paths:` 無しの rule 8 本 ≈200 行）を痩せさせる／安定に保つ規律」だけ。手動 `cache_control`・並べ替え・断点指定は harness 非露出で再配線不能。「エージェント間で完全一致させ 90% 削減」は harness 所有でユーザー設定不可＝到達不能。

対象ファイル: 新規 `rules/rule-authoring.md`（`paths: ["**/rules/**"]`＝rules 編集時のみロード・常駐ゼロ）/ `CLAUDE.md`（1 行アンカー）/ `rules/bash-tool-stability.md`→`docs/known-issues/001-sse-streaming-hang.md` へ退避しスタブ化 / `rules/tone.md`（重複チェックリスト削除のみ）/ 新規 `docs/prompt-caching.md`

**手順 1 — 常駐予算の明文化。** `rule-authoring.md` を作り、(a) frontmatter 無し rule＝毎セッション＋各サブエージェントで課金される常駐（乗数で効く）ことを明記、(b) 常駐 rules 合計の soft cap を **≤150 行**に設定、(c) tone.md を「最優先の口調アンカーゆえ最大の常駐メンバーとして許容する明示的例外」と記載、(d) 新規 rule は既定で `paths:` スコープ化し常駐追加は意図的に行う、を規定。`CLAUDE.md` の「運用原則」（CLAUDE.md ≤400 行の直後）に 1 行「常駐 rules（frontmatter なし）合計 ≤150 行を目標。situational な rule は `paths:` でスコープ化する」を追記して SSOT にアンカー。cap は soft（hook 強制にしない＝実行コストを避ける）。

**手順 2 — bash-tool-stability の退避。** ハング対処は「発生時のみ」必要だがファイル glob で発火できず `paths:` スコープ化不可。根本原因・系統判定・対処フロー・Issue 番号の詳細を `docs/known-issues/001-sse-streaming-hang.md`（ディレクトリ新設）へ移し、常駐側は ≤6 行スタブ（「ハングは本体側 SSE バグ。ESC 復帰 → 系統判定と対処は docs/known-issues/001 参照」）に置換。docs/ は auto-inject されないので約 30 常駐行を削減。挙動非依存で低リスク。

**手順 3 — tone.md の重複削除のみ。** 「応答前の自己確認」チェックリストは output-style `tone-persona.md` に既に存在する（真の重複）ため、tone.md 側の当該ブロック（約 11 行）を削除し tone-persona を正本とする参照に一本化。**良い例/悪い例ブロックは常駐 tone.md に残す**（output-style へ移しても双方キャッシュ済みプレフィックスで net 削減ゼロ、非常駐 docs へ出すと on-demand 化で口調が常時効かなくなる回帰リスク）。削除後に**口調回帰チェック**（過剰敬語・お世辞・比喩なし・助詞省略のサンプル検査）を通してからマージ。

**手順 4 — 知見メモ。** `docs/prompt-caching.md`（docs＝非 auto-inject・常駐ゼロ）に 2026-07 時点の観測を記載: (1) キャッシュは harness 自動管理・settings.json に `cache_control` 露出なし、(2) プレフィックス順序 system→tools→memory(CLAUDE.md+常駐 rules)→output-style は harness 固定、(3) pipeline-gate/UserPromptSubmit は現ターン末尾に注入するのでプレフィックスキャッシュを壊さない、(4) 効く唯一のレバーは常駐 rules の `paths:` スコープ化・退避による痩身であり並べ替えでも手動断点でもない、(5) mid-session の dotfiles 編集は SessionStart スナップショットのため現行セッションのキャッシュを壊さない、(6)「手動 cache_control / 並べ替えを試みるな（露出なし）」「90% 削減はサブエージェント間では到達不能」を明記して調査時間の溶解を防ぐ。

## 6. Phase 2: 新規インフラ（骨子まで・大半は保留/不採用）

敵対的レビューの結果、当初 Phase 2 の新規 MCP はほぼ全て drop または note 止まりになった。共通の理由は 3 つ——**(a) Stop フックは MCP クライアントを持たない短命 node プロセスで MCP を叩けない、(b) life-editor MCP は対話認証依存で headless/サブエージェントで落ちうる（現環境未ロード）、(c) 一人運用 dotfiles に対する新規サーバ常駐・鮮度管理・Windows ネイティブビルドが ROI 負**。

| 次元                   | 当初 Phase 2 案                                                          | 判定                  | 縮退後に残すもの                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| model-routing          | routing-ledger.mjs（Stop→life-editor MCP 台帳）＋ AST 複雑度スコアラ MCP | **drop**              | 任意: `hooks/routing-ledger.mjs` が**ローカル JSONL**（`~/.claude/routing-log/*.jsonl`）へ「どのフェーズを何ティアで回したか / QA 一発通過か / メイン引き取りに上げたか / verifier 失敗回数」を 1 レコード追記（MCP 非依存・fail-open）。life-editor への集約は**モデルが会話ターン内で** life-editor-mcp スキル経由で summary を書く（フックにやらせない）。台帳は「ルーティング判断の実績」限定で task-tracker の領分を侵さない                   |
| lazy-loading           | path:line マップの life-editor MCP 外部化 ＋ AST/symbol MCP              | **反転/out of scope** | マップの外部化は**ファイル主**: `.claude/comm/explore/<slug>.map.md`（comm-protocol テンプレ準拠）を主ストアにし、下流には path 参照だけ返す。下流（role-pm/role-engineer）は必要 unit のスライスだけ読む契約。life-editor MCP は**接続時のみの任意ミラー**に降格。AST/symbol MCP（tree-sitter/ctags/LSP）は当リポが大半 .md＋少数 .mjs で Grep で足りるため out of scope（polyglot な life-editor 本体を回す局面が来たら再検討する将来オプション） |
| external-state         | store_artifact/fetch_artifact 専用 MCP                                   | **note のみ**         | filesystem 経路（§5.4）で Element ③ は完全成立。`rules/artifact-referencing.md` のバックエンド節に「将来 filesystem が摩擦を出したら決定論 MCP 化を検討」の 1 段落 note を足すだけ。サーバ立ち上げ・登録・fallback 配線は着手しない                                                                                                                                                                                                                 |
| structured-reporting   | エンベロープ MCP 外部化 ＋ changes_evidence の AST 差分 MCP              | **YAGNI/drop**        | schema に `report_ref` を「常に null 許容（Phase 1 は常に inline）」として定義だけしておく。実装は N 並列でエンベロープが親 ctx を溢れさせる実測が出てから。裏取りが要るなら非 MCP で `git diff --stat` を summary の隣に貼る程度で十分                                                                                                                                                                                                             |
| deterministic-sandwich | MCP サーバ 3 本（deterministic-tools / state-store / symbol-extractor）  | **原則 drop**         | `role-fixer` が Bash で `tsc --pretty false` / `eslint --format json` を**直接実行**して構造化診断（file:line:col:code）を得る手順を本文追記（新規サーバなし・軽量モデルの誤修正低減）。JSON 出力差異は role-fixer 側で寛容にパースし、失敗時は生ログにフォールバック                                                                                                                                                                               |
| prompt-caching         | 成果物を life-editor MCP へ外部化・共有ストア化                          | **不採用**            | comm-protocol outbox に `artifact refs` 欄を追記し、サイズ超の中間成果物は**ローカル scratch/artifact パス**に書いて path だけ渡す（サブエージェントと同一 FS・認証ゼロ・ネットワークゼロ）。`docs/prompt-caching.md` に「非キャッシュ末尾を痩せさせて割引済プレフィックス読取を支配的にする」理由を相互参照                                                                                                                                        |

**Phase 2 の共通結論:** どうしてもデータで裏を取りたい局面（ティア値のチューニング、エンベロープの ctx 溢れ実測）が来たときに初めて着手する。当面はメインの目視判断（触るファイル数・層横断の有無・一発通過率）で足りる。

## 7. life-editor への適用

life-editor は本計画で**両建て**に使う。

**(a) ハーネスを回す対象プロジェクトとして。** life-editor 本体（polyglot・実コードあり）に対して lead-pipeline / ultracode を回すことで、本計画の再配線が実対象で機能するかを検証する。ここが「AST/symbol MCP の再検討トリガ」でもある——.md 中心の dotfiles では Grep で足りるが、多言語の life-editor を回す局面が来たら Phase 2 の symbol 抽出を再評価する。

**(b) 状態外部化・成果物ストアのバックエンドとして。** life-editor MCP のツール（create_note / write_file / read_file / search_all / upsert_memo / create_task）を、report の「状態の外部化」「成果物の参照化」の代替バックエンドに転用できる。ただし**現環境では未ロード・対話認証依存**なので、**必ず filesystem を主にして MCP は任意ミラーに降格**し、未接続時は自動 degrade させる。

| report 概念                  | 主バックエンド（既定）                                  | life-editor MCP（生きていれば任意ミラー）                                             | 担保・注意                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 状態の外部化（① タスク状態） | task-tracker（per-chat memory/ + history/）             | 使わない                                                                              | **memory-boundary 遵守**。タスク状態 SSOT は task-tracker。life-editor create_task は life-editor プロジェクト自身のタスク用であって harness のタスク追跡には使わない |
| 成果物の参照化（③ artifact） | `.claude/artifacts/chat-<self>/…`（filesystem）         | `write_file`（degrade 時 filesystem へ）                                              | §5.4 の degrade 分岐 1 行 note。パイプライン途中の取り出しを MCP に依存させない                                                                                       |
| 探索マップ（path:line）      | `.claude/comm/explore/<slug>.map.md`（filesystem）      | `write_file` ミラー（任意）                                                           | 使い捨て中間成果物なので記憶ストアに書かない（memory-boundary）                                                                                                       |
| ルーティング実績台帳         | `~/.claude/routing-log/*.jsonl`（フックがローカル追記） | `upsert_memo` / `create_note`（**モデルが会話ターン内で**書く。フックからは呼べない） | フック→MCP は原理的に不可能。集約はモデル協調で                                                                                                                       |
| 人間向け永続ノート・設計メモ | —                                                       | `create_note` / `upsert_memo`（life-editor-mcp スキル経由）                           | 任意用途。task-tracker（状態）・sui-memory（横断要約）の領分には踏み込ませない                                                                                        |
| セッション横断要約（① 記憶） | sui-memory（recall/save）                               | 使わない                                                                              | memory-boundary。sui-memory の Windows no-op 解消は記憶次元の別課題として切り離す                                                                                     |

## 8. インジェクト用システムプロンプト・ディレクティブ（最終版）

report Section 3 をこのエコシステム向けに書き直した最終版。pipeline-gate の ULTRA 分岐注入・CLAUDE.md ポインタとして使う。**値は複製せず SSOT を指す**（矛盾防止）。

```
## サブエージェント采配ドクトリン（正本参照・値は複製しない）

1. モデルティアは agent-management.md のマトリクスに従う。
   メイン(オーケストレーター)は fable-5[1m] 固定＝常に最上位で下げ不可。
   ティアを下げられるのは Agent ツールで起動する
   role-explorer / role-engineer / role-qa / role-fixer のみ。
   → よって "Plan だけ最上位" は完全達成不可。メイン分は常に最上位。

2. 探索は locate-only。role-explorer(軽量・Read-only)が
   path:line マップだけを返す。全文 Read は実装フェーズに限る。

3. 生成物(コード全文・大ログ・探索ダンプ)は本文に貼らず
   .claude/artifacts/chat-<self>/ に保存し、要約＋絶対パスだけ返す
   (rules/artifact-referencing.md)。要約は「開かずに次段判断できる粒度」。

4. サブ→親返却は docs/report-envelope-schema.md の要約 JSON を
   先頭に 1 つ置き、補足散文はその後ろ。enum は canonical 値。
   ※親は JSON を「読む」だけ。jq 等の機械集約は挟まらない。

5. 実装完了時、Stop の deterministic-gate が型/lint を自動検知する。
   不合格は role-fixer で機械修正(軽量推奨・強制ではない)、
   その後 adversarial review へ。潰れない残差は role-qa/adversarial で拾う。

6. 中位 Execute が session-verifier/role-qa で落ちた unit は、
   frontmatter を上書きできないためメインが直接引き取る(メイン＝最上位)。
   将来 opus 版が要るなら role-engineer-heavy を別エージェントで用意する。
```

**既存との整合:** pipeline-gate は現ターン末尾に注入するのでプレフィックスキャッシュを壊さない。上記は 6 行のポインタ集で、マトリクス本体・スキーマ本体・物理規定はそれぞれの SSOT ファイルに置き、ここでは複製しない（毎ターンの context 消費を最小化）。CLAUDE.md の Heavy Work Modes / Project Documentation Structure とも矛盾しない（tier 一元管理・memory-boundary を尊重）。

## 9. リスクと不採用の判断

**誇張への補正（計画書に数値目標として書かない）:**

- **「キャッシュ 90% 削減」「エージェント間完全一致」** → サブエージェント間プレフィックス一致は harness 所有でユーザー設定不可＝到達不能。dotfiles が動かせるのは常駐痩身のみ。定性で主張する。
- **「親が報告を機械集約・検証」** → 実際は親 LLM が返却テキスト中の JSON を読むだけ。効能は「キー名衝突ゼロ・パース安定」。ultracode の unit_id 突き合わせも親 LLM の目視であって自動検査ではない。
- **「Plan だけ最上位」** → メインが常に最上位固定なので完全達成不可。削れるのはサブ 3〜4 種のみ。マトリクスにこの非対称を明記。
- **トークン節約 N%** → 数値目標にしない。

**emission はフック強制できない（本質的限界）:** 生成物の会話貼付を止める真の担保は無く、external-state の handoff 契約はモデル協調（Fable-5 の指示追従）に依存する。過信せず「原則＋handoff 契約＋要約粒度の必須化」で運用し、破れても次段が Read で回収できる設計にしておく。

**MCP 認証の耐障害性:** life-editor MCP は対話認証依存で headless/サブエージェントから落ちうる（現環境未ロード）。Stop フックは MCP クライアントを持たない短命プロセスで MCP を叩けない。よって**パイプライン途中の取り出しを MCP に依存させない**。filesystem を主、MCP は接続時の任意ミラーに降格。ローカル cache＋原子的 rename は adversarial-review-gate で実証済みで十分。

**品質回帰（最もセンシティブ）:** role-engineer/role-qa を sonnet へ落とすと複雑実装・監査で品質回帰の可能性。担保は「メイン引き取り」エスカレーション＋security-reviewer 最上位据え置き。QA 軽量化は特に注意し、当面はローカル JSONL の一発通過率を目視監視、悪化したら qa を opus へ戻す。

**haiku 未解決:** haiku エイリアスが fable-5 ハーネスで解決する保証が無い。role-explorer / role-qa の軽量ティアは**当面 sonnet を既定**にし、haiku は可用性を実測後に段階移行。

**主な drop/revise 一覧:**

| 次元                 | 項目                                             | 判定              | 理由                                                                                   |
| -------------------- | ------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------- |
| model-routing        | routing-ledger.mjs（Stop→MCP）＋AST スコアラ MCP | drop              | フックから MCP 不可・過重・第三の記憶系は memory-boundary 衝突                         |
| model-routing        | エスカレーション「opus 再起動」                  | revise            | frontmatter 固定で per-call 差し替え不可 → メイン引き取りへ                            |
| lazy-loading         | explore-read-guard.mjs hook                      | 降格（任意/実験） | 4 重重複・正当な全文 Read に誤発火・毎 Read の Node 起動コスト                         |
| lazy-loading         | path:line マップの MCP 外部化                    | 反転              | ファイル主・MCP は任意ミラー（耐障害性・memory-boundary）                              |
| lazy-loading         | session-start.md 既存行の上書き                  | revise            | 「読む軸」の安全規律を潰す → 別軸 1 行追加に留める                                     |
| lazy-loading         | AST/symbol MCP                                   | out of scope      | .md 中心で Grep 十分・Windows ネイティブビルド高摩擦                                   |
| external-state       | artifact-guard.mjs（Read 監視）                  | drop              | emission を観測できず・意図的な遅延 Read にまで誤助言                                  |
| external-state       | store/fetch 専用 MCP                             | note のみ         | filesystem 単独で Element ③ 成立                                                       |
| external-state       | sui-memory Windows 修正                          | 差し戻し          | Element ① の領分・スコープ膨張                                                         |
| structured-reporting | エンベロープ MCP 外部化                          | YAGNI             | inline JSON が常時 fallback なら外部化は常には不要                                     |
| structured-reporting | changes_evidence の AST 差分 MCP                 | drop              | 新規 MCP が ROI 負・role-qa の検証と重複                                               |
| structured-reporting | comm-protocol への envelope 橋渡し               | 任意後回し        | 別チャネル・2 チャネル混同リスク                                                       |
| deterministic        | MCP サーバ 3 本                                  | 原則 drop         | フックから MCP 不可・symbol-extractor は role-fixer の Read+tsc で足りる               |
| deterministic        | Stop 配列順で下パン→上パン物理保証               | revise            | 順序保証に依存せず stderr 文面で手順を明記（配列順は best-effort）                     |
| prompt-caching       | 良い例/悪い例を output-style へ移動              | 縮小              | 同じキャッシュ済みプレフィックス内移動で削減ゼロ → チェックリスト重複削除(~11行)のみ   |
| prompt-caching       | soft cap ≤120 行                                 | 緩和→≤150         | 安全な削減で ≈200→≈159 行。120 は tone.md を大きく削る必要があり口調回帰が割に合わない |
| prompt-caching       | 成果物の life-editor MCP 共有ストア              | 不採用            | ローカル FS で受け渡し（認証ゼロ）。life-editor は人間向け任意用途に限定               |
| prompt-caching       | 偵察/監査の軽量モデル化                          | 除外              | model-routing 次元と重複（一元管理させ、ここは相互参照のみ）                           |

**維持コストの残リスク:** 正本を SSOT に寄せても、artifact-referencing.md / comm-protocol / task-tracker の三者、および schema/engineer/qa のキー定義は手動更新で整合を保つ必要が残る。参照リンク方式を徹底し、値のコピーを禁じてドリフトを最小化する。`docs/prompt-caching.md` は 2026-07 時点の harness 観測依存なので、仕様変更時は日付を見て追随更新する。

## 10. 実装順序チェックリストと完了条件

各項目に Phase 番号を付す。P1 が本計画の主眼、P2 は保留/任意。

**A. SSOT 整備（P1）**

- [ ] [P1] `agent-management.md` にフェーズ×ティア マトリクス＋ティア→model-id 解決表＋locate-only カーブアウトを追加。**完了条件:** 8 フェーズ全行が揃い、「メイン最上位固定・下げ不可」が明記されている
- [ ] [P1] `docs/report-envelope-schema.md` 新設（コア 3 キー＋verification enum＋qa_verdict/unit_id 必須）。**完了条件:** enum 値が canonical に固定され、鉄則 1 行と参照元一覧がある

**B. エージェント新設・引き下げ（P1）**

- [ ] [P1] `agents/role-explorer.md` 新設（sonnet/medium/Read-only/path:line マップ契約）。**完了条件:** 全文 Read 禁止・成果物マップ・self-contained brief の 3 契約が明記
- [ ] [P1] `role-engineer.md` を opus→sonnet、body にエスカレーション（メイン引き取り）追記
- [ ] [P1] `role-qa.md` を opus→sonnet・xhigh→high、高リスク diff の再 QA エスカレーション追記
- [ ] [P1] `agents/role-fixer.md` 新設（安価 fast tier/low/[Read,Edit,Bash]・診断セット外編集禁止・最大 2 ループ）。**完了条件:** 「軽量委譲は推奨・強制でない」が明記

**C. 決定論の下パン（P1）**

- [ ] [P1] `hooks/deterministic-gate.mjs` 新設（fail-open・timeout 60s・attempts 上限 2・stderr に順序手順を明記）
- [ ] [P1] `settings.json` の Stop 配列先頭に登録（配列順は best-effort）。**完了条件:** 変更ソースありで型/lint が自動発火し、0 件・ツール不在・attempts 超過で素通りする
- [ ] [P1] `session-verifier/SKILL.md` の Gate1/2 を「hook 未発火の単独起動時のみ」へ降格。**完了条件:** hook 発火経路で tsc/lint が二重実行されない

**D. 遅延読み込み・探索相分離（P1）**

- [ ] [P1] `efficient-codebase-nav/SKILL.md` に `## Explore Phase (locate-only)` 挿入＋全文 Read 記述に「実装フェーズ限定」条件付与＋出口リンク 1 行
- [ ] [P1] `tool-usage.md` に「Locate before reading」1 行追加
- [ ] [P1] `session-start.md` に locate-first 1 行**追加**（既存行は温存）

**E. 成果物パス参照化・報告構造化（P1）**

- [ ] [P1] `rules/artifact-referencing.md` 新設（物理規定のみ・paths スコープ・degrade 1 行 note）＋`templates/artifact-store/.gitignore` 最小雛形
- [ ] [P1] `role-engineer.md` / `role-pm.md` / `role-qa.md` の handoff に「要約＋パス」契約と JSON エンベロープ写像を追記。**完了条件:** 要約が「開かず次段判断できる粒度」を必須化している
- [ ] [P1] `ultracode-mode.md` の Phase 3/5 にパス参照返却と要約 JSON 先頭配置を追記

**F. 結線（P1・依存先が揃ってから最後）**

- [ ] [P1] `lead-pipeline/SKILL.md`：0.5 role-explorer 挿入・軽/中ティアの経路・エスカレーション梯子・モデルルーティング参照節
- [ ] [P1] `ultracode-mode.md L28/L30`：role-explorer 名指し・要約 JSON・unit_id は親指定
- [ ] [P1] `pipeline-gate.mjs`：ULTRA 分岐にルーティング/エンベロープのポインタ 1 行ずつ（IMPL 分岐には並列采配を足さない）。**完了条件:** role-explorer 実体が存在した後に参照が入っている（順序依存）

**G. キャッシュ痩身（P1・tone 編集はゲート必須）**

- [ ] [P1] `rules/rule-authoring.md` 新設（`paths: ["**/rules/**"]`・soft cap ≤150・tone.md 例外明記）
- [ ] [P1] `CLAUDE.md` の運用原則に常駐 ≤150 行アンカー 1 行
- [ ] [P1] `bash-tool-stability.md` を `docs/known-issues/001-sse-streaming-hang.md` へ退避し ≤6 行スタブ化
- [ ] [P1] `tone.md` の重複チェックリスト（~11 行）のみ削除。**完了条件:** 良い例/悪い例は温存、**口調回帰チェック（過剰敬語・お世辞・比喩なし・助詞省略のサンプル検査）を通過**してからマージ
- [ ] [P1] `docs/prompt-caching.md` 新設（2026-07 観測・到達不能項目の警告）

**H. Phase 2（保留/任意・実データで痛みが出るまで着手しない）**

- [ ] [P2] `hooks/routing-ledger.mjs`（ローカル JSONL のみ・MCP 非依存）＋`settings.json` Stop 追記 — ティア値のデータ裏取りが要るときだけ
- [ ] [P2] `.claude/comm/explore/<slug>.map.md` をマップ主ストア化（life-editor は任意ミラー）
- [ ] [P2] `artifact-referencing.md` のバックエンド節に決定論 MCP 化の「将来オプション」note 1 段落
- [ ] [P2] schema に `report_ref`（常に null 許容）定義のみ — 実装は ctx 溢れ実測後
- [ ] [P2] `role-fixer.md` に Bash 直叩き構造化診断（`tsc --pretty false` / `eslint --format json`）手順を追記
- [ ] [P2] `comm-protocol/README.md` outbox に `artifact refs` 欄追記

**全体の完了条件:** Phase 1 の A〜G が入った状態で life-editor に対し ultracode を 1 サイクル回し、(1) role-explorer が path:line マップだけを返す、(2) role-engineer/role-qa が sonnet で走る、(3) 実装完了時に deterministic-gate が型/lint を自動発火し不合格を role-fixer が拾う、(4) サブ→親返却が JSON エンベロープ先頭で返る、(5) 生成物がパス参照で渡る、(6) 常駐 rules 合計が ≤150 行、の 6 点を目視確認できること。品質回帰が観測されたら role-qa を opus へ戻し、JSONL の一発通過率で監視する。
