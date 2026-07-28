#!/usr/bin/env node
// graphify-nudge (UserPromptSubmit hook)
// 作業ディレクトリに graphify-out/graph.json があるときだけ、コード探索に
// graphify スキルを優先するよう一行注入する。グラフの無いリポジトリでは出力ゼロ。
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

let cwd = process.cwd();
try {
  const parsed = JSON.parse(readFileSync(0, "utf8")).cwd;
  if (typeof parsed === "string" && parsed) cwd = parsed;
} catch {
  /* no input */
}

const graphPath = join(cwd, "graphify-out", "graph.json");
if (existsSync(graphPath)) {
  let built = "";
  try {
    built = `、${statSync(graphPath).mtime.toISOString().slice(0, 10)} 生成`;
  } catch {
    /* 日付なしで注入 */
  }
  process.stdout.write(
    `[graphify] このリポジトリにはコードグラフ (graphify-out/graph.json${built}) がある。コードベースの構造・関係・所在に関する質問や探索は、Grep/Read での全文読みより先に graphify スキル (query / explain / path) を使うこと。生成日が古い場合は結果を裏取りする。\n`,
  );
}
process.exit(0);
