# HISTORY.md - 変更履歴

### 2026-07-12 - statusline 新 3 行デザイン

#### 概要

`claude/statusline-command.mjs` を全面書き換えし、1 行目に使用率バー（context / 5h / 7d rate limits）、2 行目に model 名 + reasoning effort、3 行目に cwd + git branch + worktree 名を表示する新レイアウトへ移行した。

#### 変更点

- **line 1**: `context_window.used_percentage` と `rate_limits.five_hour / seven_day` を 10 マス幅のバー + % 表示（50% 以上で黄、80% 以上で赤に段階着色）。値が null / 欠損ならグレーの空バーで退化
- **line 2**: `model.display_name` + `effort.level`（effort 対応モデルのみ表示）
- **line 3**: cwd（home は `~` 短縮）+ git branch（dirty で `*`）+ worktree 名（`worktree.name` → `workspace.git_worktree` の順で参照）
- **削除**: 旧デザインの user@host 表示・セッションコスト表示・per-chat memory の進行中タスク表示（`▶ task` 行）
- **安全設計の維持**: git 呼び出しは guard + timeout + `--no-optional-locks`、stdin JSON の parse 失敗や条件付きフィールド欠損でもクラッシュしない
