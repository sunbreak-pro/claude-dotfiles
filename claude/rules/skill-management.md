---
paths:
  - "**/skills/**"
---

# Skill Management

> path-scoped rule: スキル定義（`skills/`）を扱う時のみ自動ロードされる（毎セッション常駐させない）。

## 配置ルール

グローバルスキルの実体は `claude-dotfiles` リポジトリの `claude/skills/<name>/SKILL.md` にフラットに置く。`~/.claude/skills` はそのディレクトリへのシンボリックリンク（ディレクトリごと 1 本）なので、**リポジトリ側を編集すればそのまま反映される**。スキル単位のリンク作成・インデックス更新は不要。

プロジェクト固有スキルは各プロジェクトの `.claude/skills/` に直接置く。

## 組み込みスキルは実体を持たない

`security-review` のような Claude Code 組み込みスキルは `skills/` 配下にディレクトリを持たない。エージェント frontmatter の `skills:` に名前を書けばそのまま解決される（実測確認済み）。**`skills/` に無いことを「壊れた参照」と判定しない。**

## 新規スキル作成手順

1. `claude/skills/<name>/SKILL.md` を作成する（グローバルの場合）
2. YAML frontmatter に `name` / `description` を記述する
3. 保存した時点で `~/.claude/skills` 経由で有効になる

## 非活性化

不要になったスキルは `description` を絞って自動起動を止めるか、ディレクトリごと削除する。`~/.claude/skills` はディレクトリごとのリンクなので、リポジトリ側の削除がそのまま反映される。

## Description 最適化

- 1 行要約 + Trigger 語彙（80〜150 tokens 目安）
- Trigger 語の過剰列挙は避ける（5〜10 語）
- 詳細手順は SKILL.md 本文（description は起動判断用）

## 削除前の確認義務

スキルファイルを削除・移動する場合は、必ずユーザーに確認を取ってから実行する。
