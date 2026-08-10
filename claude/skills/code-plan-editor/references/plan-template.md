# Plan Template Reference

> This is the **fallback** template. If the project has `.claude/docs/vision/plans/_TEMPLATE.md`, that file wins (see SKILL.md §Path Resolution → Template).

## Template Definition

```markdown
# Plan: <title>

- **Status**: Draft | IN PROGRESS | BLOCKED | COMPLETED | SUPERSEDED | DEFERRED
- **Created**: YYYY-MM-DD
- **Task**: <MEMORY.md task name, if applicable>
- **Project**: <project path>
- **計画書**: <path to this file, for task-tracker linkage>

## Context

<Why this change is needed. Include:>
- Background / motivation
- Problem statement or user request
- Constraints or non-goals

## 検討した代替案

| 案     | 採否 | 却下理由         | 復活条件                   |
| ------ | ---- | ---------------- | -------------------------- |
| <案 A> | ✓    | —                | —                          |
| <案 B> | ✗    | <なぜ採らないか> | <どうなったら再検討するか> |

## Scope (Touchable Paths)

- 触ってよい: <path/or/dir/that/may/be/edited>
- 触らない: <explicitly out-of-bounds paths>

## Steps

1. [ ] Step 1: <description>
   - Sub-detail if needed
2. [ ] Step 2: <description>

## Files

| File              | Operation          | Notes              |
| ----------------- | ------------------ | ------------------ |
| `path/to/file.ts` | create/edit/delete | Summary of changes |

## Verification

- [ ] Test method 1
- [ ] Test method 2
- [ ] Edge case confirmation
```

## Section Writing Guide

### Context

- **Must answer**: Why is this change needed? What problem does it solve?
- **Include**: Background, constraints, non-goals, related past work
- **Avoid**: Implementation details (those go in Steps)

### 検討した代替案

- **Must list at least 2 options** including the adopted one, each with why it was (not) taken
- **復活条件 (revival condition)**: what would have to change for a rejected option to be reconsidered. This turns mid-implementation second-guessing into a yes/no check instead of a fresh debate
- If `ask-user` was used, transcribe the presented options and the user's answer here — otherwise the rejected options evaporate

### Scope (Touchable Paths)

- List the paths that may be edited, and explicitly the ones that must not be
- Anything outside this list is out of bounds: do not implement it, queue it for the user (see the project's decision queue / issue tracker) and continue the current plan
- Do not edit the Scope or Verification sections to legitimize a change you already want to make — that requires a user answer first

### Steps

- **Granularity**: Each step should be completable in one focused session (15-60 min)
- **Order**: Dependencies first, independent steps grouped together
- **Checkboxes**: `[ ]` for pending, `[x]` for completed — update during implementation
- **Numbering**: Use sequential numbers, not nested sub-steps beyond one level

### Files

- **Operation types**: `create` (new file), `edit` (modify existing), `delete` (remove), `rename` (move/rename)
- **Size hints**: S (< 30 lines changed), M (30-100), L (100+) — helps estimate effort
- **Completeness**: List ALL files that will be touched, even config files

### Verification

- **Concrete**: "Run `npm test` and confirm all pass" not "Make sure tests work"
- **Observable**: Each item should have a clear pass/fail signal
- **Edge cases**: Include at least one non-happy-path verification

## Plan Mode Output → Template Conversion Mapping

When converting Plan mode output to the template format:

| Plan Mode Section                    | Template Section  | Conversion Notes                                     |
| ------------------------------------ | ----------------- | ---------------------------------------------------- |
| Title / goal statement               | `# Plan: <title>` | Extract concise title from the first heading or goal |
| Problem description / motivation     | `## Context`      | Combine "why" sections; add constraints if mentioned |
| Numbered steps / implementation plan | `## Steps`        | Add `[ ]` checkboxes; flatten deeply nested steps    |
| File list / "files to modify"        | `## Files`        | Convert to table format with operation type          |
| Testing / verification notes         | `## Verification` | Add `[ ]` checkboxes; make each item concrete        |
| _(not in Plan mode)_                 | `**Status**`      | Set to `IN PROGRESS`                                 |
| _(not in Plan mode)_                 | `**Created**`     | Set to today's date                                  |
| _(not in Plan mode)_                 | `**Task**`        | Link to MEMORY.md task if applicable                 |
| _(not in Plan mode)_                 | `**Project**`     | Set to project root path                             |

### Handling Missing Sections

- **No Context**: Synthesize from the goal statement and steps
- **No 検討した代替案**: Do not fabricate. Record the adopted approach plus any option visibly rejected in the conversation, and flag the section as needing the user's input
- **No Scope**: Derive the touchable paths from the Files list and state explicitly what is out of bounds
- **No Files list**: Extract file paths mentioned in steps
- **No Verification**: Generate basic verification items from the steps (e.g., "Confirm step N output is correct")
- **Deeply nested steps**: Flatten to max 2 levels (numbered + single bullet sub-detail)
