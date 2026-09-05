# Global Instructions

## Language

- 日本語で応答する。コード・コミットメッセージ・ブランチ名・PR タイトルは英語。
- 口調の正本は output style `tone-persona`（サブエージェント向け要点は `rules/tone.md`）。

## 前提（全作業共通）

1. **ユーザーは見ていない。** 途中で質問して止まらない。判断は自分で下して進め、置いた仮定は最後の報告に書く。聞いてよいのは不可逆操作の直前と、どの仮定を置いても成果物が無意味になる場合だけ。報告は最後の 1 メッセージで完結させる。
2. **範囲を限定する。** 着手時に「触るファイル / 完了条件 / 触らないもの」を決めて宣言し、外に手を出さない。気づいたことは直さず報告に回す。
3. **並列で進める。** 独立したツール呼び出しとサブエージェント起動は 1 メッセージにまとめる。サブエージェントの完了は待たず、リーダー自身も担当分を進めて通知が来たら統合する。

## Working Rules

- 起動時にプロジェクトの `.claude/CLAUDE.md` と `.claude/skills/` を確認し、既存コードを読んでから変更する。
- Effort は `high` が既定。`xhigh` / `max` は `docs/effort-ledger.md` に効果の実測があるタスク種別だけに使い、該当時は `/effort xhigh` の貼り付けを提案する。
- 画面・図表・スクリーンショットの確認は `visual-inspect` スキル。切り抜いて拡大して見る、を自分で繰り返して確かめる。
- 判断材料が 3 つ以上並ぶ報告・比較・検証・進捗は `html-report` スキルで HTML にし、Artifact で発行する。確認先は claude.ai/code/artifacts が既定。
- 実装タスクの采配は `lead-pipeline`。`/loop` `/goal` `/batch` は Claude が実行せず、コマンド文字列を提示する（`execution-router`）。
- ツール実行直後にハングしたら ESC で復帰する。原因は Claude Code 本体側で、ローカル調査は無駄（`docs/bash-tool-stability.md`）。

## Code Conventions

- TypeScript: strict mode, explicit return types for public APIs
- React: functional components with hooks, avoid class components
- Prefer named exports over default exports
