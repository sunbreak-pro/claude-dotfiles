# claude-dotfiles

Claude Code のグローバル設定 `~/.claude/` を Mac / Windows の 2 台で共有するための dotfiles リポジトリ。
スクリプトは全て Node (.mjs) 製でシェル非依存（Windows ネイティブ PowerShell 環境で動作）。

## 前提（2026-09-02・Fable 5.1 向け改訂）

ハーネス全体が次の 3 つの前提で書かれている（正本は `claude/CLAUDE.md`）。

1. **ユーザーは見ていない** — 途中で質問して止まらず、仮定を置いて進めて最後に報告する
2. **範囲を限定する** — 触るファイル / 完了条件 / 触らないものを宣言してから動く
3. **並列で進める** — 独立した作業は 1 メッセージで並列起動し、サブエージェントの完了を待たずリーダーも手を動かす

effort は `high` が既定。`xhigh` / `max` は `claude/docs/effort-ledger.md` に実測が記録されたタスク種別だけに使う。

## 構成

```
claude-dotfiles/
├── claude/                  # ~/.claude/ にミラーされる共有ファイル群
│   ├── CLAUDE.md            # グローバル指示（前提 3 つ + Working Rules）
│   ├── settings.json        # テンプレート（{{CLAUDE_DIR}} を install 時に実パス展開）
│   ├── statusline-command.mjs
│   ├── hooks/               # 全 hook（Node 製・クロスプラットフォーム）
│   ├── rules/               # グローバルルール (3 ファイル・うち 2 本は paths: 付きで非常駐)
│   ├── agents/              # グローバルエージェント定義 (7 ファイル)
│   ├── skills/              # グローバルスキル (16 個)
│   ├── docs/                # bash-tool-stability / effort-ledger / meta-harness / skill-lib-retirement / plans/
│   ├── output-styles/       # 口調 output style（tone-persona・常時有効化）
│   └── templates/           # comm-protocol テンプレート
├── claude/skills-archive/   # 退避スキル (4 個)。manifest 対象外＝ ~/.claude へ配らない
├── manifest.json            # リンク対象一覧（src → ~/.claude/<dest> + mode）
├── install.mjs              # インストーラ（symlink、失敗時 copy フォールバック）
├── .gitignore
└── README.md
```

### rules

| ファイル                | 常駐  | 内容                                                            |
| ----------------------- | ----- | --------------------------------------------------------------- |
| `tone.md`               | 常駐  | サブエージェント向けの口調要点（正本は output style）           |
| `harness-management.md` | paths | skills / agents を触るときの置き場・書き方・effort 方針・棚卸し |
| `plan-mode-quality.md`  | paths | plans/ を書くときの書式ポインタ                                 |

### skills（抜粋）

- `lead-pipeline` … 実装タスクの采配表。重ティアは role-pm → role-engineer（並列）→ session-verifier → role-qa。`ultracode` キーワードで並列最大化（`references/ultracode-mode.md`）
- `visual-inspect` … 画面・図表・スクリーンショットを `scripts/crop.mjs` で切り抜き → 拡大 → Read、を繰り返して確かめる。依存は sharp だけで初回に自動 install
- `html-report` … 判断材料を HTML にして Artifact で発行する型。`templates/report.html` が土台、型の見本は Claude Design のキャンバス「Report Templates」
- `life-editor-note` … レポートの URL と要点を life-editor の Note に控えとして残す。`scripts/le-note.mjs` が mcp-server を stdio で直接呼ぶ（MCP 未登録でも可）
- `task-tracker` … per-chat memory / history の更新と commit。session-verifier が緑になったら確認を待たず実行
- `execution-router` … `/goal` `/batch` `/loop` の判断とコマンド文字列の提示（Claude は実行しない）

## 共有対象

| ~/.claude/ 内                                                      | mode         | 備考                                                        |
| ------------------------------------------------------------------ | ------------ | ----------------------------------------------------------- |
| `CLAUDE.md`                                                        | link         | グローバル指示                                              |
| `settings.json`                                                    | **template** | `{{CLAUDE_DIR}}` を実パスに展開してコピー（symlink しない） |
| `statusline-command.mjs`                                           | link         | statusline（使用率バー / model + effort / cwd + branch）    |
| `hooks/`                                                           | link         | 下表参照                                                    |
| `rules/` `agents/` `skills/` `docs/` `output-styles/` `templates/` | link         | ディレクトリごと symlink                                    |

### hooks 一覧

