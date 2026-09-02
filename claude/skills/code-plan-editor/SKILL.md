---
name: code-plan-editor
description: 実装計画のライフサイクル管理。Plan mode の前（既存プラン走査）と後（出力を計画書ファイルへ整形）を担い、プロジェクトの plans/_TEMPLATE.md を優先して内蔵テンプレへ fallback する。Triggers include "計画を立てて", "計画書に落とす", "プランを書いて", "実装計画", "計画の続き", "plan mode を抜けた後", "implementation plan".
---

# code-plan-editor

Plan mode の前後を受け持つ。計画書は Markdown ファイルとして保存し、進捗を追い、完了時の archive は `task-tracker`（END フロー）に渡す。

## Path Resolution

- **Template**: プロジェクトに `.claude/docs/vision/plans/_TEMPLATE.md` があればそれが正（節構成 / Status 語彙 / Scope・Gate の必須項目に従う）。無ければ本スキルの `references/plan-template.md`。プロジェクトの `_TEMPLATE.md` を内蔵テンプレで上書きしない。
- **Plan dir**: `.claude/docs/vision/plans/`。無ければ作る。`.claude/` 直下には置かない。
- **Archive dir**: `.claude/archive/`。無ければ作る。

## Workflow

### 0. Pre-Plan（Plan mode に入る前）

1. plan dir の `IN PROGRESS` と archive の関連計画を走査し、既存があれば「再開するか新規か」を判断する（再開ならそれを読み Plan mode を省く）
2. task-tracker の memory で関連する進行中タスクを確認し、あれば新計画をそのタスクに紐づける
3. テンプレートの節構成（Context / 検討した代替案 / Scope / Steps / Files / Verification）を Plan mode の出力に含めるよう自分に課す

### 1. Post-Plan（Plan mode を抜けた後）

1. `~/.claude/plans/` の直近 5 分のファイル、無ければ会話中の計画内容を元にする
2. テンプレート節構成に変換する（見出し → `# Plan: <title>` / 動機 → Context / 手順 → Steps にチェックボックス / ファイル参照 → Files 表 / テスト → Verification）。欠けている節は補い、補った節を報告する
3. `<plan-dir>/YYYY-MM-DD-<slug>.md` に保存し（slug は小文字ハイフン 50 字以内）、パスを報告する
4. task-tracker への登録を提案する

### 2. 進捗更新

実装に応じて `[ ]` → `[x]`。実際に終えたものだけ更新する。全部終わったら task-tracker（END）へ渡す。archive・Status 更新・乖離レビューの記入は task-tracker の仕事で、本スキルは行わない。

## Rules

- 保存先は常にプロジェクトの `.claude/`。グローバル `~/.claude/` には書かない
- Plan mode の手順とファイル一覧は忠実に保つ（要約で落とさない）
- ファイル移動は `mv`（Bash）
