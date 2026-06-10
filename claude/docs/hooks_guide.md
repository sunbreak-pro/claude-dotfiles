# Claude Code Hooks ガイド

## このドキュメントの目的

Claude Code の Hooks 機能について理解し、活用するためのナレッジベース。
CLAUDE.md（静的なルール）とは別に、Hooks（自動実行プログラム）を組み合わせることで、より確実で効率的なワークフローを構築できる。

---

## 1. Hooks とは何か

Hooks は、Claude Code のライフサイクルの特定タイミングで**自動実行されるシェルコマンド/スクリプト**。

### CLAUDE.md との根本的な違い

| 項目 | CLAUDE.md | Hooks |
|------|-----------|-------|
| 性質 | Claude への「お願い」（テキスト） | OS レベルの「自動プログラム」 |
| 実行確実性 | Claude が従わないこともある | 100% 確実に実行される |
| 実行主体 | Claude（LLM）が解釈して判断 | OS のシェルが直接実行 |
| 用途 | プロジェクトルール、コーディング規約 | フォーマット自動化、セキュリティゲート、記憶保存 |

**要するに：** CLAUDE.md = 人間への指示書、Hooks = 機械的なトリガー

---

## 2. Hooks が発火する4つのタイミング

### PreToolUse（ツール実行前）
Claude がファイル書き込みやBash実行をする**直前**に発火する。
危険なコマンドをブロックしたり、実行前のバリデーションに使う。

```
例: rm -rf を含むコマンドを自動ブロック
例: 特定ファイルへの書き込みを禁止
```

### PostToolUse（ツール実行後）
Claude がツールを実行した**直後**に発火する。
コード整形、型チェック、テスト実行などの後処理に使う。

```
例: ファイル編集後に自動で Prettier を実行
例: TypeScript ファイル変更後に tsc --noEmit で型チェック
```

### Stop（応答完了時）
Claude が応答を終えたタイミングで発火する。
セッションログの保存、サマリー生成などに使う。

```
例: 会話の transcript を記憶エンジンに自動送信（sui-memory の手法）
例: セッション要約を自動生成
```

### SessionStart（セッション開始時）
セッションが始まった時に発火する。コンテキスト圧縮後の再開時にも使える。

```
例: 前回セッションの要約を自動注入
例: プロジェクト状態のスナップショットを読み込み
```

---

## 3. 設定方法

### 設定ファイルの配置場所（優先度順）

| ファイル | スコープ | Git 管理 |
|---------|--------|---------|
| `.claude/settings.json` | プロジェクト固有（チーム共有） | する |
| `.claude/settings.local.json` | プロジェクト固有（個人用） | しない |
| `~/.claude/settings.json` | 全プロジェクト共通（グローバル） | しない |

### 基本的な書き方

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

### 構造の読み方

```
hooks
  └── イベント名（PreToolUse / PostToolUse / Stop / SessionStart）
        └── matcher: どのツールに反応するか（正規表現。空文字 = 全て）
              └── hooks: 実行するコマンドの配列
                    └── type: "command"
                    └── command: 実行するシェルコマンド
```

### matcher の例

| matcher | 対象 |
|---------|------|
| `"Bash"` | Bash コマンド実行時のみ |
| `"Edit\|Write"` | ファイル編集・書き込み時 |
| `"Edit\|MultiEdit\|Write"` | あらゆるファイル変更時 |
| `""` または `"*"` | 全てのツール実行時 |

---

## 4. 終了コードの意味

Hook スクリプトの終了コードで Claude Code の挙動を制御できる。

| 終了コード | 意味 | 動作 |
|-----------|------|------|
| `exit 0` | 正常終了 | 処理を続行。stdout の内容が Claude へのフィードバックになる |
| `exit 2` | ブロック | **アクションを中止**。stderr が Claude に伝わり、代替案を提案する |
| `exit 1` | 警告 | 処理は続行するが、stderr をログに記録 |

**重要：** セキュリティ目的の Hook は必ず `exit 2` を使う。`exit 1` では実行を止められない。

---

## 5. Hook が受け取るデータ

Claude Code は Hook 実行時に JSON データを stdin で渡す。

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../session-id.jsonl",
  "cwd": "/Users/.../project",
  "hook_event_name": "Stop",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "command": "npm run test"
  }
}
```

スクリプト内で `jq` などを使ってこの JSON からデータを抽出する。

---

## 6. 実践パターン集

### パターン A: ファイル保存時の自動フォーマット

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

### パターン B: 危険コマンドのブロック

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/block-dangerous-commands.sh"
          }
        ]
      }
    ]
  }
}
```

block-dangerous-commands.sh の例：
```bash
#!/bin/bash
COMMAND=$(jq -r '.tool_input.command')
if echo "$COMMAND" | grep -q 'rm -rf'; then
  echo "破壊的コマンドをブロックしました" >&2
  exit 2  # exit 2 でブロック
else
  exit 0  # exit 0 で許可
fi
```

### パターン C: セッション終了時の記憶保存（sui-memory 方式）

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python /path/to/memory-engine/save.py"
          }
        ]
      }
    ]
  }
}
```

save.py は stdin から JSON を読み取り、`transcript_path` を使って会話ログを取得・保存する。

---

## 7. 2層構造の考え方

効果的な Claude Code 活用は、**静的レイヤー + 動的レイヤー** の2層で構成される。

```
┌─────────────────────────────────────────────┐
│  CLAUDE.md（静的レイヤー）                     │
│  - 技術スタック、コーディング規約               │
│  - ディレクトリ構成、命名規則                   │
│  - セッションが変わっても内容は同じ              │
│  → 「取扱説明書」                              │
├─────────────────────────────────────────────┤
│  Hooks + 記憶エンジン（動的レイヤー）            │
│  - 過去の設計判断とその理由                     │
│  - 却下したアイデアの経緯                       │
│  - 試行錯誤の履歴                              │
│  → 「共有した経験」                            │
└─────────────────────────────────────────────┘
```

CLAUDE.md だけでは「毎朝、記憶喪失の同僚に仕事を教え直す」状態になる。
Hooks で会話を自動保存し、検索可能にすることで、文脈を持った壁打ち相手になる。

---

## 8. 対話的な設定方法

Claude Code 内で `/hooks` コマンドを実行すると、対話形式で Hook を設定できる。
JSON を手動で書くより簡単で、初めての場合はこちらが推奨される。

```
> /hooks
# → イベント選択 → matcher 設定 → コマンド入力 の対話が始まる
```

---

## 9. 注意事項

- Hook は**ユーザーの権限**で実行される（サンドボックスなし）。信頼できるスクリプトのみ使う
- matcher は**大文字小文字を区別する**。`"bash"` ではなく `"Bash"` と書く
- コマンドパスは**絶対パス推奨**。作業ディレクトリが変わっても確実に動くようにする
- サブエージェント（Agent ツール）の実行時にも Hook は発火する
- シェルプロファイルが起動時にテキストを出力すると、JSON パースに干渉する場合がある

---

## 参考リンク

- [Claude Code Hooks 公式ドキュメント](https://code.claude.com/docs/ja/hooks)
- [sui-memory の記事（Zenn）](https://zenn.dev/noprogllama/articles/7c24b2c2410213)