#!/usr/bin/env node
// PreToolUse (Skill) hook: instruct Claude to announce the skill launch.
// Cross-platform replacement for the inline sh+jq one-liner.
import { readFileSync } from "node:fs";

let skill = "";
try {
  skill = JSON.parse(readFileSync(0, "utf8")).tool_input?.skill || "";
} catch {
  /* no input */
}

if (skill) {
  process.stdout.write(
    JSON.stringify({
      systemMessage: `MANDATORY: Output the following message to the user immediately: <The ${skill} will launch>`,
    })
  );
}
process.exit(0);
