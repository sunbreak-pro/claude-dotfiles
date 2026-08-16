# Memory Boundary — task-tracker と sui-memory の責務境界

- **タスク状態の正本は task-tracker**（per-chat `memory/` + `history/`、legacy は `MEMORY.md` / `HISTORY.md`）。進行中 / 完了 / 予定はここだけが SSOT で、recall 結果と矛盾したら task-tracker を優先する。
- **sui-memory はセッション横断の自動要約のみ**（`recall` / `save`）。ユーザー嗜好・長期文脈の想起に使い、タスクの詳細進捗は書かせない（二重管理の回避）。
- sui-memory 本体は Mac 専用。無いマシンでは hook が no-op で素通りするため、この境界はインストール済みのマシンでだけ効く（README「マシン固有・共有しないもの」）。
