---
name: session-verifier
description: Pre-commit quality gate that actively runs verification tools and fixes issues after completing a section of work. Runs type checking, linting, tests, structural review, and bug pattern analysis on changed files. Use before /task-tracker to ensure code quality before committing. Triggers include "session-verifier", "verify", "quality check", "pre-commit check", "check my work", "品質チェック", "検証", "セッション検証".
---

MANDATORY FIRST ACTION: Output `<The session-verifier will launch>` before doing anything else.

# Session Verifier — Pre-commit Quality Gate

作業完了後、コミット前に品質を担保する能動的検証ゲート。
ツールを実行し、問題を修正し、必要ならテストを追加する。

**ワークフロー**: 作業完了 → `/session-verifier` → `/task-tracker`（commit & push）

## ワークフロー概要

```
Gate 0 (Scope) → Gate 1 (Types) → Gate 2 (Lint) → Gate 3 (Tests)
→ Gate 4 (Coverage) → Gate 5 (Structural) → Gate 6 (Bug Scan) → Verdict
```

各ゲート: チェック実行 → 合格? → 次へ : 修正 → 再実行 → 合格? → 次へ : BLOCKING報告
最大リトライ: 各ゲート2回。超過したら BLOCKING finding として記録し次のゲートへ進む。

## Gate 0: Scope Analysis

1. `git diff --name-only` と `git diff --cached --name-only` で変更ファイルを特定する
2. 変更をカテゴリ分類する（プロジェクト構造に合わせて適応）:
   - Frontend / Renderer
   - Backend / Native（Rust, Electron main, Node, etc.）
   - Database / Schema
   - IPC / API 境界
   - Tests (`*.test.*` / `*.spec.*`)
   - Config / Docs / Other
3. 変更ファイルリストを記録する — 以降のゲートはこのファイルのみを対象にする
4. 変更がない場合 → 「検証対象なし」と報告して終了

## Gate 1: TypeScript Compilation

1. コマンド検出: `package.json` の scripts から typecheck/tsc/build を探す
   - 見つからない場合: `npx tsc --noEmit`
2. コマンドを実行する
3. GATE: 型エラー 0件?
   - Yes → 次のゲートへ
   - No → 変更ファイル内のエラーのみ修正し再実行
   - 変更していないファイルのエラー → finding として記録、修正しない
4. 2回リトライしても失敗 → BLOCKING finding として記録

## Gate 2: Lint

1. コマンド検出: `package.json` の scripts から lint を探す
2. コマンドを実行する
3. GATE: 変更ファイルにlintエラー 0件?
   - Yes → 次のゲートへ
   - No → `--fix` オプションで自動修正を適用、残りは手動修正
4. 2回リトライしても失敗 → BLOCKING finding として記録

## Gate 3: Existing Tests

1. コマンド検出: `package.json` の scripts から test を探す
   - テストインフラがない場合 → スキップ
2. テストスイートを実行する
3. GATE: 全テスト合格?
   - Yes → 次のゲートへ
   - No → 失敗を分析:
     - 変更ファイルに対応するテストの失敗 → リグレッション、修正する
     - 無関係なテストの失敗 → finding として記録、修正しない
4. 2回リトライしても失敗 → BLOCKING finding として記録

## Gate 4: Test Coverage Analysis

1. 変更された各ソースファイル（テスト以外）に対応する `.test.ts` / `.test.tsx` が存在するか確認
2. テスト作成の優先順位:
   a. 新規ユーティリティ関数（純粋関数 — 最も価値が高く書きやすい）
   b. DataService 呼び出しを含む新規/変更フック
   c. ユーザー操作ロジックを持つ新規/変更コンポーネント
3. テストが必要なファイルに対して:
   - プロジェクトの test-writing スキル/パターンに従う
   - カバー対象: happy path、エッジケース、エラーハンドリング
   - 新規テストを実行して合格を確認
4. GATE: 新規テスト全て合格?
   - Yes → 次のゲートへ
   - No → テストを修正して再実行
5. テスト作成をスキップするファイル:
   - 型定義のみ（`*.d.ts`、interface のみの `*Value.ts`）
   - index/barrel ファイル
   - 設定ファイル
   - 単純なラッパー
