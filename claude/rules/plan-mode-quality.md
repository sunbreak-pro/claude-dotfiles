---
paths:
  - "**/plans/**"
---

# Plan Mode Quality

> path-scoped rule: 計画書（`plans/` 配下）を書くときだけロードされる。

- 書式・保存先の正本は `skills/code-plan-editor/`（テンプレート = `references/plan-template.md`）。プロジェクトに `.claude/docs/vision/plans/_TEMPLATE.md` があればそちらが優先。
- Plan mode の出力をそのまま保存しない。Context / 検討した代替案 / Scope / Steps / Files / Verification の節構成に整えてから書く。
- プロジェクト側テンプレが Scope 宣言や Gate 列を必須にしているなら、それを省いた計画書は作らない。
