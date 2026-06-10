#!/usr/bin/env node
// Claude Code statusline — 3 grouped lines, vivid high-contrast colors.
// Cross-platform Node port of statusline-command.sh.
// Design goals (worktree-proof):
//   - never crash / never block: all git calls guarded + --no-optional-locks
//   - broken/stale worktree (dangling .git) degrades gracefully (branch just omitted)
//   - active task read from per-chat memory (memory/chat-<self>.md), legacy MEMORY.md fallback
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
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
const used = input.context_window?.used_percentage;
const costUsd = input.cost?.total_cost_usd;

// --- colors (bright foreground, no background, no bold) -----------------
const ESC = "\u001b";
const R = `${ESC}[0m`;
const C_HOST = `${ESC}[96m`; // bright cyan
const C_CWD = `${ESC}[94m`; // bright blue
const C_BR = `${ESC}[92m`; // bright green
const C_DIRTY = `${ESC}[91m`; // bright red
const C_COST = `${ESC}[95m`; // bright magenta
const C_SEP = `${ESC}[90m`; // gray (recedes)
const C_ARROW = `${ESC}[93m`; // bright yellow
const C_TASK = `${ESC}[97m`; // bright white

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

// user@hostname
const userName = (() => {
  try {
    return os.userInfo().username;
  } catch {
    return process.env.USER || process.env.USERNAME || "user";
  }
})();
const userHost = `${userName}@${os.hostname().split(".")[0]}`;

// cwd: shorten home to ~
const home = os.homedir();
let cwdDisplay = cwd;
if (cwd === home || cwd.startsWith(home + path.sep) || cwd.startsWith(home + "/")) {
  cwdDisplay = "~" + cwd.slice(home.length);
}

// --- git branch + dirty marker (broken worktree safe) -------------------
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

// --- context usage (color graded) --------------------------------------
let ctxRaw = "";
let C_CTX = `${ESC}[92m`;
if (used !== undefined && used !== null) {
  const ctxNum = Math.round(Number(used));
  if (Number.isFinite(ctxNum) && ctxNum >= 0) {
    ctxRaw = `ctx:${ctxNum}%`;
    if (ctxNum >= 80) C_CTX = `${ESC}[91m`; // red
    else if (ctxNum >= 50) C_CTX = `${ESC}[93m`; // yellow
    else C_CTX = `${ESC}[92m`; // green
  }
}

// --- session cost (USD) -------------------------------------------------
let costRaw = "";
if (costUsd !== undefined && costUsd !== null && Number.isFinite(Number(costUsd))) {
  costRaw = `$${Number(costUsd).toFixed(2)}`;
}

// --- active task from per-chat memory (legacy MEMORY.md fallback) -------
function parseActive(file) {
  // prints first real task under "## 進行中"
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return "";
  }
  let inSec = false;
  for (const raw of text.split(/\r?\n/)) {
    if (/^## 進行中/.test(raw)) {
      inSec = true;
      continue;
    }
    if (/^## /.test(raw) && inSec) break;
    if (!inSec) continue;
    let line = raw;
    if (/^\s*$/.test(line)) continue;
    if (/（なし）/.test(line) || /進行中タスクなし/.test(line) || /進行中.*なし/.test(line)) continue;
    line = line.replace(/^###\s*/, "");
    line = line.replace(/^[-*]\s*/, "");
    line = line.replace(/\*\*/g, "");
    line = line.replace(/`/g, "");
    return line;
  }
  return "";
}

let self = "";
try {
  self = readFileSync(path.join(cwd, ".claude/comm/.session-name"), "utf8")
    .split(/\r?\n/)[0]
    .replace(/\s/g, "");
} catch {
  /* no session name */
}

// Source priority: per-chat file is authoritative. Only fall back to legacy
// MEMORY.md when NO per-chat structure exists (so a frozen MEMORY.md never
// resurrects a stale task once the chat itself reports idle).
let taskSrc = "";
if (self && existsSync(path.join(cwd, `.claude/memory/chat-${self}.md`))) {
  taskSrc = path.join(cwd, `.claude/memory/chat-${self}.md`);
} else if (existsSync(path.join(cwd, ".claude/memory/INDEX.md"))) {
  taskSrc = path.join(cwd, ".claude/memory/INDEX.md"); // per-chat project, self unknown → aggregate
} else if (existsSync(path.join(cwd, ".claude/MEMORY.md"))) {
  taskSrc = path.join(cwd, ".claude/MEMORY.md"); // legacy project only
}

const activeTask = taskSrc ? parseActive(taskSrc) : "";

let taskPart;
if (activeTask) {
  // code-point safe truncation (never emit partial characters)
  const chars = Array.from(activeTask);
  const short = chars.length > 50 ? chars.slice(0, 49).join("") + "…" : activeTask;
  taskPart = `${C_ARROW}▶${R} ${C_TASK}${short}${R}`;
} else {
  // idle: keep the 3rd line present (gray) so the layout never collapses
  taskPart = `${C_SEP}▶ idle${R}`;
}

// --- assemble 3 grouped lines ------------------------------------------
// line 1: user@host  cwd
const line1 = `${C_HOST}${userHost}${R}  ${C_CWD}${cwdDisplay}${R}`;

// line 2: branch | ctx | cost  (join non-empty raw values with colored sep)
const sep = ` ${C_SEP}|${R} `;
let line2 = "";
if (branch) line2 = `${C_BR}${branch}${R}${C_DIRTY}${dirty}${R}`;
if (ctxRaw) line2 = (line2 ? line2 + sep : "") + `${C_CTX}${ctxRaw}${R}`;
if (costRaw) line2 = (line2 ? line2 + sep : "") + `${C_COST}${costRaw}${R}`;

// --- print (skip empty lines so no blank rows) -------------------------
let out = line1;
if (line2) out += `\n${line2}`;
out += `\n${taskPart}`;
process.stdout.write(out);
