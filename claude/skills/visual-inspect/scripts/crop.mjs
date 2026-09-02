#!/usr/bin/env node
// crop.mjs — 画像を「切り抜いて拡大する」だけの 1 ツール。
// Fable が Read で全体像を見る → 気になる領域を切り抜く → 拡大して Read → 確かめる、を繰り返すための道具。
//
//   node crop.mjs <image> --grid [CxR]                 座標格子つき全体図を出す(既定 6x4・セル名 A1..)
//   node crop.mjs <image> --cell B3 [--zoom 3]         格子セルを切り抜いて拡大(--grid と同じ分割で解釈)
//   node crop.mjs <image> --region x,y,w,h [--zoom 3]  ピクセル指定で切り抜き
//   node crop.mjs <image> --info                       幅・高さ・形式だけ表示
//   共通: --out <path>(既定: <image>.<tag>.png) / --pad 0.1(セル周囲に 10% の余白)
// 出力は常に PNG。標準出力に書き出し先パスと座標を 1 行で返す。
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    // 初回だけ自分の隣に sharp を入れる(グローバル汚染なし)
    process.stderr.write("[crop] sharp が無いので scripts/ に npm install します(初回のみ)\n");
    execSync("npm install --no-audit --no-fund --loglevel=error", { cwd: here, stdio: "inherit" });
    const modPath = path.join(here, "node_modules", "sharp", "lib", "index.js");
    return (await import(pathToFileURL(modPath).href)).default;
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else {
        args[key] = next;
        i++;
      }
    } else args._.push(a);
  }
  return args;
}

function usage(msg) {
  if (msg) process.stderr.write(`[crop] ${msg}\n`);
  process.stderr.write(
    "usage: crop.mjs <image> (--grid [CxR] | --cell A1 | --region x,y,w,h | --info) [--zoom N] [--pad F] [--out path]\n",
  );
  process.exit(1);
}

function gridDims(spec) {
  const m = /^(\d+)x(\d+)$/i.exec(typeof spec === "string" ? spec : "6x4");
  if (!m) usage(`--grid は CxR 形式で指定 (例: 6x4)。受け取った値: ${spec}`);
  return { cols: Number(m[1]), rows: Number(m[2]) };
}

function cellToRegion(cell, cols, rows, W, H, pad) {
  const m = /^([A-Z]+)(\d+)$/i.exec(cell);
  if (!m) usage(`--cell は A1 のような形式 (列アルファベット + 行番号)。受け取った値: ${cell}`);
  const col = m[1].toUpperCase().charCodeAt(0) - 65;
  const row = Number(m[2]) - 1;
  if (col < 0 || col >= cols || row < 0 || row >= rows) usage(`セル ${cell} は ${cols}x${rows} の格子の外`);
  const cw = W / cols;
  const ch = H / rows;
  const px = cw * pad;
  const py = ch * pad;
  const x = Math.max(0, Math.round(col * cw - px));
  const y = Math.max(0, Math.round(row * ch - py));
  const w = Math.min(W - x, Math.round(cw + 2 * px));
  const h = Math.min(H - y, Math.round(ch + 2 * py));
  return { x, y, w, h };
}

function gridSvg(W, H, cols, rows) {
  const cw = W / cols;
  const ch = H / rows;
  const fs = Math.max(12, Math.round(Math.min(cw, ch) / 6));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  for (let c = 1; c < cols; c++)
    s += `<line x1="${c * cw}" y1="0" x2="${c * cw}" y2="${H}" stroke="#ff00ff" stroke-width="2" stroke-dasharray="8 6"/>`;
  for (let r = 1; r < rows; r++)
    s += `<line x1="0" y1="${r * ch}" x2="${W}" y2="${r * ch}" stroke="#ff00ff" stroke-width="2" stroke-dasharray="8 6"/>`;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const label = `${String.fromCharCode(65 + c)}${r + 1}`;
      const x = c * cw + 4;
      const y = r * ch + fs + 2;
      s += `<rect x="${x - 2}" y="${y - fs}" width="${fs * 1.6}" height="${fs + 4}" fill="#ff00ff" opacity="0.85"/>`;
      s += `<text x="${x}" y="${y}" font-family="monospace" font-size="${fs}" font-weight="bold" fill="#ffffff">${label}</text>`;
    }
  return Buffer.from(s + "</svg>");
}

const args = parseArgs(process.argv.slice(2));
const input = args._[0];
if (!input) usage();
if (!existsSync(input)) usage(`ファイルが無い: ${input}`);

const sharp = await loadSharp();
const meta = await sharp(input).metadata();
const W = meta.width;
const H = meta.height;
const base = input.replace(/\.[^.]+$/, "");
const zoom = args.zoom ? Number(args.zoom) : 3;
const pad = args.pad ? Number(args.pad) : 0.1;

if (args.info) {
  process.stdout.write(`${input} ${W}x${H} ${meta.format}\n`);
  process.exit(0);
}

if (args.grid !== undefined && !args.cell) {
  const { cols, rows } = gridDims(args.grid);
  const out = args.out || `${base}.grid.png`;
  await sharp(input)
    .composite([{ input: gridSvg(W, H, cols, rows), top: 0, left: 0 }])
    .png()
    .toFile(out);
  process.stdout.write(`${out} grid=${cols}x${rows} size=${W}x${H} (cell を選んだら --cell <名前> --grid ${cols}x${rows})\n`);
  process.exit(0);
}

let region;
let tag;
if (args.cell) {
  const { cols, rows } = gridDims(args.grid);
  region = cellToRegion(String(args.cell), cols, rows, W, H, pad);
  tag = String(args.cell).toUpperCase();
} else if (args.region) {
  const nums = String(args.region).split(",").map(Number);
  if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) usage("--region は x,y,w,h の 4 数");
  const [x, y, w, h] = nums;
  region = {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y)),
    w: Math.min(W - Math.round(x), Math.round(w)),
    h: Math.min(H - Math.round(y), Math.round(h)),
  };
  tag = `${region.x}_${region.y}_${region.w}x${region.h}`;
} else usage("--grid / --cell / --region / --info のどれかを指定");

if (region.w <= 0 || region.h <= 0) usage("切り抜き領域が画像の外");
const out = args.out || `${base}.${tag}.png`;
await sharp(input)
  .extract({ left: region.x, top: region.y, width: region.w, height: region.h })
  .resize({ width: Math.round(region.w * zoom), kernel: "lanczos3" })
  .png()
  .toFile(out);
process.stdout.write(
  `${out} region=${region.x},${region.y},${region.w},${region.h} zoom=${zoom}x (元画像 ${W}x${H})\n`,
);
