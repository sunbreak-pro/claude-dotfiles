---
name: code-plan-editor
description: 実装計画のライフサイクル管理。Plan mode の前（既存プラン走査）と後（出力を計画書ファイルへ整形）を担い、プロジェクトの plans/_TEMPLATE.md を優先して内蔵テンプレへ fallback する。Triggers include "計画を立てて", "計画書に落とす", "プランを書いて", "実装計画", "計画の続き", "plan mode を抜けた後", "implementation plan".
---

# Skill: code-plan-editor

## Description

Implementation plan lifecycle manager integrated with Plan mode. Provides Pre-Plan preparation (context injection, existing plan scan) and Post-Plan reconciliation (Plan mode output conversion, structured saving). Saves plans as Markdown files in the project's plan directory, tracks progress, and archives completed plans.

## Triggers

- User mentions: "plan", "計画", "設計", "implementation plan", "実装計画"
- Before entering Plan mode (Pre-Plan preparation)
- After exiting Plan mode with an approved plan (Post-Plan reconciliation)
- When user asks to check or resume existing plans

## Path Resolution

### Template (which plan format to use)

1. Project has `.claude/docs/vision/plans/_TEMPLATE.md` → **that file is authoritative** for this project (read it and follow its sections / Status vocabulary / Scope and Gate requirements)
2. Otherwise → fall back to the built-in `references/plan-template.md`

Never overwrite a project's `_TEMPLATE.md` with the built-in one.

### Plan Directory (saving new plans)

Check in order; use the first match:

1. `.claude/docs/vision/plans/` exists → use it (current convention)
2. `.claude/docs/vision/` exists → create `.claude/docs/vision/plans/` and use it
3. `.claude/docs/feature_plans/` exists → use it (legacy)
4. `.claude/docs/` exists → create `.claude/docs/vision/plans/` and use it
5. Neither exists → create `.claude/feature_plans/` and use it (legacy fallback)

Never save plans directly under `.claude/` (causes file scatter).

### Archive Directory (completing plans)

Check in order; use the first match:

1. `.claude/archive/` exists → use it (current convention, matches task-tracker)
2. `.claude/docs/archive/` exists → use it (legacy)
3. `.claude/history/` exists → use it (legacy)
4. Neither exists → create `.claude/archive/` and use it

## Workflow

### 0. Pre-Plan Preparation

Run **before** entering Plan mode to set context and avoid duplicate work.

1. **Scan existing plans**:
   - Check `<plan-dir>/*.md` for any `IN PROGRESS` plans
   - Check `<archive-dir>/*.md` for recently completed related plans
   - If in-progress plans exist, list them with titles and ask:
     - Resume an existing plan? → Load it and skip Plan mode
     - Start a new plan? → Continue to Plan mode
   - If no plans exist, report "既存の計画書はありません" and continue

2. **Check MEMORY.md**:
   - Read the project's `MEMORY.md` (if it exists)
   - Look for in-progress tasks that relate to the current request
   - If found, suggest linking the new plan to the existing task

3. **Inject template context**:
   - Read `references/plan-template.md` from this skill's directory
   - Summarize the template structure to the user so Plan mode output aligns
   - Advise: "Plan mode では以下のセクションを含めてください: Context, 検討した代替案 (表), Scope (触ってよいパス), Steps (チェックボックス付き), Files (テーブル形式), Verification"

4. **Suggest related past plans**:
   - If archive contains plans touching similar files or topics, mention them as reference

**Output**: Context summary → user enters Plan mode (`/plan`)

### 1. Creating a Plan

When a plan is approved (e.g., after Plan mode or explicit user request):

1. Determine the project root (nearest git root or cwd)
2. Resolve the plan directory using Path Resolution above
3. Save the plan as `<plan-dir>/YYYY-MM-DD-<slug>.md` using the template (see `references/plan-template.md`)
4. Confirm the file path to the user

### 1.5. Post-Plan Reconciliation

Run **after** exiting Plan mode to capture and convert the plan output.

1. **Detect Plan mode output**:
   - Check `~/.claude/plans/` for files modified in the last 5 minutes
   - If found, read the most recent file as the source plan
   - If not found, use the plan content from the current conversation context

2. **Convert to template format**:
   - Apply the conversion mapping from `references/plan-template.md`
   - Map Plan mode sections → template sections:
     - Title/goal → `# Plan: <title>`
     - Problem/motivation → `## Context`
     - Implementation steps → `## Steps` (add `[ ]` checkboxes, flatten nesting)
     - File references → `## Files` (table format with operation type)
     - Testing notes → `## Verification` (add `[ ]` checkboxes)
   - Add metadata: Status (`IN PROGRESS`), Created (today), Task, Project

3. **Fill missing sections**:
   - No Context → synthesize from goal statement and steps
   - No Files list → extract file paths mentioned in steps
   - No Verification → generate basic items from steps
   - Report any sections that were auto-generated

4. **Save the plan**:
   - Save to `<plan-dir>/YYYY-MM-DD-<slug>.md`
   - Confirm the file path and a brief summary of what was converted

5. **Suggest next steps**:
   - Propose: "`/task-tracker` で MEMORY.md にタスクを登録しますか？"
   - Include the plan file path for task-tracker linkage

### 2. Resuming Work

At session start or when user asks about existing plans:

1. Check the plan directory (resolve using Path Resolution) for any `.md` files
2. If found, list them with status and ask the user which to continue
3. Load the selected plan and show remaining steps

### 3. Updating Progress

As steps are completed during implementation:

1. Update the checkbox (`[ ]` -> `[x]`) in the plan file
2. If all steps are complete, prompt the user to mark the plan as completed

### 4. Completing a Plan

**Executor = `task-tracker` (END flow).** This skill does not archive plans itself — it only reads plan state. When all steps are done, hand off to `/task-tracker`, which updates the Status, writes the divergence review into the plan's Worklog, and moves the file to the archive directory.

## Rules

- Always use the project's `.claude/` directory, never the global `~/.claude/`
- Slug should be lowercase, hyphen-separated, derived from the plan title (max 50 chars)
- When creating a plan from Plan mode output, preserve all steps and file lists faithfully
- Do not auto-complete steps — only mark as done after actual implementation
- Archiving a completed plan is `task-tracker`'s job (END flow) — this skill only proposes the handoff
- The **Task** field links the plan to a MEMORY.md task entry; leave blank if no task association
- Use `mv` (Bash) to move files between directories, not Edit
- **Pre-Plan は Plan mode の前に実行すること**（既存計画の重複防止とコンテキスト注入のため）
- Pre-Plan をスキップしても、Post-Plan で Plan mode 出力を救済・変換できる
- テンプレート定義は `references/plan-template.md` を正とする — 変換ロジックもそこに記載
- Post-Plan で `/task-tracker` への連携を必ず提案すること
