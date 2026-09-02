---
name: efficient-codebase-nav
description: Efficient codebase exploration for Claude Code. Use when starting work on any codebase task - especially after /clear, when spawning subagents, or when needing to understand project structure quickly. Also use when delegating tasks to subagents to minimize redundant exploration.
---

# Efficient Codebase Navigation

Spend context on the files the task needs, not on surveying the repo.

## Before exploring

- If the project has a navigation skill (`Glob(".claude/skills/*/SKILL.md")`), read it first. It already maps the structure.
- If `graphify-out/` exists, query the knowledge graph (`graphify` skill) before any Glob / Grep sweep. It answers "where does X live / what depends on X" without reading files.
- Otherwise read the manifest (`package.json` / `pyproject.toml` / `Cargo.toml`) and narrow with `Grep(..., output_mode="files_with_matches")` before reading contents. Read large files with `offset` / `limit`.

## Delegating to subagents

Subagents start with an empty context. Put in the prompt:

1. Project type and framework
2. The exact file paths for the subtask (find them first, then delegate)
3. A reference file that shows the pattern to follow
4. The verification command

Bad: "Add a login feature." Good: "Add a login feature. Next.js 14 App Router. Auth: src/lib/auth/. Follow src/app/signup/page.tsx. Verify with `npm run build`."

## After /clear

Re-read only the files the current task needs, and use `git diff --name-only HEAD~3` / `git log --oneline -5` instead of re-reading everything that changed.
