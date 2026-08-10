---
name: efficient-codebase-nav
description: Efficient codebase exploration and navigation strategies for Claude Code. Use this skill when starting work on any codebase task - especially after /clear, when spawning subagents, or when needing to understand project structure quickly. Triggers include file exploration, feature implementation, bug investigation, code reading, and any task requiring codebase context. Also use when delegating tasks to subagents to minimize redundant exploration.
---

# Efficient Codebase Navigation

Minimize exploration time and context consumption when working with codebases. Use Claude Code native tools (Glob, Grep, Read) instead of bash commands.

## First Action: Check for Project-Specific Skill

Before any exploration, check for a project-specific navigation skill:

```
Glob(".claude/skills/*/Skill.md")
```

If a project map skill exists, Read it first. It contains pre-analyzed structure that eliminates broad exploration.

If the repo has a `graphify-out/` directory, query the existing knowledge graph (`graphify` skill) before any Glob / Grep sweep — the graph already answers "where does X live / what depends on X" without spending context on exploration.

## Exploration Strategy: Priority-Based Discovery

Explore in this order. Stop as soon as sufficient context is gathered.

### Level 1: Project Identity (always do this)

Run these in parallel:

```
Read("package.json")        # or pyproject.toml, Cargo.toml, go.mod, Gemfile
Glob("src/**/*.{ts,tsx}", limit=40)   # Adjust extensions for project type
```

### Level 2: Entry Points and Config (do when modifying code)

Identify entry points based on project type:

- **Next.js/React**: `src/app/layout.tsx`, `src/app/page.tsx`, `next.config.*`
- **Express/Node**: `src/index.ts`, `src/app.ts`, `server.ts`
- **Python**: `main.py`, `app.py`, `__main__.py`
- **General**: Look for `main`, `index`, `app` in root or `src/`

Find config files:

```
Glob("**/*.config.{js,ts,mjs,cjs}", excludeDirs=["node_modules"])
Glob("**/tsconfig*.json")
```

### Level 3: Targeted File Discovery (do for specific tasks)

Do NOT read entire directories. Use targeted search:

```
# Find files containing a keyword (filenames only first)
Grep("keyword", glob="*.ts", output_mode="files_with_matches")

# Find function/class definitions
Grep("function targetName|class TargetName|def target_name", glob="*.{ts,tsx,py}", output_mode="content")

# Trace imports in a specific file
Grep("import.*from|require\\(", path="target-file.ts", output_mode="content")
```

**Key principle**: Use `files_with_matches` mode first to identify relevant files, then Read only those files.

### Level 4: Deep Dive (only when debugging or refactoring)

Read full file contents only for files directly relevant to the task. For large files, use offset and limit:

```
Read("large-file.ts", offset=50, limit=50)   # Read lines 50-100
```

## Subagent Delegation

When spawning subagents for parallel tasks, include:

1. **Project type and framework** (from Level 1)
2. **Specific file paths** relevant to the subtask (find them first, then delegate)
3. **Expected patterns** (naming conventions, directory layout)

Bad: "Add a login feature to the project"
Good: "Add a login feature. Next.js 14 App Router. Auth: src/lib/auth/. Pages: src/app/. Follow pattern in src/app/signup/page.tsx. Use src/lib/auth/session.ts."

## Post-/clear Recovery

After `/clear`, recover efficiently:

1. Check for project-specific skill (see above)
2. If no skill, run Level 1 + Level 2
3. Re-read only files needed for current task
4. Check recent changes instead of re-reading modified files:

```bash
git diff --name-only HEAD~3
git log --oneline -5
```

## Context Budget Rules

- Use Grep with `files_with_matches` before reading file contents
- Read at most 3-5 files in full before starting work
- For files >200 lines, use offset/limit to read relevant sections
- Use parallel tool calls to read multiple independent files at once
