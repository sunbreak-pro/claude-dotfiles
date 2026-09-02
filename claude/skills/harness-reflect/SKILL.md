---
name: harness-reflect
description: ハーネス（agents / skills / rules / hooks）の使用実績と摩擦シグナルをトランスクリプトから実測し、dotfiles への改善提案を diff 形式で出す観測ループ。変更の適用はせず提案まで（人間ゲート必須）。Triggers include "harness-reflect", "棚卸し", "使用実績", "エージェント整理", "ハーネス見直し", "reflection", "振り返り".
---

# Harness Reflect — ハーネスの観測ループ

測って所見を出すところまでが仕事。変更の適用はユーザー承認後に git ブランチ上で別途行う（`settings.json` / `hooks/` は常に提案どまり）。対象は claude-dotfiles 配下のみ。

## Step 1 — 観測

トランスクリプトは `~/.claude/projects/<slug>/*.jsonl`。月ごとに分けて集計する（「先月まで使っていた」と「ずっとゼロ」を区別するため）。

```bash
# エージェント起動実績（月次）
cd ~/.claude/projects && grep -h '"subagent_type"' */*.jsonl 2>/dev/null |
  sed -E 's/.*"subagent_type" *: *"([^"]+)".*"timestamp" *: *"([0-9]{4}-[0-9]{2}).*/\1 \2/' |
  grep -E '^[a-zA-Z-]+ [0-9]{4}-[0-9]{2}$' | sort | uniq -c | sort -rn

# スキル起動実績（月次）
cd ~/.claude/projects && grep -h '"name":"Skill"' */*.jsonl 2>/dev/null |
  sed -E 's/.*"skill" *: *"([a-z0-9-]+)".*"timestamp" *: *"([0-9]{4}-[0-9]{2}).*/\1 \2/' |
  grep -E '^[a-z0-9-]+ [0-9]{4}-[0-9]{2}$' | sort | uniq -c | sort -rn

# 起動ゼロのスキル（実績に出てこないものを引く）
comm -23 <(ls <dotfiles>/claude/skills | sort) <(上のコマンド | awk '{print $2}' | sort -u)

# 障害・摩擦の痕跡
grep -hE 'ECONNRESET|terminated|"status":529|Overloaded' ~/.claude/projects/*/*.jsonl 2>/dev/null | wc -l
grep -hE 'hook.*(error|failed|non-zero)' ~/.claude/projects/*/*.jsonl 2>/dev/null | wc -l

# 常駐コスト（CLAUDE.md + paths 無し rules + output style + skill/agent description）。行数でなくバイト数で測る
cd <dotfiles>
wc -c claude/CLAUDE.md claude/output-styles/*.md
for f in claude/rules/*.md; do grep -q 'paths:' "$f" || wc -c "$f"; done
for f in claude/skills/*/SKILL.md claude/agents/*.md; do
  d=$(awk '/^description:/{flag=1} flag{print} /^---$/{if(NR>1 && flag) exit}' "$f" | sed '$d')
  echo "$(echo -n "$d" | wc -c)  $f"
done | sort -rn
```

痩身の前後で同じコマンドを回して差分を出す。退避したスキルは `claude/skills-archive/`（manifest 対象外）へ移す。

## Step 2 — 判定基準

| シグナル                                              | 提案                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| エージェント / スキルが 2 か月連続起動ゼロ            | 退避候補（他の rule / skill が正本として参照しているものは残す） |
| description が 150 tokens 超                          | 痩身候補（詳細を本文へ）                                         |
| 常駐 rule に手順（How）が書かれている                 | skill への移設候補（rules = 判断基準 / skills = 手順書）         |
| 同じ確認・同じ失敗が複数セッションで反復              | hook 化 or rule 改訂                                             |
| 組み込み機能（Explore / Plan / code-review 等）と重複 | 統合・削除候補                                                   |
| xhigh / max を使ったセッションで高い品質差が出ている  | `docs/effort-ledger.md` への記録候補                             |

## Step 3 — 出力

```markdown
## Harness Reflect レポート（YYYY-MM-DD）

### 観測サマリ

| 対象 | 実績（直近 2 か月・月次） | 常駐コスト | 所見 |

### 提案（適用はユーザー承認後）

1. <対象ファイル> — <削除 / 痩身 / 移設 / 改訂> — 根拠: <シグナル>（可能なら diff の要点）

### 前回からの変化
```

レポートは会話に返すだけでよい。実施した棚卸しは `docs/plans/` の該当計画に記録する。
