---
paths:
  - "**/plans/**"
---

# Plan Mode Quality Guidelines

> path-scoped rule: 計画書（`plans/` 配下）を保存・編集する時のみ自動ロードされる。plan mode の構想段階（ファイル未保存）では出ないため、計画を書き出す直前に効く想定。

**書式・保存先・ワークフローチェーンの正本 = `skills/code-plan-editor/`**（テンプレート定義 = `references/plan-template.md` / 保存先の解決 = SKILL.md §Path Resolution / archive の実行者 = `task-tracker`）。**プロジェクトに `.claude/docs/vision/plans/_TEMPLATE.md` があれば、そちらがそのプロジェクトの正**（グローバルの内蔵テンプレは fallback）。

この rule 固有の注意はこれだけ:

- Plan mode の出力をそのまま保存しない。必ず上記テンプレートの節構成（Context / 検討した代替案 / Scope / Steps / Files / Verification）に整えてから書き出す。
- プロジェクト側テンプレが Scope 宣言や Gate 列を必須にしている場合、それを省いた計画書は作らない（Plan Gate をすり抜ける経路になる）。
