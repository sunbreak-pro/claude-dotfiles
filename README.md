# claude-dotfiles

Claude Code のグローバル設定 `~/.claude/` を Mac / Windows の 2 台で共有するための dotfiles リポジトリ。
スクリプトは全て Node (.mjs) 製でシェル非依存（Windows ネイティブ PowerShell 環境で動作）。

## 構成

```
claude-dotfiles/
├── claude/                  # ~/.claude/ にミラーされる共有ファイル群
│   ├── CLAUDE.md            # グローバル指示
│   ├── settings.json        # テンプレート（{{CLAUDE_DIR}} を install 時に実パス展開）
│   ├── statusline-command.mjs
│   ├── hooks/               # 全 hook（Node 製・クロスプラットフォーム）
│   ├── rules/               # グローバルルール (11 ファイル)
│   ├── agents/              # グローバルエージェント定義 (7 ファイル)
│   ├── skills/              # グローバルスキル (15 個)
│   ├── docs/                # hooks_guide.md
│   ├── output-styles/       # 口調 output style（tone-persona・常時有効化）
│   └── templates/           # comm-protocol テンプレート
├── manifest.json            # リンク対象一覧（src → ~/.claude/<dest> + mode）
├── install.mjs              # インストーラ（symlink、失敗時 copy フォールバック）
├── .gitignore
└── README.md
```

## 共有対象

| ~/.claude/ 内                                                      | mode         | 備考                                                        |
| ------------------------------------------------------------------ | ------------ | ----------------------------------------------------------- |
| `CLAUDE.md`                                                        | link         | グローバル指示                                              |
| `settings.json`                                                    | **template** | `{{CLAUDE_DIR}}` を実パスに展開してコピー（symlink しない） |
| `statusline-command.mjs`                                           | link         | 旧 `statusline-command.sh` の Node 移植                     |
| `hooks/`                                                           | link         | 旧 inline sh+jq hook 群の Node 移植（下表参照）             |
| `rules/` `agents/` `skills/` `docs/` `output-styles/` `templates/` | link         | ディレクトリごと symlink                                    |

### hooks 一覧（旧 → 新）

| hook イベント                  | 旧実装                                     | 新実装                                                                                                                 |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| UserPromptSubmit               | `hooks/lead-pipeline-gate.sh` (sh+jq+grep) | `hooks/pipeline-gate.mjs`（lead-pipeline のティア判定＋ultracode 検出時の並列采配注入を 1 本で排他処理・二重注入なし） |
| UserPromptSubmit               | —（新設）                                  | `hooks/graphify-nudge.mjs`（graphify-out/graph.json がある repo でのみ、探索前に graphify スキル優先を一行注入）       |
| PostToolUse (Edit\|Write)      | inline sh+jq → prettier                    | `hooks/post-edit-prettier.mjs`                                                                                         |
| PreToolUse (Edit\|Write\|Read) | inline sh+jq 秘匿ファイルブロック          | `hooks/protect-files.mjs`                                                                                              |
| PreToolUse (Skill)             | inline sh+jq スキル起動宣言                | `hooks/skill-launch-notice.mjs`                                                                                        |
| SessionStart / Stop            | `sui-memory recall/save` 直叩き            | `hooks/sui-memory.mjs`（バイナリが無いマシンでは no-op）                                                               |
| Notification                   | `osascript`                                | `hooks/notify.mjs`（mac=osascript / win=PowerShell toast）                                                             |
| statusLine                     | `statusline-command.sh` (sh+jq+awk+perl)   | `statusline-command.mjs`                                                                                               |

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
  Windows 機には未インストールのため `hooks/sui-memory.mjs` は素通りし、recall / save は実際には何もしていない
  （責務境界の宣言は `claude/rules/memory-boundary.md`）

## 既知の注意点

- **Mac の skill-lib / agents-lib との関係**: 従来 `~/.claude/skills|agents` は
  `~/dev/Claude/skill-lib|agents-lib` への symlink ファーム運用だった。本 repo には
  その実体をコピーしてある。Mac で `install.mjs` を実行すると symlink ファームは
  `.bak` に退避され、**以後の SSOT はこの repo になる**（lib 側は更新されない）。
- `skills-archive/code-refactoring/scripts/init_lang_refactoring.sh` はスキル内部の
  補助スクリプトで Windows ネイティブでは動かない（退避済みなので現状は未配布）。
- `settings.json` の `model` / `effortLevel` 等もそのまま共有される。マシンごとに
  変えたい場合は `settings.local.json`（非共有）で上書きする。
