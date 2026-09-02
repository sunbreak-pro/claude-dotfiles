# skill-lib / agents-lib の退役メモ（2026-08-10 実測・削除ゲート）

`~/dev/Claude/skill-lib` と `~/dev/Claude/agents-lib` は旧・一元管理の置き場（Mac 専用・git 管理外）。2026-08-10 に廃止判断（life-editor `decisions/D-20260810-main-2`）。グローバル分は本リポジトリの `claude/skills/` / `claude/agents/` が正本。

本体を消す前に、まだ symlink で参照している先を数え直すこと。

| 参照元                 | 内訳                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `novel`                | skills 6 → `skill-lib/projects/novel` ／ agents 8 → `agents-lib/projects/novel`（最大の未移行先）    |
| `terminal-division`    | skills 8 → `skill-lib/global` ／ 1 → `projects/_shared/feature-files`                                |
| `original-card-battle` | agents 3 → `agents-lib/projects/original-card-battle` ／ skills 1 → `projects/_shared/feature-files` |
| `battle-bakeoff`       | agents 3 → 上と同一ファイルを指す                                                                    |

- `terminal-division` の 8 本は本来グローバル資産。`~/.claude/skills`（= 本リポジトリ）から拾う形に直す
- `novel` には `~/dev/Claude/original-skills-storage/` を指す symlink も 3 本ある
- `skill-lib/archive/` に 13 本が眠っている（`project-setter` は本リポジトリへ移設済み）
