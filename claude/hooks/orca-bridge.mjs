#!/usr/bin/env node
// orca (ターミナルアプリ) の agent-hook ブリッジ。
// settings.json に OS 固有パスを焼き込まないため、実行時に platform を判定して
// ~/.orca/agent-hooks/claude-hook.{sh,cmd} を呼ぶ。orca が無いマシンでは no-op。
//
// 背景: orca は settings.json へ自分のフックを直接書き込む。その際 Mac なら
// /Users/<me>/.orca/.../claude-hook.sh、Windows なら C:/Users/<me>/.../claude-hook.cmd が
// 焼き込まれ、repo 経由で共有すると必ず相手 OS 側が空振りする。ここを経由して剥がす。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const isWin = process.platform === "win32";
const hook = path.join(
  os.homedir(),
  ".orca",
  "agent-hooks",
  isWin ? "claude-hook.cmd" : "claude-hook.sh"
);

let payload = "";
try {
  payload = fs.readFileSync(0, "utf8"); // fd 0 = stdin
} catch {
  /* stdin が閉じている呼び出し方もある */
}

try {
  if (payload && fs.existsSync(hook)) {
    const [cmd, args] = isWin
      ? [process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", hook]]
      : ["/bin/sh", [hook]];
    execFileSync(cmd, args, {
      input: payload,
      stdio: ["pipe", "ignore", "ignore"],
      timeout: 5000,
    });
  }
} catch {
  /* orca 側の失敗でセッションを壊さない */
}
process.exit(0);
