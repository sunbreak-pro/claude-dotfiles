# HISTORY.md - 変更履歴

### 2026-07-28 - Loop Engineering ハーネス設計（判断の非同期化ロードマップ）

#### 概要

life-editor の chat-main + 複数 worktree 運用を、段階的に自律型へ近づける 4 Phase ロードマップを設計し、life-editor 側に計画書 `C:\Users\user\orca\life-editor\.claude\docs\vision\plans\2026-07-28-loop-engineering-harness.md` を作成した（ユーザー指示によりファイル作成のみ・life-editor への git 操作なし）。現状実測（memory/INDEX・automation/・comm/）+ 公式ドキュメント + 実践者事例の 2 系統調査（claude-code-guide / deep-web-research）に基づく。

#### 変更点

- **現状診断**: 詰まりは (1) 判断の同期処理化（merge / 仕様判断 / 実機目視がユーザー手番に積滞 — 6 月分の実機目視が残存）(2) ユーザーの人間ルーター化（boot 行貼付・outbox 運搬・起票依頼の一括消化）(3) 疲労時の判断劣化（判断が選択肢化されず 20+ 件のリストで届く）。既存の自律ルーチン設計（automation/ 2026-05-26 の夜 22 時 + 朝 6 時構成）は Mac 時代の Cloud Routine 前提のまま未稼働（routine-ids.md PENDING）と実測で判明
- **4 Phase ロードマップ**: Phase 0 判断の非同期化（decisions/ キュー + POLICY 事前決裁 + dev-digest 采配ダイジェスト・朝刊統合）→ Phase 1 夜間安全レーン（docs・整理・検証準備のみ。ユーザー決定 2026-07-28）→ Phase 2 実装自走（draft PR 止まり）→ Phase 3 playwright 検証自動化。merge と不可逆操作は全 Phase で人間ゲートを恒久維持
- **Phase 0 実装仕様を計画書へ全文埋め込み**: decisions/README（単一書込者原則・エントリ/回答形式）・POLICY P-001〜P-007（実際の裁定事例 #429/#367/#428 から seed）・rules/decision-queue.md・skills/dev-digest/SKILL.md（要判断は最大 5 件の認知負荷キャップ）・.gitignore 追記の 5 点。life-editor 側チャットがコピー配置すれば完成する形
- **調査反映のガードレール**: 反復 cap の独立計測（公式 ralph-wiggum の cap 無視 494 回暴走事例 #18646）/ スコープ制約のプロンプト明記 / ログのファイル退避（context 枯渇でルール要約劣化）/ 30-60 分の独立セッション分割 / 承認キューは「信頼して監視が緩んだ頃」が最危険 → 不可逆は恒久同期ゲート / 無人時は AskUserQuestion 不可 → キューが唯一の質問経路 / scheduled tasks の 7 日 expire は台帳管理（routine-ids.md 流用）
- **朝刊統合の前提を明記**: life-editor MCP（Supabase 版）は疎通未検証のため、digest はファイル正本 + MCP 任意ミラーの degrade 設計。疎通確認は chat-main の既存予定タスク

### 2026-07-28 - Opus 5 向けハーネス調整 第 2 弾（レビューゲート絞り込み / rules 実態整合 / effort 見直し）

#### 概要

第 1 弾に続き、Opus 5 の自己検証を前提に「過干渉」側の設定を削った。最大の負荷源だった adversarial-review-gate（`.md` 1 行修正でも Stop でブロックし opus/xhigh のサブエージェント監査を要求していた）をコード変更に限定し、あわせて実態と食い違っていた rules の記述と、メインより高くなっていたサブエージェントの effort を直した。

#### 変更点