6. **1回の verify で最大3ファイルまで**テストを作成する（コンテキスト節約）

## Gate 5: Structural Review

CLAUDE.md と `.claude/docs/vision/coding-principles.md` のプロジェクト固有ルールを適用する（必要に応じて読み込み）。
**変更ファイルに該当するチェックのみ実行する。**

### プロジェクト固有チェック（CLAUDE.md に記載されたルールを適用、該当ファイルが変更された場合のみ）:

CLAUDE.md の「Development Workflows」「Coding Standards」章に記載された項目を変更ファイル基準で確認する。一般的なチェック項目:

- **IPC 多点同期**: プロジェクトが定義する IPC 境界ファイルが変更 → 整合性を確認（CLAUDE.md の該当節参照）
- **DataService / Repository 層整合**: インターフェース変更時は実装・モックも更新されているか
- **Provider / Context 順序**: Context 関連ファイル変更時は依存順序を確認
- **Context Pattern A**: 新規 context → 3 ファイル構成確認（定められたパターンがある場合）
- **DB migration**: マイグレーションファイル変更時は IF NOT EXISTS / バージョンインクリメント確認
- **i18n**: 新規 UI テキスト → 全ロケールファイル追加確認

### 汎用チェック（全プロジェクト共通）:

- 新規 export が実際に使用されている
- `console.log` が本番コードに残っていない（テストファイルは許可）
- コメントアウトされたコードブロックがない
- 意味のある TODO/FIXME にはコンテキストが付記されている

GATE: 全チェック合格? → 問題があれば修正して再確認

## Gate 6: Bug Pattern Scan

変更コードを手動分析し、高リスクパターンを検出する:

### React:

- useEffect/useCallback の依存配列の欠落・古い参照
- レンダーパス内の setState（無限ループリスク）
- クリーンアップ/abort なしの非同期操作
- リスト内の key prop 欠落

### TypeScript:

- `as` 型アサーションが実際の型不一致を隠蔽
- オプショナルチェーンがバグを隠す（`a?.b?.c` が黙って undefined）
- `any` 型が具体的な型で置き換え可能

### State管理:

- 配列/オブジェクトの直接 mutation
- 並行非同期操作の競合状態

GATE: 高リスクパターンなし? → 問題があれば修正または finding として報告

## Verdict

全ゲート完了後、構造化された判定を出力する:

```
## Session Verification Result: [PASS / FAIL]

**Scope**: N files changed (カテゴリ一覧)

| Gate | Status | Notes |
|------|--------|-------|
| Types | ✅/❌ | 詳細 |
| Lint | ✅/❌ | 詳細 |
| Tests | ✅/❌/⏭️ | 詳細 |
| Coverage | ✅/❌ | N new tests written |
| Structural | ✅/❌/⏭️ | 詳細 |
| Bug Scan | ✅/❌ | 詳細 |

**Actions Taken**:
- (修正、テスト追加等のアクション一覧)

**Remaining Findings** (if any):
- [BLOCKING/IMPORTANT] 説明

**Recommendation**: Ready for /task-tracker / Fix remaining issues first
```

## ルール

- Gate 1-3（自動チェック）はスキップ不可。Gate 4-6 は軽微な変更（typo修正、コメントのみ）の場合に省略可
- 問題を報告するだけでなく、可能な限り実際に修正する
- 全分析を変更ファイルに限定する。コードベース全体をレビューしない
- 修正が新たな変更を生んだ場合、その変更もゲートを通す（ただし再帰は1段階まで）
- 各ゲート最大2回リトライ（無限ループ防止）
- Gate 4 では1回の verify で最大3テストファイルまで作成（コンテキスト節約）
- テストインフラがないプロジェクトでは Gate 3-4 をスキップ
- `package.json` からコマンドを検出する。npm scripts の存在を仮定しない
- プロジェクト固有ルールは CLAUDE.md と `.claude/docs/vision/coding-principles.md` から取得（スキル内にハードコードしない）
- 類似バグ遭遇時は `.claude/docs/known-issues/INDEX.md` を参照
