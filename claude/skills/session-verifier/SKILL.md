---
name: session-verifier
description: Pre-commit quality gate that actively runs verification tools and fixes issues after completing a section of work. Runs type checking, linting, tests, and project-specific consistency checks on changed files. Use before /task-tracker to ensure code quality before committing. Triggers include "session-verifier", "verify", "quality check", "pre-commit check", "check my work", "品質チェック", "検証", "セッション検証".
---

# Session Verifier — Pre-commit Quality Gate

作業完了後、コミット前に決定論的ツールを回して品質を確かめる。主務は 2 つ: **ツールの実行（Gate 1〜3）**と、**モデルが知りようがないプロジェクト固有規約の確認（Gate 5）**。汎用的なバグ検出・コード品質チェックは手順化しない（モデルが実装中に自律的に見る領域で、チェックリスト化すると過剰検証になる）。

```
Gate 0 (Scope) → Gate 1 (Types) → Gate 2 (Lint) → Gate 3 (Tests) → Gate 4 (Coverage) → Gate 5 (Project Rules) → Verdict
```

各ゲートは「実行 → 合格なら次へ / 不合格なら修正して再実行」。リトライは各ゲート 2 回まで。超えたら BLOCKING finding として記録して次へ進む。対象は常に変更ファイルだけ（`git diff --name-only` + `--cached`）。コマンドは `package.json` の scripts から検出し、無ければ既定（`npx tsc --noEmit` 等）。

## Gates

- **Gate 0 Scope** — 変更ファイルを列挙してカテゴリ分け（Frontend / Backend / DB / API 境界 / Tests / Config）。変更なしなら「検証対象なし」で終了。
- **Gate 1 Types** — 型エラー 0 件。変更ファイル内のエラーだけ修正。変更していないファイルのエラーは finding として記録し修正しない。
- **Gate 2 Lint** — 変更ファイルの lint エラー 0 件。`--fix` を先に当てる。`no-console` 等のデバッグ出力検出が lint 設定に無いプロジェクトでは、残ったデバッグ出力を 1 度だけ finding として報告し、lint ルール追加を提案する。
- **Gate 3 Tests** — 全テスト合格。変更に対応するテストの失敗はリグレッションとして修正、無関係な失敗は finding。テストインフラが無ければスキップ。
- **Gate 4 Coverage** — 変更した各ソース（型定義のみ / barrel / 設定 / 単純ラッパーを除く）に対応テストが無ければ書く。優先は 純粋関数 → データ層を呼ぶフック → 操作ロジックを持つコンポーネント。1 回の verify で最大 3 ファイルまで。
- **Gate 5 Project Rules** — CLAUDE.md と `.claude/docs/vision/coding-principles.md` に明文化された固有規約のうち、変更ファイルに関係する項目だけ確認する。多点同期（API 境界の送受信と型 / インターフェース変更と実装・モック / migration の IF NOT EXISTS とバージョン / 新規 UI テキストと全ロケール）と `.claude/docs/known-issues/INDEX.md` の既知パターンを見る。固有規約が無いプロジェクトではスキップ。

Gate 1〜3 はスキップ不可。Gate 4〜5 は軽微な変更（typo / コメントのみ）なら省略可。修正が新たな変更を生んだらその変更もゲートを通す（再帰は 1 段まで）。

## Verdict

```
## Session Verification Result: [PASS / FAIL]

**Scope**: N files changed (カテゴリ一覧)

| Gate | Status | Notes |
|------|--------|-------|
| Types | ✅/❌ | 詳細 |
| Lint | ✅/❌ | 詳細 |
| Tests | ✅/❌/⏭️ | 詳細 |
| Coverage | ✅/❌/⏭️ | N new tests written |
| Project Rules | ✅/❌/⏭️ | 詳細 |

**Actions Taken**: (修正、テスト追加等)
**Remaining Findings**: [BLOCKING/IMPORTANT] 説明
**Recommendation**: Ready for /task-tracker / Fix remaining issues first
```

⏭️ を使ったら理由を Notes に書く。この表がそのまま次工程（task-tracker / role-qa）の入力になるので、要約に丸めない。
