#!/usr/bin/env node
// PreToolUse (Edit|Write|Read) hook: block access to secret-bearing files.
// Cross-platform replacement for the inline sh+jq one-liner.
import { readFileSync } from "node:fs";

let file = "";
try {
  file = JSON.parse(readFileSync(0, "utf8")).tool_input?.file_path || "";
} catch {
  /* no input */
}

const protectedPatterns = [".env", ".env.local", ".env.production", "credentials", "secrets"];
if (file && protectedPatterns.some((p) => file.includes(p))) {
  process.stderr.write(`BLOCKED: Access to protected file '${file}'\n`);
  process.exit(2);
}
process.exit(0);