| hook イベント                  | 実装                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| UserPromptSubmit               | `hooks/pipeline-gate.mjs`（実装系キーワード / `ultracode` 検出時に lead-pipeline へのポインタを注入。排他・二重注入なし） |
| UserPromptSubmit               | `hooks/graphify-nudge.mjs`（graphify-out/graph.json がある repo でのみ、探索前に graphify スキル優先を一行注入）          |
| PostToolUse (Edit\|Write)      | `hooks/post-edit-prettier.mjs`                                                                                            |
| PreToolUse (Edit\|Write\|Read) | `hooks/protect-files.mjs`（秘匿ファイルのブロック）                                                                       |
| PreToolUse (Skill)             | `hooks/skill-launch-notice.mjs`（`<The {skill} will launch>` の出力を強制。rule 側の宣言は持たない）                      |
| SessionStart / Stop            | `hooks/sui-memory.mjs`（バイナリが無いマシンでは no-op）                                                                  |
| Notification                   | `hooks/notify.mjs`（mac=osascript / win=PowerShell toast）                                                                |
| statusLine                     | `statusline-command.mjs`                                                                                                  |

## インストール

前提: Node.js / git がインストール済み。

### Mac

```sh
git clone git@github.com:sunbreak-pro/claude-dotfiles.git ~/dev/claude-dotfiles
node ~/dev/claude-dotfiles/install.mjs
```

### Windows (PowerShell)

```powershell
git clone https://github.com/sunbreak-pro/claude-dotfiles.git $HOME\dev\claude-dotfiles
node $HOME\dev\claude-dotfiles\install.mjs
```

- 既存の `~/.claude/<x>` は `<x>.bak`（衝突時 `.bak.1` …）に退避される
- ディレクトリは Windows でも **junction** を使うため Developer Mode 不要
- ファイル symlink は Developer Mode 無効だと copy にフォールバックする
  （copy の場合、pull しても自動反映されないので pull 後に `node install.mjs` を再実行）
- `settings.json` だけは常に copy（テンプレート展開のため）。**repo 側を編集したら `node install.mjs` を再実行**

## 双方向同期の運用

symlink でインストールされた項目は `~/.claude/` 越しの編集がそのまま repo の working tree に反映される。

1. どちらかのマシンで編集（`~/.claude/` 経由でも repo 直接でも同じ）
2. `cd ~/dev/claude-dotfiles && git add -A && git commit -m "..." && git push`
3. もう一方のマシンで `git pull`（copy フォールバック / settings.json 変更時は `node install.mjs` も再実行）

## マシン固有・共有しないもの

- `settings.local.json` … マシンローカル permission（macOS 固有エントリ含む）
- `.credentials.json` / `history.jsonl` / `sessions/` / `session-env/` / `projects/` /
  `cache/` / `backups/` / `shell-snapshots/` / `ide/` / `plugins/` / `stats-cache.json` /
  `mcp-needs-auth-cache.json` / `.last-*` ほか runtime state 全般（.gitignore 参照）
- `sui-memory` 本体（`~/dev/Claude/sui-memory/`）… Mac 専用。hook ラッパーが無いマシンでは自動 no-op。
  Windows 機には未インストールのため `hooks/sui-memory.mjs` は素通りし、recall / save は実際には何もしていない。
  タスク状態の正本は task-tracker で、sui-memory はセッション横断の自動要約のみ（境界は `skills/task-tracker/SKILL.md` §規約）
- `claude/skills/visual-inspect/scripts/node_modules/` … `crop.mjs` が初回実行時に入れる sharp。gitignore 済み

## 既知の注意点

- **Mac の skill-lib / agents-lib との関係**: 従来 `~/.claude/skills|agents` は
  `~/dev/Claude/skill-lib|agents-lib` への symlink ファーム運用だった。本 repo には
  その実体をコピーしてある。Mac で `install.mjs` を実行すると symlink ファームは
  `.bak` に退避され、**以後の SSOT はこの repo になる**（lib 側は更新されない。残存参照は `claude/docs/skill-lib-retirement.md`）。
- `skills-archive/code-refactoring/scripts/init_lang_refactoring.sh` はスキル内部の
  補助スクリプトで Windows ネイティブでは動かない（退避済みなので現状は未配布）。
- `permissions.allow` に `Agent` を入れてある（2026-09-02）。サブエージェントの起動は auto mode の分類器を通らず許可される（起動した子の Bash / Edit は従来どおり判定と hook を通る）。指示文に git 用語が並ぶだけで起動が止まっていたため。
- `settings.json` の `model` / `effortLevel` / `modelSettings` もそのまま共有される。マシンごとに
  変えたい場合は `settings.local.json`（非共有）で上書きする。`/effort` で保存した値は `modelSettings` に入るので、
  repo 側と食い違ったら `node install.mjs` で repo 側に揃う。
