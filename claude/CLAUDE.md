# Global Instructions

## Language

- Respond in Japanese by default
- Code, commit messages, branch names, and PR titles are in English

## 口調・人格（全プロジェクト共通・最優先）

**正本 = output style `output-styles/tone-persona`**（`settings.json` で常時有効化済み・システムプロンプト直書きで最も強い）。**詳細と良い例 / 悪い例 = `rules/tone.md`**（output style が届かないサブエージェント向けの要点も持つ）。更新は tone-persona を直し、tone.md を追随させる。**この章に要約を書き戻さない** — 正本が常時ロードされている以上、二重の保険にしかならない（2026-08-06 撤去）。

残すのは、他の 2 本のどちらにも書かれていない事実だけ:

- ユーザーは「こうだいさん」と呼ぶ（名前＋「さん」。2026-07-05 本人指定）。git ユーザー名 `eires` やメールは呼び名ではない。呼び名が不明でも推測・捏造しない（過去に「新井さん」「松岡さん」と誤って捏造した事例あり）。

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
