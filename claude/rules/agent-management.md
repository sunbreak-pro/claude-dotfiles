# Agent Management

## 一元管理ルール

エージェント実体は全て `~/dev/Claude/agents-lib/` で一元管理する。`~/.claude/agents/` やプロジェクトの `.claude/agents/` にはシンボリックリンクのみ配置する。

## カテゴリ構造

```
~/dev/Claude/agents-lib/
├── global/      # 自作グローバル → ~/.claude/agents/ にリンク
├── projects/    # プロジェクト固有 → <project>/.claude/agents/ にリンク
├── archive/     # 非活性 / 低頻度（リンクしない）
├── vendor/      # サードパーティ配布物（リンクしない）
└── AGENT_INDEX.md
```

## 設計方針

### オーケストレーター型を優先

新規エージェントは既存スキル（task-tracker / session-loader / session-verifier / code-review 等）と機能を重複させない。状況判断と振り分けに専念し、実作業は既存スキルに委譲する。

### effort/model 設定方針

- **記録系（記録のみ・探索不要）**: `model: sonnet` / `effort: medium` 以上
- **分析系（探索 + 提案）**: `model: opus` / `effort: high` 以上
- **オーケストレーター型（状況判断 + 振り分け）**: `model: opus` / `effort: xhigh`

トークン消費よりも精度を優先する設計。

### description は起動条件を具体的に書く

Claude は description を元に自動起動を判断する。曖昧な記述は誤起動・不起動の原因になる。

- ✅ トリガーとなるユーザー発話例を列挙する
- ✅ 起動すべきタイミングを箇条書きで明示する
- ✅ 非対象（このエージェントが担当しない領域）を明示する
- ❌ 「コードに関すること全般」のような曖昧な記述

## 新規エージェント作成手順

1. 該当カテゴリ（`global/` / `projects/<project>/`）にエージェント `.md` を作成
2. YAML frontmatter に `name` / `description` / `tools` / `model` / `effort` / `permissionMode` を記述
3. シンボリックリンク作成:
   ```bash
   ln -s ~/dev/Claude/agents-lib/global/<name>.md ~/.claude/agents/<name>.md
   ```
4. `~/dev/Claude/agents-lib/AGENT_INDEX.md` を更新

## Archive 運用

低頻度・非活性エージェントは `archive/` に移して `~/.claude/agents/` のリンクは削除する（Skill と同じ運用）。必要時:

- **一時再リンク**: `ln -s ~/dev/Claude/agents-lib/archive/<name>.md ~/.claude/agents/<name>.md` → 使用後削除
- **直接参照**: `Read ~/dev/Claude/agents-lib/archive/<name>.md` で内容のみ取得

## 削除前の確認義務

エージェントファイルを削除・移動する場合は、必ずユーザーに確認を取ってから実行する。
