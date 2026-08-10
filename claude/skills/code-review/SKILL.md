---
name: code-review
description: Structured code review checklist and output format. Use when reviewing code changes, PRs, diffs, or when the user asks for feedback on code quality. Triggers include "review", "PR", "diff", "code quality", "security check", and any request to evaluate code for correctness, security, performance, or maintainability.
---

# Code Review

## Review Process

1. Read the full diff or changed files first
2. Understand the purpose of the change (commit message, PR description, or ask)
3. Apply the checklist below
4. Output findings in the standard format

## Checklist

### Correctness

- Logic errors, off-by-one, null/undefined handling
- Edge cases not covered
- Incorrect assumptions about data shape or types
- Missing error handling at system boundaries (user input, external APIs)

### Security

This is a **quick pass**. When the diff warrants a real audit (auth / authz, secrets, DB or IPC boundaries, user-supplied input reaching a sink), hand it to the `security-reviewer` agent instead of going deeper here.

- SQL injection, XSS, command injection (OWASP top 10)
- Exposed secrets, credentials, or API keys
- Insecure data handling (logging PII, unvalidated redirects)
- Missing authentication/authorization checks

### Performance

- N+1 queries, unnecessary re-renders
- Missing memoization for expensive computations
- Large bundle imports when smaller alternatives exist
- Unbounded data fetching without pagination

### Maintainability

- Unclear naming, magic numbers, dead code
- Missing types or overly broad types (`any`)
- Functions doing too many things (SRP violation)
- Duplicated logic that should be extracted

### TypeScript Specific

- `any` usage where specific types are possible
- Missing `null`/`undefined` checks with strict mode
- Incorrect generic constraints
- Type assertions (`as`) hiding real type issues

## Output Format

Categorize each finding as:

**Blocking** - Must fix before merge. Bugs, security issues, data loss risks.

**Important** - Should fix. Performance issues, maintainability concerns, missing edge cases.

**Suggestion** - Nice to have. Style improvements, alternative approaches, minor optimizations.

Format each finding as:

```
### [Blocking|Important|Suggestion] <brief title>

**File**: `path/to/file.ts:42`
**Issue**: Description of the problem
**Fix**: Suggested resolution
```

## Summary

End with a brief summary:

- Total findings count by category
- Overall assessment (approve, request changes, or needs discussion)
- Key risks if any blocking issues exist
