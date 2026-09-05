#!/usr/bin/env node
// le-note.mjs — life-editor に「レポートの控え」Note を残す（URL・要点・HTML の置き場）。
// MCP が未登録のセッションでも動くよう、mcp-server を stdio で直接 spawn する。
//
//   node le-note.mjs --title "タイトル" --url https://claude.ai/code/artifact/... \
//        [--path docs/reports/2026-09-02-x.html] [--kind 判断|進捗|検証|計画] \
//        [--summary "1 行目" --summary "2 行目"] [--tag 開発] [--dry-run]
//
// 必要な環境変数: LIFE_EDITOR_MCP_ENTRY, LIFE_EDITOR_SUPABASE_URL / _ANON_KEY / _EMAIL / _PASSWORD
// 本文は Markdown で create_note に渡す（見出し・段落・箇条書きだけ）。generate_content の
// callout / table / codeBlock は画面側の編集器が知らず本文が空に見えたため使わない（2026-09-02 実測）。

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.title || !args.url) {
  console.log(usage());
  process.exit(args.help ? 0 : 1);
}

const entry = process.env.LIFE_EDITOR_MCP_ENTRY;
for (const k of ["LIFE_EDITOR_MCP_ENTRY", "LIFE_EDITOR_SUPABASE_URL", "LIFE_EDITOR_SUPABASE_ANON_KEY", "LIFE_EDITOR_SUPABASE_EMAIL", "LIFE_EDITOR_SUPABASE_PASSWORD"]) {
  if (!process.env[k]) fail(`環境変数 ${k} が未設定です（life-editor の .mcp.json と同じ値を User 環境変数に置く）`);
}
if (!existsSync(entry)) fail(`LIFE_EDITOR_MCP_ENTRY が指す dist/index.js がありません: ${entry}（mcp-server で npm run build）`);

const today = new Date();
const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const kind = args.kind ?? "レポート";
const summary = [].concat(args.summary ?? []);
const tag = args.tag ?? "開発";
const htmlPath = args.path ? resolve(args.path) : null;

const lines = ["## URL", "", args.url, ""];
if (summary.length) lines.push("## 要点", "", ...summary.map((s) => `- ${s}`), "");
if (htmlPath) lines.push("## ファイル", "", htmlPath, "");
lines.push(`${kind} · ${stamp} · Claude Code が HTML で出した判断材料の控え。本文は URL から開く。`);
const content = lines.join("\n");

if (args["dry-run"]) {
  console.log(`--- title: ${args.title} / tag: ${tag}\n${content}`);
  process.exit(0);
}

const client = await startMcp(entry);
try {
  // 同名 Note があれば日付を付けて別 Note にする（控えは上書きせず積む）
  const existing = await client.call("list_notes", { query: args.title, limit: 20 });
  const dup = (existing.notes ?? []).some((n) => n.title === args.title);
  const title = dup ? `${args.title}（${stamp}）` : args.title;

  const created = await client.call("create_note", { title, content });
  const id = created.id;
  if (!id) fail(`Note の作成に失敗: ${JSON.stringify(created).slice(0, 300)}`);
  await client.call("tag_entity", { tag_name: tag, entity_id: id, entity_type: "note" });
  const back = await client.call("get_note", { id });
  const ok = typeof back.content === "string" && back.content.includes(args.url);
  console.log(`created note ${id} "${back.title ?? title}" tag=${tag} url-in-body=${ok ? "yes" : "NO"}`);
  if (!ok) process.exit(2);
} finally {
  client.close();
}

// ---------------------------------------------------------------- helpers

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) { out[key] = true; continue; }
    if (key === "summary") { (out.summary ??= []).push(next); } else { out[key] = next; }
    i++;
  }
  return out;
}

function usage() {
  return `使い方: node le-note.mjs --title "タイトル" --url URL [--path report.html] [--kind 判断|進捗|検証|計画] [--summary "行" ...] [--tag 開発] [--dry-run]`;
}

function fail(msg) { console.error(`le-note: ${msg}`); process.exit(1); }

function startMcp(entryPath) {
  return new Promise((resolveClient, reject) => {
    const child = spawn("node", [entryPath], { stdio: ["pipe", "pipe", "inherit"], env: process.env });
    let buf = "";
    let nextId = 1;
    const pending = new Map();
    const send = (o) => child.stdin.write(JSON.stringify(o) + "\n");
    const request = (method, params) => new Promise((res, rej) => {
      const id = nextId++;
      pending.set(id, { res, rej });
      send({ jsonrpc: "2.0", id, method, params });
    });
    child.stdout.on("data", (d) => {
      buf += d.toString("utf8");
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        let msg; try { msg = JSON.parse(line); } catch { continue; }
        const p = pending.get(msg.id);
        if (!p) continue;
        pending.delete(msg.id);
        msg.error ? p.rej(new Error(msg.error.message ?? JSON.stringify(msg.error))) : p.res(msg.result);
      }
    });
    child.on("error", reject);
    const timer = setTimeout(() => { child.kill(); reject(new Error("MCP initialize timeout")); }, 60000);
    request("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "le-note", version: "1" } })
      .then(() => {
        clearTimeout(timer);
        send({ jsonrpc: "2.0", method: "notifications/initialized" });
        resolveClient({
          async call(name, params) {
            const r = await request("tools/call", { name, arguments: params });
            if (r.isError) throw new Error(`${name}: ${r.content?.[0]?.text ?? "error"}`);
            const text = r.content?.[0]?.text ?? "{}";
            try { return JSON.parse(text); } catch { return { text }; }
          },
          close() { child.kill(); },
        });
      })
      .catch((e) => { clearTimeout(timer); child.kill(); reject(e); });
  });
}
