#!/usr/bin/env node
// PostToolUse (Edit|Write) hook: run prettier on the edited file.
// Cross-platform replacement for the inline sh+jq one-liner.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

let file = "";
try {
  file = JSON.parse(readFileSync(0, "utf8")).tool_input?.file_path || "";
} catch {
  /* no input */
}

if (file && /\.(ts|tsx|js|jsx|css|json|md)$/.test(file)) {
  try {
    // JSON.stringify quotes the path safely for both sh and cmd.exe
    execSync(`npx prettier --write ${JSON.stringify(file)}`, {
      stdio: "ignore",
      timeout: 30000,
    });
  } catch {
    /* prettier unavailable or parse error — never block the edit */
  }
}
process.exit(0);
