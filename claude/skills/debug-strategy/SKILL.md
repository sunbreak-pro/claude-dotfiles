---
name: debug-strategy
description: Systematic debugging methodology for identifying and fixing bugs. Use when investigating errors, unexpected behavior, failing tests, or any debugging task. Triggers include bug reports, error messages, stack traces, test failures, performance issues, and requests to diagnose problems in React, TypeScript, Node.js, or Electron applications.
---

MANDATORY FIRST ACTION: Output `<The debug-strategy will launch>` before doing anything else.

# Debug Strategy

Systematic approach: Reproduce, Trace, Isolate, Fix.

## Step 1: Reproduce

Before any code investigation:

- Clarify exact reproduction steps with the user
- Identify expected vs actual behavior
- Note environment conditions (browser, OS, Node version)
- Check if the issue is consistent or intermittent

## Step 2: Trace

Use Claude Code tools to trace the issue:

```
# Find error messages in codebase
Grep("ErrorMessageText", output_mode="content", -C=3)

# Find the function/component involved
Grep("functionName|ComponentName", output_mode="files_with_matches")

# Read the relevant file
Read("path/to/file.ts")

# Check recent changes to the file
git log --oneline -10 -- path/to/file.ts
git diff HEAD~5 -- path/to/file.ts
```

Work backward from the error:

1. Find where the error is thrown/logged
2. Trace the call chain upward
3. Identify the data flow that leads to the error state

## Step 3: Isolate

Narrow down the root cause:

- Binary search: comment out half the code, see if issue persists
- Check inputs/outputs at each step in the chain
- Compare working vs broken state (git bisect for regressions)
- Look for recent changes: `git log --oneline -20 -- <file>`

## Step 4: Fix

- Fix the root cause, not symptoms
- Verify the fix resolves the original reproduction case
- Check for similar patterns elsewhere in the codebase
- Run existing tests to confirm no regressions

## Common Bug Patterns

### React

- Stale closures in useEffect/useCallback (missing dependencies)
- Infinite re-render loops (setState in render path or unstable deps)
- Key prop issues causing unexpected unmount/remount
- Race conditions in async useEffect without cleanup
- State updates on unmounted components

### TypeScript

- Type narrowing lost after async operations
- Optional chaining masking undefined errors (`a?.b?.c` silently returns undefined)
- Incorrect type assertions (`as`) hiding real type mismatches
- Enum comparison issues (string vs numeric enums)

### Node.js / Electron

- Unhandled promise rejections
- Event listener memory leaks (missing removeListener)
- IPC message serialization issues (functions, circular refs)
- Path handling differences between main/renderer processes
- File system race conditions (read/write ordering)

## Debugging with Logs

When source analysis is insufficient:

1. Add targeted `console.log` with descriptive labels
2. Log input/output at function boundaries
3. Log state transitions
4. Run the reproduction case
5. Read logs to identify where behavior diverges from expectation
6. Remove debug logs after fixing
