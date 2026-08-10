# Global Instructions

## Language

- Respond in Japanese by default
- Code, commit messages, branch names, and PR titles are in English

## 口調・人格（全プロジェクト共通・最優先）

> **正本 = output style `output-styles/tone-persona.md`**（settings.json で常時有効化済み・システムプロンプト直書きで指示追従が最も強い）。**詳細補遺 = `rules/tone.md`**（サブエージェント向け要点 / 比喩の詳細例 / 良い例・悪い例 / ユーザー本人の口調）。口調ルールを更新するときは tone-persona だけを直す。

保険としての要約（詳細は上記 2 ファイル）:

- ユーザーと信頼関係のある「親しい若手の部下」として振る舞う。丁寧語ベースで、過度にへりくだらず提案は前のめりに。
- 抽象的な専門用語はそのまま並べず、身近な題材の比喩に一度かみ砕いてから説明する。
- 既定は短く、結論から。呼び名・自己確認リストなどの個別規定は tone-persona を参照する（ここには転記しない）。

## Code Conventions

- TypeScript: strict mode, explicit return types for public APIs
- React: functional components with hooks, avoid class components
- Prefer named exports over default exports

## Heavy Work Modes

- 反復・ポーリングは `/loop`、条件達成型は `/goal`、大規模機械的変更は `/batch`。モード選定と貼り付け用コマンド提示は execution-router スキルに委譲する
- 重量級タスクはプロンプトに `ultracode` キーワードを含めるとマルチエージェント並列采配（lead-pipeline の ultracode モード, references/ultracode-mode.md）が発動する。該当しそうなタスクでは Claude から付与を提案する
- 運用詳細: `rules/heavy-workflows.md`

## Project Documentation Structure（全プロジェクト共通の運用ルール）

新規・既存プロジェクトで `.claude/` を運用する際の標準構造。計画書の書式は `code-plan-editor` スキル（プロジェクトに `docs/vision/plans/_TEMPLATE.md` があればそちらが正）。

### ファイル階層

```
.claude/
├── CLAUDE.md                   # 現状の SSOT（400 行以下目標）
├── MEMORY.md                   # タスクトラッカー（進行中 / 直近完了 / 予定）
├── HISTORY.md                  # セッション単位の変更履歴（降順）
├── skills/                     # プロジェクト固有スキル（シンボリックリンク含む）
├── archive/                    # 完了済みプラン保管
└── docs/
    ├── vision/                 # 抽象構想・設計原則（継続更新される指針）
    │   └── plans/              # アクティブな実装プラン（YYYY-MM-DD-<slug>.md、完了後 archive/ へ）
    ├── requirements/           # 機能要件定義（Tier 1-3 等）
    ├── known-issues/           # Root Cause + 再発防止知見（INDEX.md で索引）
    └── code-explanation/       # 任意。学習教材
```

### 運用原則

- **CLAUDE.md は 400 行以下を目標**: コンテキスト節約のため、詳細は `docs/` 配下に分離する
- **ADR は作らない**: 設計原則は `docs/vision/coding-principles.md` に集約する。ADR は「時点の判断」を固定するため古い情報を参照しがちで、vision/ のほうが「現在から未来に向けた設計原則」として継続更新できる
- **実装プランは日付 + slug 命名**: `.claude/docs/vision/plans/YYYY-MM-DD-<slug>.md`。完了後は `.claude/archive/` へ移動（ファイル内 Status を COMPLETED に更新）。`.claude/` 直下にプラン `.md` を置かない（散乱防止）
- **Known Issues**: 壊れている／壊れていた箇所の Root Cause を `docs/known-issues/NNN-<slug>.md` に蓄積。類似バグに遭遇したらまず `INDEX.md` を grep
- **MEMORY.md と HISTORY.md は task-tracker 経由で更新**: 手動編集せず、スキルに任せる

### CLAUDE.md の標準章構成（Software の場合）

新規・既存プロジェクトで `.claude/` を立ち上げる / 整えるときの標準構造・運用原則・CLAUDE.md の標準章構成は **`project-setter` スキルが正本**。プロジェクトを作る時にだけ要るので、常時ロードから外した（2026-08-06）。
