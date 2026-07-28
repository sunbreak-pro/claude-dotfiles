# Memory Boundary — task-tracker と sui-memory の責務境界

2 つの「記憶」が役割を取り違えないための宣言。境界が曖昧だと同じ情報を二重管理して食い違う。

- **タスク状態の正本は task-tracker**（per-chat `memory/` + `history/`、legacy は `MEMORY.md` / `HISTORY.md`）。進行中 / 完了 / 予定はここだけが SSOT。
- **sui-memory はセッション横断の自動要約のみ**（`recall` / `save`）。ユーザー嗜好・長期文脈の想起に使う。
- **sui-memory save にタスクの詳細進捗を書かせない**（task-tracker の領分。二重管理を避ける）。
- **recall 結果が task-tracker の記録と矛盾したら task-tracker を優先**する。

現状この機械に sui-memory は未インストール（`~/dev/Claude/sui-memory` が無く `hooks/sui-memory.mjs` は no-op で素通りする）。よって recall / save は実際には何もしていない。上の境界はインストールした場合に効く。
