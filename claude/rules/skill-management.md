# Skill Management

## 一元管理ルール

スキル実体は全て `~/dev/Claude/skill-lib/` で一元管理。`~/.claude/skills/` やプロジェクトの `.claude/skills/` にはシンボリックリンクのみ配置。

## カテゴリ構造

```
~/dev/Claude/skill-lib/
├── global/    # 自作グローバル → ~/.claude/skills/ にリンク
├── projects/  # プロジェクト固有 → <project>/.claude/skills/ にリンク（life-editor / novel）
├── archive/   # 非活性 / 低頻度（リンクしない、legacy/ 含む）
├── vendor/    # サードパーティ配布物（リンクしない、anthropic / anthropic-proprietary）
└── SKILL_INDEX.md
```

## 新規スキル作成手順

1. 該当カテゴリ（global / projects/<project>）にスキル作成
2. リンク: `ln -s ~/dev/Claude/skill-lib/<category>/<name> <target>/.claude/skills/<name>`
3. `SKILL_INDEX.md` 更新

## Archive 運用

低頻度スキル（例: `project-setter` / `skill-creator`）は `archive/` でリンクしない。必要時:

- **一時再リンク**: `ln -s ~/dev/Claude/skill-lib/archive/<name> ~/.claude/skills/<name>` → 使用後削除
- **直接参照**: `Read ~/dev/Claude/skill-lib/archive/<name>/SKILL.md` で手順だけ取得
- **プロジェクト版生成**: `archive/skill-creator` を一時リンクして `projects/<project>/` に固有版を作成

## Description 最適化

- 1 行要約 + Trigger 語彙（80〜150 tokens 目安）
- Trigger 語の過剰列挙は避ける（5〜10 語）
- 詳細手順は SKILL.md 本文（description は起動判断用）
