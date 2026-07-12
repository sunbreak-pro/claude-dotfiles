#!/usr/bin/env node
// Claude Code statusline — 3 grouped lines, vivid high-contrast colors.
// Cross-platform Node port of statusline-command.sh.
//   line 1: usage bars   — context % + rate limits (5h / 7d)
//   line 2: model info   — display name + reasoning effort level
//   line 3: location     — cwd + git branch (+dirty) + worktree name
// Design goals (worktree-proof):
//   - never crash / never block: all git calls guarded + --no-optional-locks
//   - broken/stale worktree (dangling .git) degrades gracefully (branch just omitted)
//   - conditional JSON fields (rate_limits, effort, worktree) omitted, never "undefined"
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

let input = {};
try {
  input = JSON.parse(readStdin());
} catch {
  /* keep defaults */
}

const cwd =
  input.cwd || input.workspace?.current_dir || process.cwd();

// --- colors (bright foreground, no background, no bold) -----------------
const ESC = String.fromCharCode(27); // 0x1b ANSI escape
const R = `${ESC}[0m`;
const C_GREEN = `${ESC}[92m`;
const C_YELLOW = `${ESC}[93m`;
const C_RED = `${ESC}[91m`;
const C_CWD = `${ESC}[94m`; // bright blue
const C_BR = `${ESC}[92m`; // bright green
const C_DIRTY = `${ESC}[91m`; // bright red
const C_MODEL = `${ESC}[96m`; // bright cyan
const C_EFFORT = `${ESC}[95m`; // bright magenta
const C_WT = `${ESC}[93m`; // bright yellow
const C_SEP = `${ESC}[90m`; // gray (recedes)
const C_DIM = `${ESC}[90m`; // gray (unknown values)

const sep = ` ${C_SEP}|${R} `;

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    }).trim();
  } catch {
    return "";
  }
}

// --- line 1: usage bars (context + rate limits) --------------------------
const BAR_WIDTH = 10;

function gradeColor(pct) {
  if (pct >= 80) return C_RED;
  if (pct >= 50) return C_YELLOW;
  return C_GREEN;
}

// label + colored bar + percentage; null/invalid pct → gray empty bar
function usageSegment(label, pct) {
  const n = Number(pct);
  if (pct === undefined || pct === null || !Number.isFinite(n) || n < 0) {
    return `${C_DIM}${label} ${"░".repeat(BAR_WIDTH)} –${R}`;
  }
  // round first so the shown %, the bar, and the color grade always agree
  const shown = Math.round(Math.min(100, n));
  const filled = Math.round((shown / 100) * BAR_WIDTH);
  const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
  const color = gradeColor(shown);
  return `${C_SEP}${label}${R} ${color}${bar} ${shown}%${R}`;
}

const segments = [usageSegment("ctx", input.context_window?.used_percentage)];
// rate_limits only exists for Claude.ai subscribers after the first response
const fiveHour = input.rate_limits?.five_hour?.used_percentage;
const sevenDay = input.rate_limits?.seven_day?.used_percentage;
if (fiveHour !== undefined && fiveHour !== null) {
  segments.push(usageSegment("5h", fiveHour));
}
if (sevenDay !== undefined && sevenDay !== null) {
  segments.push(usageSegment("7d", sevenDay));
}
const line1 = segments.join(sep);

// --- line 2: model + effort level ----------------------------------------
let line2 = "";
const modelName = input.model?.display_name || input.model?.id || "";
if (modelName) line2 = `${C_MODEL}${modelName}${R}`;
const effort = input.effort?.level;
if (effort) {
  line2 = (line2 ? line2 + sep : "") + `${C_EFFORT}effort:${effort}${R}`;
}

// --- line 3: cwd + branch + worktree --------------------------------------
// cwd: shorten home to ~
const home = os.homedir();
let cwdDisplay = cwd;
if (cwd === home || cwd.startsWith(home + path.sep) || cwd.startsWith(home + "/")) {
  cwdDisplay = "~" + cwd.slice(home.length);
}

// git branch + dirty marker (broken worktree safe)
let branch = "";
let dirty = "";
if (git(["rev-parse", "--git-dir"])) {
  branch =
    git(["symbolic-ref", "--short", "HEAD"]) ||
    git(["rev-parse", "--short", "HEAD"]);
  if (branch) {
    // --no-optional-locks: don't wait on / create index.lock (parallel chats)
    const status = git(["--no-optional-locks", "status", "--porcelain"]);
    if (status) dirty = "*";
  }
}

// worktree name: --worktree session first, then linked git worktree
const worktree = input.worktree?.name || input.workspace?.git_worktree || "";

let line3 = `${C_CWD}${cwdDisplay}${R}`;
if (branch) line3 += sep + `${C_BR}${branch}${R}${C_DIRTY}${dirty}${R}`;
if (worktree) line3 += sep + `${C_WT}wt:${worktree}${R}`;

// --- print (skip empty lines so no blank rows) ----------------------------
const out = [line1, line2, line3].filter(Boolean).join("\n");
process.stdout.write(out);
