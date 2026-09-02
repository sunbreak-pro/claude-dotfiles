---
name: life-editor-note
description: HTML レポートの URL と要点を life-editor の Note に控えとして残す。MCP が未登録のセッションでも scripts/le-note.mjs が mcp-server を直接呼ぶ。html-report の発行後に使う。PDF 化・Memo（日記）・Task の記録は対象外。Triggers include "Note に残して", "life-editor に記録", "ノートにして", "控えを残す", "life-editor-note".
---

# life-editor-note — レポートの URL を life-editor に残す

## 手順

1. 先に HTML を書いて Artifact を発行しておく（`html-report`）。URL が出てから呼ぶ。
2. 実行:

```
node ~/.claude/skills/life-editor-note/scripts/le-note.mjs \
  --title "<レポート名>" --kind 判断 \
  --url https://claude.ai/code/artifact/<id> \
  --path docs/reports/YYYY-MM-DD-<slug>.html \
  --summary "結論 1 行目" --summary "結論 2 行目"
```

3. 出力の `created note <id> ... url-in-body=yes` を報告の末尾に URL と並べて書く。`NO` なら本文が入っていないので、そのまま報告する（隠さない）。

## 何が Note に入るか

「URL」「要点」「ファイル」の見出しと、末尾に種別・日付の 1 行。本文は転記しない。Note は「控え」で、本文は URL から読む。

## 制約（2026-09-02 実測）

- **本文は Markdown（見出し・段落・箇条書き）だけで書く。** `generate_content` の callout / table / codeBlock で作った Note は、DB には入るのに画面では本文が空に見えた（原因は未確定。編集器がその部品を知らないか、外部作成時の同期の取りこぼし）。Markdown で書き直した Note は本文が入ることを確認済み。
- 同名 Note があれば日付付きの別 Note を作る（控えは上書きしない）。
- 環境変数 `LIFE_EDITOR_MCP_ENTRY` と `LIFE_EDITOR_SUPABASE_*` が要る。未設定ならスクリプトが最初に止まる。
- `--dry-run` で送る本文だけを表示できる。
- Artifact の URL は非公開が既定。life-editor から開くには claude.ai にログインしている必要がある。
