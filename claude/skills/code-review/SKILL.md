---
name: code-review
description: Structured code review checklist and output format. Use when reviewing code changes, PRs, diffs, or when the user asks for feedback on code quality. Triggers include "review", "PR", "diff", "code quality", "security check", and any request to evaluate code for correctness, security, performance, or maintainability.
---

# Code Review

Read the full diff, understand the purpose (commit message / PR description), then report findings in the format below.

## Scope

- **Correctness**: logic errors, edge cases, wrong assumptions about data shape, missing error handling at system boundaries
- **Security** (quick pass only): injection, exposed secrets, unvalidated input reaching a sink, missing auth checks. When the diff touches auth / authz, secrets, DB or IPC boundaries, hand the deep audit to the `security-reviewer` agent instead of going further here.
- **Performance**: N+1, unnecessary re-renders, missing memoization on expensive work, unbounded fetching
- **Maintainability**: unclear naming, dead code, functions doing too much, duplicated logic, `any` / type assertions hiding real type issues

## Output

Categorize each finding:

- **Blocking** — must fix before merge (bugs, security, data loss)
- **Important** — should fix (performance, maintainability, missing edge cases)
- **Suggestion** — nice to have

```
### [Blocking|Important|Suggestion] <brief title>

**File**: `path/to/file.ts:42`
**Issue**: Description of the problem
**Fix**: Suggested resolution
```

End with the count per category, the overall assessment (approve / request changes / needs discussion), and key risks if any Blocking finding exists.
