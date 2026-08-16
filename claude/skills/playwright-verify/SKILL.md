---
name: playwright-verify
description: Playwright MCP の実ブラウザ操作で UI 変更を runtime 検証する手順書。session-verifier（静的ゲート）の後段に置く動的ゲートで、通常は playwright-ui-verifier エージェント経由で実行する。Triggers include "画面で確認して", "実際に動かして検証", "ブラウザで検証", "runtime verify", "playwright verify", UI 差分を伴う lead-pipeline の検証フェーズ。
---

# Playwright Verify — 実ブラウザ runtime 検証ゲート

型チェックやテスト（session-verifier）が「レシピどおり作れたか」の確認だとすると、本スキルは「実際に一口食べて味を確かめる」工程。ブラウザを本当に起動し、画面を操作して、人間が見るのと同じ状態で検証する。

## 位置づけ

- session-verifier（静的: 型 / lint / test）→ **playwright-verify（動的: 実ブラウザ）** の順。静的ゲート失敗中は実行しない
- 実行主体は原則 **playwright-ui-verifier エージェント**（model: opus / effort: xhigh）。メインチャットが直接実行するのは軽い単発確認のみ（実ブラウザ操作はコンテキストを大量消費するため隔離が基本）
- 検証専任。**コードは修正しない**（findings をメインに返し、修正はメイン / role-engineer が行い再検証）

## Gate P0: 環境準備

1. dev server 稼働確認: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/`（dev コマンドとポートはプロジェクトの CLAUDE.md / package.json から特定。life-editor は `cd web && npm run dev`）
2. 未稼働なら Bash を `run_in_background: true` で起動 → 起動ログから**実ポート**を読む（別の vite が既に動いていると 5174+ にずれる既知挙動。思い込みで 5173 に接続しない）
3. worktree で作業中の場合: `web/.env.local` の存在を確認。無ければメインリポジトリからコピー（欠落すると credentials throw で白画面になる既知 gotcha）
4. mcp__playwright ツール群が未ロードなら ToolSearch でロードする

## Gate P1: 起動スモーク

1. `browser_navigate` で実ポートの URL へ移動
2. `browser_snapshot` — 白画面 / エラー画面でないこと
3. `browser_console_messages` — error レベル 0 件（既知の無害 warning は記録のみで通過可）

## Gate P2: 変更画面の表示検証

1. `git diff --name-only`（または指示された変更概要）を起点に、変更が見える画面へ遷移する（life-editor はルーターなし・サイドバーのセクション切替を `browser_click`）
2. `browser_snapshot` で期待要素の存在・文言・状態を確認（i18n 対象なら en / ja 両方の catalog 表示を確認）

## Gate P3: インタラクション検証

変更した機能の主要フローを実際に操作する:

- 作成 / 編集 / 削除 / 完了トグル等 → `browser_click` / `browser_type` / `browser_fill_form` / `browser_select_option`
- ドラッグ&ドロップ → `browser_drag` / `browser_drop`（本スキルのツール名は例示。実際に使える面は ToolSearch の結果が正 — @playwright/mcp のバージョンで変わりうる）
- 確認ダイアログ → `browser_handle_dialog`
- 各操作の後に `browser_snapshot` + `browser_console_messages` で「結果が画面に反映されたか」「エラーが出ていないか」を両方確認する

## Gate P4: リグレッションスモーク

変更画面の隣接セクションを一巡 navigate し、console error が新たに出ないことを確認する（巡回先を数え上げない — life-editor なら `shared/src/sections.ts` の registry を読んで全 SectionId を回る。ここに一覧を書くとセクション追加のたびに取りこぼす）

## Gate P5: 視覚チェック

`browser_take_screenshot` を scratchpad（成果物として残す場合は `.claude/reports/`）へ保存し、以下を確認する:

- レイアウト崩れ / 要素のはみ出し / 重なり
- プロジェクトのデザイン規約違反（life-editor: `lumen-*` トークン外のハードコード色・主要 UI 背景の透明度）
- テーマ切替 UI があればライト / ダーク両方

## Verdict / Report Format

```
## Playwright Verify Report
- 対象: <変更概要> / 画面: <sections>
- Gate P0〜P5: それぞれ PASS / FAIL / SKIP(理由)
- Findings（FAIL のみ）: [P?] 画面 / 操作 / 期待 / 実際 / console 出力 / screenshot path
- 総合: PASS | BLOCKING（n 件）
```

## 制約・注意

- ブラウザ実体はセッションに 1 つ。**playwright を使うエージェントを同時に 2 体以上起動しない**（操作が混線する）。並列検証したい場合は画面単位で逐次実行する
- 検証中にコードを修正しない。BLOCKING findings はメインが修正してから再検証
- IME 入力・OS ネイティブ挙動（ショートカット・通知等）は Playwright で再現しきれない。疑わしい場合は「手動確認推奨」として報告する
- 自分が起動した dev server 以外は止めない（他の作業が使っている可能性がある）
