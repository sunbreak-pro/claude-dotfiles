# Plan Mode Quality Guidelines

## Plan Output Format

Plan mode の出力は次の節で構成:

1. **Title**: `# Plan: <title>`
2. **Context**: 動機 / 制約 / non-goals
3. **Steps**: `[ ]` チェックボックスの番号付きリスト（各ステップ 1 セッションで実行可能）
4. **Files**: 影響を受ける全ファイルを `File | Operation | Notes` 表で
5. **Verification**: 観測可能な test / 確認項目（チェックボックス付き）

## Plan Storage

- 保存先: **プロジェクトの** `.claude/docs/vision/plans/`（`~/.claude/plans/` でも `.claude/` 直下でもない。legacy `.claude/docs/feature_plans/` も検出された場合は移行を提案）
- ファイル名: `YYYY-MM-DD-<slug>.md`（slug: lowercase, hyphen, max 50 chars）
- メタヘッダ: Status / Created / Task（MEMORY.md リンク）/ Project path

## Workflow Chain

1. **Pre-Plan**: `/code-plan-editor` で既存プランをスキャン
2. **Plan**: Plan mode で詳細計画
3. **Post-Plan**: `/code-plan-editor` で変換 / 保存
4. **Track**: `/task-tracker` で MEMORY.md に登録（plan リンク付き）
5. **Implement**: チェックボックスを更新しつつ実装
6. **Complete**: `/task-tracker` で plan を archive、HISTORY.md 更新

## Quality Checks

- 各ステップは独立検証可能
- File list は網羅的（config / test / docs 含む）
- Verification は明確な pass/fail 信号
- Context は「なぜ」を説明（「何」ではない）
- Steps は依存順、独立ステップはグループ化
