---
paths:
  - "**/skills/**"
  - "**/agents/**"
---

# Skill / Agent Management

> path-scoped rule: スキル・エージェント定義を扱うときだけロードされる。

## 置き場所

| 種別         | 実体                                                   | 配布                                                     |
| ------------ | ------------------------------------------------------ | -------------------------------------------------------- |
| グローバル   | 本リポジトリの `claude/skills/` / `claude/agents/`     | `node install.mjs` が `~/.claude/` へ junction / symlink |
| プロジェクト | 各プロジェクトの `.claude/skills/` / `.claude/agents/` | そのプロジェクトの git                                   |

- リポジトリ外を指す symlink は作らない（無いマシンで黙って空振りする）。別マシンへは commit して pull する。
- ファイル名は `SKILL.md`（全大文字）。組み込みスキル（`security-review` 等）は実体を持たなくても frontmatter の `skills:` から解決される。
- 退避先は `claude/skills-archive/`（manifest 対象外。`claude/skills/` に残すと description が常駐し続ける）。

## 書き方

- description は「1 行要約 + 起動条件 + 非対象」で 80〜150 tokens。description は毎セッション常駐する固定費なので、手順は本文へ。
- 本文には「モデルが知りようがないこと」だけ書く: 出力フォーマット / 決定論的手順 / 安全則 / 他ファイルへの正本ポインタ。一般知識・設計思想・ASCII 図・同じ注意の再掲は書かない。
- 本当に守らせたいことは hook（決定論）で担保し、rule の文面は最小にする（例: skill 起動宣言 = `hooks/skill-launch-notice.mjs`）。

## effort / model

- サブエージェントの `effort:` は書かない（セッション既定 `high` を継承）。`xhigh` / `max` は `docs/effort-ledger.md` に効果の実測が記録されたエージェントにだけ書く。
- `model:` は 記録・収集系 = `sonnet` / 実装・監査系 = `opus`。サブエージェントに Fable は割り当てない（短い単発仕事では長所が出ず単価だけ上がる。セキュリティ判定は拒否されることがある）。

## 棚卸し

- `harness-reflect` スキルで起動実績を集計し、2 か月連続ゼロは退避候補（他ファイルが正本として参照しているものは残す）。
- スキル・エージェントの削除・移動は不可逆なので、実行前にユーザー確認を取る。
