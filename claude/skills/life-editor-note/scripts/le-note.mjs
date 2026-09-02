#!/usr/bin/env node
// le-note.mjs — life-editor に「レポートの控え」Note を残す。
// MCP が未登録のセッションでも動くよう、mcp-server を stdio で直接 spawn する。
//
//   node le-note.mjs --title "タイトル" --url https://claude.ai/code/artifact/... \
//        --path docs/reports/2026-09-02-x.html --kind 判断 \
//        --summary "1 行目" --summary "2 行目" [--tag 開発] [--pdf] [--dry-run]
//
// 必要な環境変数: LIFE_EDITOR_MCP_ENTRY, LIFE_EDITOR_SUPABASE_URL / _ANON_KEY / _EMAIL / _PASSWORD
// --pdf は --path の HTML を Edge のヘッドレス印刷で同名 .pdf にする（Windows の Edge 前提）。

import { spawn, spawnSync } from "node:child_process";
import { existsSync, statSync, mkdtempSync, rmSync, unlinkSync } from "node:fs";
import { resolve, basename, join } from "node:path";
import { tmpdir } from "node:os";

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.title) {
  console.log(usage());
  process.exit(args.help ? 0 : 1);
}

const entry = process.env.LIFE_EDITOR_MCP_ENTRY;
for (const k of ["LIFE_EDITOR_MCP_ENTRY", "LIFE_EDITOR_SUPABASE_URL", "LIFE_EDITOR_SUPABASE_ANON_KEY", "LIFE_EDITOR_SUPABASE_EMAIL", "LIFE_EDITOR_SUPABASE_PASSWORD"]) {
  if (!process.env[k]) fail(`環境変数 ${k} が未設定です（life-editor の .mcp.json と同じ値を User 環境変数に置く）`);
}
if (!existsSync(entry)) fail(`LIFE_EDITOR_MCP_ENTRY が指す dist/index.js がありません: ${entry}（mcp-server で npm run build）`);

const htmlPath = args.path ? resolve(args.path) : null;
let pdfPath = null;
if (args.pdf) {
  if (!htmlPath || !existsSync(htmlPath)) fail("--pdf には存在する --path（HTML）が必要です");
  pdfPath = htmlPath.replace(/\.html?$/i, "") + ".pdf";
  if (!args["dry-run"]) printPdf(htmlPath, pdfPath);
}

const today = new Date();
const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const kind = args.kind ?? "レポート";
const summary = [].concat(args.summary ?? []);
const tag = args.tag ?? "開発";

const structure = [
  { type: "callout", color: "blue", iconName: "FileText", text: `${kind} · ${stamp} · Claude Code が HTML で出した判断材料の控え。本文は URL から開く。` },
];
if (args.url) {
  structure.push({ type: "heading", level: 2, text: "URL" });
  structure.push({ type: "paragraph", text: args.url });
}
if (summary.length) {
  structure.push({ type: "heading", level: 2, text: "要点" });
  structure.push({ type: "bulletList", items: summary });
}
const places = [];
if (htmlPath) places.push(`HTML: ${htmlPath}`);
if (pdfPath) places.push(`PDF:  ${pdfPath}`);
if (places.length) {
  structure.push({ type: "heading", level: 2, text: "ファイルの置き場" });
  structure.push({ type: "codeBlock", language: "text", code: places.join("\n") });
}

if (args["dry-run"]) {
  console.log(JSON.stringify({ title: args.title, tag, structure }, null, 2));
  process.exit(0);
}

const client = await startMcp(entry);
try {
  // 同名 Note があれば日付を付けて別 Note にする（generate_content は上書きするため）
  const existing = await client.call("list_notes", { query: args.title, limit: 20 });
  const dup = (existing.notes ?? []).some((n) => n.title === args.title);
  const title = dup ? `${args.title}（${stamp}）` : args.title;

  const created = await client.call("generate_content", { target: "note", title, structure });
  const id = created.id;
  if (!id) fail(`Note の作成に失敗: ${JSON.stringify(created).slice(0, 300)}`);
  await client.call("tag_entity", { tag_name: tag, entity_id: id, entity_type: "note" });
  const back = await client.call("get_note", { id });
  console.log(`created note ${id} "${back.title ?? title}" tag=${tag}${pdfPath ? ` pdf=${pdfPath}` : ""}`);
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
  return `使い方: node le-note.mjs --title "タイトル" [--url URL] [--path report.html] [--kind 判断|進捗|検証|計画] [--summary "行" ...] [--tag 開発] [--pdf] [--dry-run]`;
}

function fail(msg) { console.error(`le-note: ${msg}`); process.exit(1); }

function printPdf(html, pdf) {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  const exe = candidates.find((p) => existsSync(p));
  if (!exe) fail("Edge / Chrome が見つからず PDF を作れません（--pdf を外して再実行）");
  // Edge の msedge.exe は起動直後に exit 0 で戻り、印刷は別プロセスが数秒後に終える（2026-09-02 実測）。
  // そのため終了コードは見ず、PDF が現れてサイズが落ち着くまで待つ。プロファイルは毎回使い捨て。
  try { unlinkSync(pdf); } catch {}
  const profile = mkdtempSync(join(tmpdir(), "le-note-edge-"));
  const r = spawnSync(exe, [
    "--headless=new", "--disable-gpu", "--no-first-run",
    `--user-data-dir=${profile}`,
    `--print-to-pdf=${pdf}`, "--print-to-pdf-no-header",
    "--virtual-time-budget=5000",
    `file:///${html.split("\\").join("/")}`,
  ], { stdio: "ignore", timeout: 60000 });
  if (r.error) fail(`Edge の起動に失敗しました: ${r.error.message}`);
  const deadline = Date.now() + 45000;
  let last = -1;
  while (Date.now() < deadline) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    if (!existsSync(pdf)) continue;
    const size = statSync(pdf).size;
    if (size > 0 && size === last) break;
    last = size;
  }
  if (!existsSync(pdf) || statSync(pdf).size === 0) fail("PDF が 45 秒待っても現れませんでした");
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 }); } catch {}
  console.log(`pdf ${basename(pdf)} ${statSync(pdf).size} bytes`);
}

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