- **hooks/adversarial-review-gate.mjs**: `needsReview()` を新設し、記録対象をコード拡張子（`.ts` / `.mjs` / `.py` / `.rs` / `.sh` / `.sql` 等）・秘密情報を持つファイル（`.env*` / `*.pem` / `*.key` / `id_rsa` 等）・実行環境定義（`Dockerfile` / `docker-compose*.yml` / `.github/workflows/*.yml`）に限定。ファイル名ベースの `auth` / `token` 等の判定は意図的に置いていない（コードは拡張子で拾えるうえ、置くと `skills/session-verifier/SKILL.md` のような無関係な `.md` まで巻き込むため）。docs / 設定のみのセッションは記録ゼロとなり Stop で止まらない。record → check を実データで流し、docs のみの回が exit 0 で無言通過、コード込みの回のみ exit 2 になることを確認済み
- **rules/agent-management.md**: 「実体は `~/dev/Claude/agents-lib/` で一元管理し `~/.claude/agents/` にはシンボリックリンクのみ配置」という章を削除し、実態（リポジトリ `claude/agents/` にフラット直置き、`~/.claude/agents` はディレクトリごと 1 本のリンク）に書き換え。カテゴリ構造・`AGENT_INDEX.md`・Archive 運用など存在しない仕組みの記述を削除し、新規作成手順からリンク作成・インデックス更新の 2 ステップを除去。`paths:` からも `**/agents-lib/**` を削除。README:93 が既に「Mac 時代の symlink ファーム運用の名残で、以後の SSOT は本 repo」と記載していたのに rules 側だけ追随していなかったもの
- **rules/skill-management.md**: 上と同じ実態不一致を修正。あわせて「組み込みスキルは実体を持たない」節を新設し、`security-review` のような Claude Code 組み込みスキルが `skills/` にディレクトリを持たなくても frontmatter の `skills:` から解決されることを明記（実体が無いのを壊れた参照と誤判定しないため）。「削除前の確認義務」を agent-management と揃えて追加
- **rules/agent-management.md（effort/model 設定方針）**: 「子の effort はメインチャットを超えさせないのが基本。例外は見落としのコストが高い監査系のみ」を明文化。旧「オーケストレーター型は一律 xhigh」を廃止。第 1 弾で追加した Fable 5 非割り当ての記述を本節に集約
- **agents/role-pm.md・agents/multi-session-coordinator.md**: `effort: xhigh` → `high`。メイン（`settings.json` の `effortLevel: high`）との逆転を解消。role-qa と security-reviewer は監査系として `xhigh` を維持
- **agents/multi-session-coordinator.md（description）**: 共有資源の列挙にあった `agents-lib` / `skill-lib` を実在する `claude/agents`・`claude/skills` に修正
- **rules/tone.md**: 「vocab を過信しない」節が参照していた語彙ログ `~/dev/Claude/sui-memory` はこの機械に存在しないため、パス参照を外して「使われた用語＝理解済み、とみなさない」に改題。原則（会話に出た専門用語でも当然視せず噛み砕く）はそのまま維持
- **rules/memory-boundary.md**: sui-memory が未インストールで `hooks/sui-memory.mjs` が no-op のため recall / save が実際には何もしていない旨を注記。境界の定義自体はインストール時に効くものとして残置
- **README.md**: hooks 表の adversarial-review-gate record 行を、絞り込み後の対象（コード / 秘密情報 / 実行環境定義）に追随

### 2026-07-27 - Opus 5 向けハーネス調整 第 1 弾（出力長規定 / session-verifier 軽量化）

#### 概要

Opus 5 の公式ドキュメント（「自己検証は既定挙動なので旧世代から引き継いだ検証指示は過剰検証を招く。削除せよ」「effort を下げても応答長は縮まらないので長さはプロンプトで指定せよ」）に合わせ、出力の量を縛る規定を新設し、session-verifier からモデルが自律的に行う汎用チェックを削った。

#### 変更点

