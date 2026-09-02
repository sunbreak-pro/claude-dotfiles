---
name: life-editor-note
description: 作業の成果（HTML レポートの URL・要約・PDF の置き場）を life-editor の Note に控えとして残す。MCP が未登録のセッションでも scripts/le-note.mjs が mcp-server を直接呼ぶ。html-report の発行後に使う。Memo（日記）や Task の記録は対象外。Triggers include "Note に残して", "life-editor に記録", "ノートにして", "控えを残す", "life-editor-note".
---

# life-editor-note — レポートの控えを life-editor に残す

## 手順

1. 先に HTML を書いて Artifact を発行しておく（`html-report`）。URL とファイルパスが揃ってから呼ぶ。
2. 実行:

```
node ~/.claude/skills/life-editor-note/scripts/le-note.mjs \
  --title "<レポート名>" --kind 判断 \
  --url https://claude.ai/code/artifact/<id> \
  --path docs/reports/YYYY-MM-DD-<slug>.html \
  --summary "結論 1 行目" --summary "結論 2 行目" \
  --pdf
```

3. 出力の `created note <id>` を報告の末尾に URL・パスと並べて書く。

## 何が Note に入るか

コールアウト（種別・日付）→ URL → 要点（`--summary` の箇条書き）→ ファイルの置き場（HTML と PDF のパス）。本文は Note に転記しない。Note は「控え」で、本文は URL から読む。

## 制約（2026-09-02 実測）

- **PDF は Note に添付できない。** MCP にファイル添付ツールが無く、life-editor の添付機能も画像専用（`shared/src/constants/attachments.ts`）。`--pdf` は HTML と同じ場所に `.pdf` を作り、Note にはそのパスを書く。添付したくなったら life-editor 側に「MCP から attachments バケットへ upload するツール」を Issue 起票する。
- PDF の生成は Windows の Edge（ヘッドレス印刷）。ダーク表示は印刷に乗らないので、PDF はライト固定になる。
- 同名 Note があれば日付付きの別 Note を作る（`generate_content` は上書きのため）。
- 環境変数 `LIFE_EDITOR_MCP_ENTRY` と `LIFE_EDITOR_SUPABASE_*` が要る。未設定ならスクリプトが最初に止まる。
- `--dry-run` で送る内容だけを表示できる。
