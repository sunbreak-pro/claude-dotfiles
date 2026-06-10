---
name: life-editor-mcp
description: Life Editor MCP ツールを使ったメモ・ノート・タスク・スケジュールの記録スキル。作業ログ、設計メモ、学習記録、アイデアなどを Life Editor に保存する。Triggers include "メモ", "ノートに記録", "Life Editorに書く", "記録して", "note", "memo", "write to life editor", "save note", "日記", "ジャーナル", "作業ログ".
---

MANDATORY FIRST ACTION: Output `<The life-editor-mcp will launch>` before doing anything else.

# Life Editor MCP — 記録・メモスキル

Life Editor の MCP ツールを使って情報を記録する。
使用前に `ToolSearch` で必要なツールのスキーマを読み込むこと。

## ツール読み込み（必須）

使用するツールを事前に ToolSearch で読み込む:

```
ToolSearch("select:mcp__life-editor__create_note,mcp__life-editor__upsert_memo,mcp__life-editor__generate_content")
```

主要ツール群:

- **Note 系**: `create_note`, `update_note`, `list_notes`
- **Memo 系**: `upsert_memo`, `get_memo`（日付ベースの日記/ジャーナル）
- **Task 系**: `create_task`, `update_task`, `get_task`, `list_tasks`, `get_task_tree`
- **Schedule 系**: `create_schedule_item`, `update_schedule_item`, `list_schedule`
- **File 系**: `write_file`, `read_file`, `list_files`, `search_files`
- **Tag 系**: `tag_entity`, `list_wiki_tags`, `search_by_tag`
- **検索**: `search_all`（横断検索）
- **リッチ生成**: `generate_content`（テーブル・トグル・コールアウト対応）, `format_content`

## エンティティ選択ガイド

| 記録したい内容                 | エンティティ | ツール                              |
| ------------------------------ | ------------ | ----------------------------------- |
| 作業ログ・日記・今日の振り返り | **Memo**     | `upsert_memo` (date指定)            |
| 設計書・参照資料・永続的メモ   | **Note**     | `create_note` or `generate_content` |
| やること・TODO                 | **Task**     | `create_task`                       |
| 予定・イベント                 | **Schedule** | `create_schedule_item`              |
| コードスニペット・設定ファイル | **File**     | `write_file`                        |

## コンテンツ形式

### シンプルな内容 → Markdown 直接指定

`create_note`, `upsert_memo`, `update_note` の `content` パラメータに Markdown を渡す:

```markdown
# 見出し

**太字**, _斜体_, `コード`

- リスト項目
- [ ] タスクリスト
  > 引用
  > [!NOTE] コールアウト
```

### リッチな内容 → generate_content

テーブル、トグルリスト、カスタムコールアウトが必要な場合:

```
mcp__life-editor__generate_content({
  target: "note",
  title: "タイトル",
  structure: [
    { type: "heading", level: 1, text: "見出し" },
    { type: "paragraph", text: "本文テキスト" },
    { type: "table", headers: ["列A", "列B"], rows: [["値1", "値2"]] },
    { type: "toggleList", summary: "詳細", content: [
      { type: "paragraph", text: "折りたたみ内容" }
    ]},
    { type: "callout", text: "注意点", color: "yellow", iconName: "AlertTriangle" },
    { type: "codeBlock", code: "const x = 1;", language: "typescript" },
    { type: "taskList", tasks: [{ text: "TODO項目", checked: false }] }
  ]
})
```

`target` は `"note"` / `"memo"` / `"schedule"` を指定。
既存エンティティの更新時は `target_id` を追加。

### 既存コンテンツの再構成 → format_content

既存ノート/メモの構造を変更（コールアウトで囲む、トグルに入れる等）:

```
mcp__life-editor__format_content({
  target: "note",
  target_id: "note-xxx",
  operations: [
    { action: "wrap_callout", text: "重要", color: "red", iconName: "AlertCircle" },
    { action: "add_heading", text: "新セクション", level: 2, position: "end" }
  ]
})
```

## タグ付け

エンティティ作成後にタグを付与して横断検索可能にする:

```
mcp__life-editor__tag_entity({
  tag_name: "Claude Code",
  entity_id: "note-xxx",
  entity_type: "note"
})
```

タグが存在しなければ自動作成される。

## よくあるワークフロー

### 1. 作業ログを今日の Memo に追記

```
1. get_memo(date: "2026-04-13") で既存内容を確認
2. 既存あり → upsert_memo で内容を追記（既存 + 新規を結合）
   既存なし → upsert_memo で新規作成
```

**注意**: `upsert_memo` は上書きする。追記する場合は `get_memo` で既存を取得し、結合してから書き込む。

### 2. 設計メモを Note に記録

```
1. list_notes(query: "キーワード") で既存ノートを検索
2. 既存あり → update_note で更新
   既存なし → create_note or generate_content で新規作成
3. tag_entity でタグ付け
```

### 3. TODO をタスクに登録

```
1. get_task_tree() でフォルダ構造を確認
2. create_task(title: "...", parent_id: "folder-xxx") で適切なフォルダに作成
```

## ルール

- 記録前に既存エンティティを検索し、重複を避ける
- Memo は日付単位。同じ日の内容は追記で統合する（上書きしない）
- Note タイトルは内容がわかる具体的な名前にする
- 長いコンテンツや構造的なコンテンツには `generate_content` を使う
- タグは一貫した命名で付与する（例: プロジェクト名、カテゴリ）
- ToolSearch でツールスキーマを読み込んでから使用する
