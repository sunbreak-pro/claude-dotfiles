---
paths:
  - "**/skills/**"
  - "**/agents/**"
  - "**/skill-lib/**"
  - "**/agents-lib/**"
---

# Skill / Agent Management

> path-scoped rule: スキル・エージェント定義を扱う時だけ自動ロードされる（毎セッション常駐させない）。

## 大原則: 実体はリポジトリの中に置く

スキルとエージェントの実体は、**それを使うリポジトリの中**に実ファイルとして置く。`.claude/skills/` と `.claude/agents/` から **リポジトリ外を指す symlink を作らない**。

理由は可搬性ひとつ。symlink は「本棚に本を置かず『あの棚の 3 段目にあります』というメモだけ置く」やり方で、棚が無いマシンではメモが迷子になる。しかも **Claude Code は読めない symlink を無視するだけでエラーを出さない**ので、指示が空振りしていることに気付けない（実例 = life-editor で 10 本が Windows から不可視のまま数か月放置。`docs/known-issues/031`）。

hooks のような「実体が無ければ repo 内の予備を呼ぶ」二段構えも**スキルには使えない**。Claude Code はスキルをディレクトリ一覧で発見するので、間に振り分けスクリプトを挟む余地が無い。

## 実体の置き場所（2 系統だけ）

| 種別                     | 実体                                                   | 配布経路                                                                          |
| ------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| グローバル（全案件共通） | 本リポジトリの `claude/skills/` / `claude/agents/`     | `node install.mjs` が `~/.claude/` へ配置（Windows は dir=junction・失敗時 copy） |
| プロジェクト固有         | 各プロジェクトの `.claude/skills/` / `.claude/agents/` | そのプロジェクトの git がそのまま運ぶ                                             |

- ファイル名は必ず **`SKILL.md`**（全大文字）。macOS / NTFS は大文字小文字を区別しないので `Skill.md` でも手元では動くが、case-sensitive な FS（Linux / CI コンテナ）では読めない
- 別マシンに配りたくなったら「symlink を張る」ではなく「commit して pull する」

## 新規作成手順

1. 使う場所に応じて上表のどちらかに実ディレクトリを作る
2. `SKILL.md`（skill）か `<name>.md`（agent）を書く
3. グローバル側に足したときは、各マシンで `git pull && node install.mjs`

## `skill-lib` / `agents-lib` は retired

`~/dev/Claude/skill-lib` と `~/dev/Claude/agents-lib` は旧・一元管理の置き場。**git リポジトリですらなく Mac にしか存在しない**ため、可搬性を持てない構造だった（2026-08-10 廃止 = life-editor `decisions/D-20260810-main-1`）。

- グローバル分は既に本リポジトリの `claude/skills/` / `claude/agents/` が正本（`skill-lib/global` は drift した残骸）
- life-editor 分は 2026-08-10 に repo 内へ vendor 化済み
- **未移行**: `battle-bakeoff`（agents 3）/ `original-card-battle`（agents 3 + skills 1）/ `terminal-division`（skills 8）。これらを移すまで `skill-lib` / `agents-lib` 本体は消さない

## Description 最適化

- 1 行要約 + Trigger 語彙（80〜150 tokens 目安）
- Trigger 語の過剰列挙は避ける（5〜10 語）
- 詳細手順は SKILL.md 本文（description は起動判断用）
