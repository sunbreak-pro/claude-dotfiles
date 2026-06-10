# Plan Template Reference

## Template Definition

```markdown
# Plan: <title>

- **Status**: in-progress | completed
- **Created**: YYYY-MM-DD
- **Task**: <MEMORY.md task name, if applicable>
- **Project**: <project path>
- **計画書**: <path to this file, for task-tracker linkage>

## Context

<Why this change is needed. Include:>
- Background / motivation
- Problem statement or user request
- Constraints or non-goals

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
| _(not in Plan mode)_                 | `**Status**`      | Set to `in-progress`                                 |
| _(not in Plan mode)_                 | `**Created**`     | Set to today's date                                  |
| _(not in Plan mode)_                 | `**Task**`        | Link to MEMORY.md task if applicable                 |
| _(not in Plan mode)_                 | `**Project**`     | Set to project root path                             |

### Handling Missing Sections

- **No Context**: Synthesize from the goal statement and steps
- **No Files list**: Extract file paths mentioned in steps
- **No Verification**: Generate basic verification items from the steps (e.g., "Confirm step N output is correct")
- **Deeply nested steps**: Flatten to max 2 levels (numbered + single bullet sub-detail)
