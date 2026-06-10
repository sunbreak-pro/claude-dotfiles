#!/usr/bin/env node
// SessionStart / Stop hook: sui-memory recall|save のクロスプラットフォーム・ラッパー。
// バイナリが存在するマシン (Mac) でだけ実行し、無いマシン (Windows 等) では
// 静かに no-op する。パスは SUI_MEMORY_BIN 環境変数で上書き可能。
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const subcommand = process.argv[2]; // "recall" | "save"
if (!subcommand) process.exit(0);

const bin =
  process.env.SUI_MEMORY_BIN ||
  path.join(os.homedir(), "dev", "Claude", "sui-memory", "bin", "sui-memory");

if (!existsSync(bin)) process.exit(0); // この機械には sui-memory が無い → no-op

const result = spawnSync(bin, [subcommand], {
  stdio: "inherit", // hook stdin(JSON) をそのまま渡し、出力もそのまま返す
  timeout: subcommand === "save" ? 60000 : 30000,
});
process.exit(result.status ?? 0);
