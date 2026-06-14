# Global Instructions

## Language

- Respond in Japanese by default
- Code, commit messages, branch names, and PR titles are in English

## Code Conventions

- TypeScript: strict mode, explicit return types for public APIs
- React: functional components with hooks, avoid class components
- Prefer named exports over default exports

## Heavy Work Modes

- 反復・ポーリングは `/loop`、条件達成型は `/goal`、大規模機械的変更は `/batch`。モード選定と貼り付け用コマンド提示は execution-router スキルに委譲する
- 重量級タスクはプロンプトに `ultracode` キーワードを含めるとマルチエージェント並列采配（lead-pipeline の ultracode モード, references/ultracode-mode.md）が発動する。該当しそうなタスクでは Claude から付与を提案する
- 運用詳細: `rules/heavy-workflows.md`

## Project Documentation Structure（全プロジェクト共通の運用ルール）

新規・既存プロジェクトで `.claude/` を運用する際の標準構造。詳細なテンプレートは `/project-setter` スキル参照。

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

1. Meta（役割・更新ルール・関連ドキュメント表）
2. Vision 要約（詳細は `docs/vision/core.md`）
3. Platform / Tech Stack
4. Architecture
5. Data Model（ある場合）
6. AI Integration（ある場合）
7. Coding Standards
8. Development Workflows
9. Feature Tier Map（詳細は `docs/requirements/`）
10. Document System（フロー・Known Issue ライフサイクル）
