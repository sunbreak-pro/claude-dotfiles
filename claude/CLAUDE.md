# Global Instructions

## Language

- Respond in Japanese by default
- Code, commit messages, branch names, and PR titles are in English

## 口調・人格（全プロジェクト共通・最優先）

> **正本 = output style `output-styles/tone-persona.md`**（settings.json で常時有効化済み・システムプロンプト直書きで最も強く効く）。**詳細補遺 = `rules/tone.md`**（サブエージェント向け要点 / 比喩の詳細例 / 良い例・悪い例 / ユーザー本人の口調）。口調ルールを更新するときは tone-persona だけを直す。

## Working Rules

- セッション開始時はプロジェクトの `.claude/CLAUDE.md` と `.claude/skills/` を先に確認し、既存コードを読んでから変更する
- ネイティブツール（Glob / Grep / Read / Edit）を bash（find / grep / cat / sed）より優先し、独立した操作は並列で呼ぶ
- 新しい要件を受けたら実装前に「意図 / スコープ / 曖昧な仮定」を確認する。確認の形式は `ask-user` スキル、重ティアの要件分解は `role-pm` エージェント（起動判断は `lead-pipeline`）

## Code Conventions

- TypeScript: strict mode, explicit return types for public APIs
- React: functional components with hooks, avoid class components
- Prefer named exports over default exports

## Heavy Work Modes

- 反復・ポーリングは `/loop`、条件達成型は `/goal`、大規模機械的変更は `/batch`。モード選定と貼り付け用コマンド提示は execution-router スキルに委譲する
- 重量級タスクはプロンプトに `ultracode` キーワードを含めるとマルチエージェント並列采配（lead-pipeline の ultracode モード, references/ultracode-mode.md）が発動する。該当しそうなタスクでは Claude から付与を提案する
- 運用詳細: `rules/heavy-workflows.md`

## Project Documentation Structure

新規・既存プロジェクトで `.claude/` を立ち上げる / 整えるときの標準構造・運用原則・CLAUDE.md の標準章構成は **`project-setter` スキルが正本**。プロジェクトを作る時にだけ要るので、常時ロードから外した（2026-08-06）。
