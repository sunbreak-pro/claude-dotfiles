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
│   ├── skills/              # グローバルスキル (18 個)
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
| ほぼ全イベント                 | `hooks/orca-bridge.mjs`（orca ターミナルへの通知ブリッジ。下の「orca hook」参照）                                         |
| statusLine                     | `statusline-command.mjs`                                                                                                  |

### orca hook（クロスプラットフォームの要注意点）

orca（ターミナルアプリ）は `settings.json` に自分のフックを直接書き込む。その際 **実行中マシンの絶対パスが焼き込まれる**（Mac なら `/Users/<me>/.orca/agent-hooks/claude-hook.sh`、Windows なら `C:/Users/<me>/.orca/agent-hooks/claude-hook.cmd`）。これをそのまま commit すると、もう一方の OS では条件式が必ず偽になり orca 連携が丸ごと空振りする。

対策として repo 側は `hooks/orca-bridge.mjs` の 1 行に統一してある。ブリッジが実行時に platform を見て `~/.orca/agent-hooks/claude-hook.{sh,cmd}` を解決するので、settings.json に OS 固有パスは残らない。orca が未インストールのマシンでは何もせず終了する。

**commit 前の確認**: orca が live 側を書き戻していることがある。`git diff claude/settings.json` に `/Users/` や `C:/Users/` を含む行が現れたら、それを `"command": "node {{CLAUDE_DIR}}/hooks/orca-bridge.mjs"` に戻してから commit する。

## インストール

前提: Node.js / git がインストール済み。clone 先はどこでもよい（`install.mjs` は自分の置かれた場所を基準に symlink を張る）。**1 台につき clone は 1 箇所だけにする** — 複数箇所に clone すると `~/.claude/` の symlink がどれを指しているか分からなくなる。

### Mac（この機の実体は `~/orca/claude-dotfiles`）

```sh
git clone git@github.com:sunbreak-pro/claude-dotfiles.git ~/orca/claude-dotfiles
node ~/orca/claude-dotfiles/install.mjs
```

### Windows (PowerShell)

```powershell
git clone https://github.com/sunbreak-pro/claude-dotfiles.git $HOME\orca\claude-dotfiles
node $HOME\orca\claude-dotfiles\install.mjs
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

- `settings.local.json` … マシンローカルな設定。**`model` / `effortLevel` / マシン固有 permission はここに置く**（共有すると片方のマシンの選択がもう片方を上書きしてしまうため。2026-09-06 に `settings.json` から移した）
- `.credentials.json` / `history.jsonl` / `sessions/` / `session-env/` / `projects/` /
  `cache/` / `backups/` / `shell-snapshots/` / `ide/` / `plugins/` / `stats-cache.json` /
  `mcp-needs-auth-cache.json` / `.last-*` ほか runtime state 全般（.gitignore 参照）
- `sui-memory` 本体（`~/dev/Claude/sui-memory/`）… Mac 専用。hook ラッパーが無いマシンでは自動 no-op。
  Windows 機には未インストールのため `hooks/sui-memory.mjs` は素通りし、recall / save は実際には何もしていない。
  **Mac では実際に動いており**、SessionStart の recall が過去セッションの要約を 5 件ぶん `additionalContext` に注入する
  （2026-09-06 実測で数千トークン規模）。常駐コンテキストを削る話をするときはここも勘定に入れる。
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
- **`model` / `effortLevel` は `settings.json` から外した**（2026-09-06）。`/model` `/effort` の選択は Claude Code 本体が
  live の `~/.claude/settings.json` に書き込むが、`settings.json` は template=copy の片方向配布なので repo には戻らない。
  結果 repo と live が静かに食い違い、`node install.mjs` を打った瞬間にもう一方のマシンの選択で上書きされていた。
  マシンごとの値は `settings.local.json`（非共有）に置く。
- `settings.json` は `node install.mjs` のたびに live を上書きする。直前の内容は `~/.claude/settings.json.prev` に
  1 世代だけ残る（以前は `.bak.N` が実行のたびに増えていた）。
