---
name: harness-reflect
description: ハーネス（agents / skills / rules / hooks）の使用実績と摩擦シグナルをトランスクリプトから実測し、dotfiles への改善提案を diff 形式で出す観測ループ。変更の適用はせず提案まで（人間ゲート必須）。Triggers include "harness-reflect", "棚卸し", "使用実績", "エージェント整理", "ハーネス見直し", "reflection", "振り返り".
---

# Harness Reflect — ハーネスの観測ループ

`docs/meta-harness.md` 原則 3（自己観測 → 提案 → 人間ゲート → 反映）の実装。健康診断と同じで、**測って所見を出すところまで**が仕事。治療（変更の適用）はユーザーの承認を得てから別途行う。

## 安全則（最優先）

- **変更を適用しない。** 出力は「観測サマリ + 提案 diff」まで。適用はユーザー承認後に git ブランチ上で行う
- 削除・移動の提案を実行に移す前は必ず AskUserQuestion で確認する（agent-management.md / skill-management.md の削除前確認義務）
- `settings.json` / `hooks/` への変更は常に提案どまり（自動書換の対象にしない）
- 観測・提案の対象は claude-dotfiles 配下のみ。他プロジェクトの `.claude/` は対象外

## Step 1 — 観測（摩擦シグナルの収集）

トランスクリプトは `~/.claude/projects/<slug>/*.jsonl`。全プロジェクト横断で集計する。

### エージェント起動実績（月次）

```bash
cd ~/.claude/projects && grep -h '"subagent_type"' */*.jsonl 2>/dev/null |
  sed -E 's/.*"subagent_type" *: *"([^"]+)".*"timestamp" *: *"([0-9]{4}-[0-9]{2}).*/\1 \2/' |
  grep -E '^[a-zA-Z-]+ [0-9]{4}-[0-9]{2}$' | sort | uniq -c | sort -rn
```

### スキル起動実績（月次）

月ごとに分けないと「先月まで使っていて今月止まった」のか「ずっとゼロ」なのかが判別できない。判定基準（2 ヶ月連続ゼロ）は月次でしか測れないので、必ず月と組にする。

```bash
cd ~/.claude/projects && grep -h '"name":"Skill"' */*.jsonl 2>/dev/null |
  sed -E 's/.*"skill" *: *"([a-z0-9-]+)".*"timestamp" *: *"([0-9]{4}-[0-9]{2}).*/\1 \2/' |
  grep -E '^[a-z0-9-]+ [0-9]{4}-[0-9]{2}$' | sort | uniq -c | sort -rn
```

起動ゼロを見つけるには「実績に出てこないスキル」を引く（grep は無いものを数えられない）:

```bash
comm -23 <(ls <dotfiles>/claude/skills | sort) <(上のコマンド | awk '{print $2}' | sort -u)
```

### 障害・摩擦の痕跡

```bash
# SSE ハング系統（詳細は docs/bash-tool-stability.md）
grep -hE 'ECONNRESET|terminated|"status":529|Overloaded' ~/.claude/projects/*/*.jsonl 2>/dev/null | wc -l
# hook 失敗
grep -hE 'hook.*(error|failed|non-zero)' ~/.claude/projects/*/*.jsonl 2>/dev/null | wc -l
```

### 常駐コストの実測

「毎セッション必ず読まれるもの」= CLAUDE.md ＋ `paths:` 無し rules ＋ output style ＋ skill / agent の description。行数ではなく**バイト数**で測る（description は 1 行に長文が入るため、行数だと実態を映さない）。

```bash
cd <dotfiles>
# ファイル系（CLAUDE.md + 常駐 rules + output style）
wc -c claude/CLAUDE.md claude/output-styles/*.md
for f in claude/rules/*.md; do grep -q 'paths:' "$f" || wc -c "$f"; done
# description 系（skills / agents とも同じ抽出でバイト数を出す）
for f in claude/skills/*/SKILL.md claude/agents/*.md; do
  d=$(awk '/^description:/{flag=1} flag{print} /^---$/{if(NR>1 && flag) exit}' "$f" | sed '$d')
  echo "$(echo -n "$d" | wc -c)  $f"
done | sort -rn
```

痩身の前後で**同じコマンド**を回して差分を出す。測り方を変えると効果が測れない。退避したスキルは `claude/skills-archive/`（manifest 対象外）へ移す — `claude/skills/` に置いたままでは description が常駐し続けて削減にならない。

## Step 2 — 判定基準

| シグナル                                                  | 提案                                                                                                                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| エージェント / スキルが 2 ヶ月連続起動ゼロ                | 退避候補（スキルは `skills-archive/` へ。削除ではなく退避が既定 — 2026-08-16 ユーザー判断）。ただし他の rule / skill から正本として参照されているものは残す |
| description が 150 tokens 超                              | 痩身候補（詳細を本文へ移す）                                                                                                                                |
| 常駐 rule に手順（How）が書かれている                     | skill への移設候補（meta-harness.md 原則 1: rules = 判断基準 / skills = 手順書）                                                                            |
| 同じ確認・同じ失敗が複数セッションで反復                  | hook 化 or rule 改訂の候補（原則 4: 規範は宣言、強制は決定論）                                                                                              |
| 組み込み機能（Explore / Plan / code-review 等）と役割重複 | 統合・削除候補                                                                                                                                              |

## Step 3 — 出力フォーマット

```markdown
## Harness Reflect レポート（YYYY-MM-DD）

### 観測サマリ

| 対象 | 実績（直近 2 ヶ月・月次） | 常駐コスト | 所見 |
| ---- | ------------------------- | ---------- | ---- |

### 提案（適用はユーザー承認後）

1. <対象ファイル> — <削除 / 痩身 / 移設 / 改訂> — 根拠: <シグナル>
   （可能なら変更 diff の要点を添える）

### 前回からの変化

- <前回レポートとの比較。初回なら省略>
```

レポートは会話に返すだけでよい（恒久化したい判断だけ plan / docs へ昇格させる）。実施済みの棚卸しは `docs/plans/` の該当計画に記録する。