- **output-styles/tone-persona.md**: 「応答の量とかたち」節を新設。既定は短く / 見出し・表・箇条書きは項目 3 つ以上のときだけ / 作業報告は「何をしたか・結果どうなったか・次に判断が要る点」の 3 点に絞る / 差分は変更箇所のみ・長い出力は `file.ts:42` 形式で示す / 長い場合は結論を 3 行以内で先出し / ユーザーの長さ指定を最優先。自己確認リストに「聞かれていないことまで書いていないか」を追加
- **rules/tone.md**: 正本が tone-persona 側であることを示す参照に加え、要点 3 つ（既定は短く / 報告は 3 点 / 全文を貼らず `file.ts:42` で示す）を実体として記載。output style はメイン会話にしか届かずサブエージェントのコンテキストには入らないため、`rules/` 経由でないと最も報告が長くなる相手に規定が届かない
- **CLAUDE.md**: 口調章に「応答の量」節を追加。同章の冒頭が「tone-persona を正本として直し、この章と tone.md を追随させる」と定めているのに従ったもの。output style が外れた場面での保険も兼ねる
- **skills/session-verifier/SKILL.md**: Gate 5（Structural Review）と Gate 6（Bug Pattern Scan）を統合し、Gate 5「プロジェクト固有ルールの整合」1 本に集約。React / TypeScript / State 管理の汎用バグチェックリストと、汎用コード品質チェック（未使用 export・`console.log`・コメントアウト・TODO）を削除。残したのは CLAUDE.md と `coding-principles.md` に明文化されたプロジェクト固有規約、多点同期の確認、known-issues 照合のみ（いずれもモデルが事前に知りようがない情報）。178 → 147 行
- **skills/session-verifier/SKILL.md（ルール節・frontmatter）**: 「汎用バグ検出・一般的なコード品質チェックを手順として書き足さない」を明記して再追加を抑止。description も「structural review / bug pattern analysis」から「project-specific consistency checks」へ追随
- **agents/role-engineer.md**: セルフ検証フローの記述「構造レビュー / バグパターン分析」を「プロジェクト固有ルールの整合確認」へ更新
- **独立レビュー（role-qa 監査）の反映**: (a) 「読み手が次の判断に要らない情報は書かない」が比喩まで削りかねないため「短くするために比喩と結論の根拠は削らない」を明記、(b) スキル・エージェントが出力フォーマットを明示している場合はそちらを優先する旨を追加（session-verifier の Verdict や role-\* の引き継ぎ書式を潰さないため）、(c) 箇条書きは「3 つ以上でも地の文で流せるなら文章を優先」を追記、(d) Gate 2 に「`no-console` は `eslint:recommended` に含まれないため、lint 設定に無ければ 1 度だけ finding として報告し恒久対処として lint ルール追加を提案」を追加（Gate 6 削除で唯一純減となった検査の受け皿）、(e) Gate 5 見出しを図・Verdict 表と揃えて `Project Rules（プロジェクト固有ルールの整合）` に、Verdict の Coverage 行に `⏭️` を追加

### 2026-07-12 - statusline 新 3 行デザイン

#### 概要

`claude/statusline-command.mjs` を全面書き換えし、1 行目に使用率バー（context / 5h / 7d rate limits）、2 行目に model 名 + reasoning effort、3 行目に cwd + git branch + worktree 名を表示する新レイアウトへ移行した。

#### 変更点

- **line 1**: `context_window.used_percentage` と `rate_limits.five_hour / seven_day` を 10 マス幅のバー + % 表示（50% 以上で黄、80% 以上で赤に段階着色）。値が null / 欠損ならグレーの空バーで退化
- **line 2**: `model.display_name` + `effort.level`（effort 対応モデルのみ表示）
- **line 3**: cwd（home は `~` 短縮）+ git branch（dirty で `*`）+ worktree 名（`worktree.name` → `workspace.git_worktree` の順で参照）
- **削除**: 旧デザインの user@host 表示・セッションコスト表示・per-chat memory の進行中タスク表示（`▶ task` 行）
- **安全設計の維持**: git 呼び出しは guard + timeout + `--no-optional-locks`、stdin JSON の parse 失敗や条件付きフィールド欠損でもクラッシュしない
