---
name: playwright-verify
description: Playwright MCP の実ブラウザ操作で UI 変更を runtime 検証する手順書。session-verifier（静的ゲート）の後段に置く動的ゲートで、通常は playwright-ui-verifier エージェント経由で実行する。Triggers include "画面で確認して", "実際に動かして検証", "ブラウザで検証", "runtime verify", "playwright verify", UI 差分を伴う lead-pipeline の検証フェーズ。
---

# Playwright Verify — 実ブラウザ runtime 検証ゲート

型やテストが「レシピどおり作れたか」なら、これは「一口食べて味を確かめる」工程。ブラウザを本当に動かし、画面を操作して確かめる。

- 順序は session-verifier（静的）→ 本スキル（動的）。静的ゲート失敗中は実行しない
- 実行主体は原則 playwright-ui-verifier エージェント（実ブラウザ操作はコンテキストを大量に使うので隔離する）。メインが直接やるのは軽い単発確認だけ
- 検証専任。コードは修正しない。findings をメインに返し、修正後に再検証する
- 細かい文字・レイアウトの確認は screenshot を `visual-inspect` で切り抜いて拡大する

## Gates

- **P0 環境準備** — dev server の起動コマンドとポートをプロジェクトの CLAUDE.md / package.json で確認し、未稼働なら `run_in_background: true` で起動して**起動ログから実ポートを読む**（既定ポートを思い込まない）。worktree では env ファイルの有無を確認する。`mcp__playwright` が未ロードなら ToolSearch でロード
- **P1 起動スモーク** — `browser_navigate` → `browser_snapshot`（白画面 / エラー画面でない）→ `browser_console_messages`（error 0 件。既知の無害 warning は記録のみ）
- **P2 表示検証** — `git diff --name-only` か渡された変更概要を起点に変更が見える画面へ遷移し、snapshot で期待要素・文言・状態を確認（i18n 対象なら全ロケール）
- **P3 インタラクション検証** — 変更機能の主要フロー（作成 / 編集 / 削除 / DnD / ダイアログ）を実操作し、各操作後に snapshot + console の両方を確認。使えるツール名は ToolSearch の結果が正
- **P4 リグレッションスモーク** — 隣接画面を一巡し、新規 console error が無いことを確認（巡回先はプロジェクトの画面 registry から読む。ここに一覧を書かない）
- **P5 視覚チェック** — `browser_take_screenshot` を scratchpad（成果物なら `.claude/reports/`）へ保存し、レイアウト崩れ・はみ出し・重なり・プロジェクトのデザイン規約違反（トークン外の色等）・テーマ切替の両方を確認

## Report

```
## Playwright Verify Report
- 対象: <変更概要> / 画面: <sections>
- Gate P0〜P5: それぞれ PASS / FAIL / SKIP(理由)
- Findings（FAIL のみ）: [P?] 画面 / 操作 / 期待 / 実際 / console 出力 / screenshot path
- 総合: PASS | BLOCKING（n 件）
```

BLOCKING には再現手順（クリック順）を必ず書く。

## 制約

- ブラウザ実体はセッションに 1 つ。playwright を使うエージェントを同時に 2 体以上起動しない
- IME 入力・OS ネイティブ挙動は再現しきれない。疑わしければ「手動確認推奨」として報告
- 自分が起動した dev server 以外は止めない
