#!/usr/bin/env node
// claude-dotfiles installer — manifest.json の各エントリを ~/.claude/ へ配置する。
//   mode "link"     : symlink を試み、失敗したら copy にフォールバック
//                     (Windows: dir は junction なので Developer Mode 不要、
//                      file symlink は Developer Mode 無効だと失敗 → copy)
//   mode "template" : {{CLAUDE_DIR}} を実際の ~/.claude 絶対パスに展開してコピー
// 既存ファイル/ディレクトリは <name>.bak (衝突時 .bak.1, .bak.2 …) に退避する。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = path.dirname(fileURLToPath(import.meta.url));
const claudeDir = path.join(os.homedir(), ".claude");
// hook command 内のパス区切りは Windows でも '/' で動く (node が解決する)
const claudeDirForwardSlash = claudeDir.split(path.sep).join("/");

const manifest = JSON.parse(
  fs.readFileSync(path.join(repoDir, "manifest.json"), "utf8")
);

fs.mkdirSync(claudeDir, { recursive: true });

function backup(dest) {
  if (!fs.existsSync(dest) && !isDanglingSymlink(dest)) return null;
  let bak = `${dest}.bak`;
  let n = 0;
  while (fs.existsSync(bak) || isDanglingSymlink(bak)) {
    n += 1;
    bak = `${dest}.bak.${n}`;
  }
  fs.renameSync(dest, bak);
  return bak;
}

function isDanglingSymlink(p) {
  try {
    fs.lstatSync(p); // succeeds for dangling symlinks too
    return !fs.existsSync(p); // existsSync follows the link
  } catch {
    return false;
  }
}

function tryLink(src, dest, isDir) {
  try {
    // Windows: 'junction' はディレクトリに対して管理者権限/Developer Mode 不要。
    // file symlink は Developer Mode が必要 → 失敗時は copy フォールバック。
    const type = isDir ? (process.platform === "win32" ? "junction" : "dir") : "file";
    fs.symlinkSync(src, dest, type);
    return "symlink";
  } catch {
    fs.cpSync(src, dest, { recursive: true });
    return "copy";
  }
}

const results = [];
for (const entry of manifest.entries) {
  const src = path.join(repoDir, entry.src);
  const dest = path.join(claudeDir, entry.dest);

  if (!fs.existsSync(src)) {
    results.push({ dest: entry.dest, method: "SKIP (src missing)", backup: null });
    continue;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  // すでに望む状態なら何もしない (.bak の増殖防止)
  if (entry.mode === "template") {
    const content = fs
      .readFileSync(src, "utf8")
      .replaceAll("{{CLAUDE_DIR}}", claudeDirForwardSlash);
    try {
      if (fs.readFileSync(dest, "utf8") === content) {
        results.push({ dest: entry.dest, method: "ok (current)", backup: null });
        continue;
      }
    } catch {
      /* dest が無い / 読めない → 通常フロー */
    }
    // template は Claude Code 本体 (/model, /effort) や orca が live 側を書き換えるため
    // 差分が出やすい。backup() で退避すると install のたびに .bak.N が増えるので、
    // ここだけは 1 世代 (<name>.prev) を上書き保存に留める。
    let bak = null;
    if (fs.existsSync(dest)) {
      bak = `${dest}.prev`;
      fs.copyFileSync(dest, bak);
    }
    fs.writeFileSync(dest, content);
    results.push({ dest: entry.dest, method: "template→copy", backup: bak });
    continue;
  }

  try {
    if (
      fs.lstatSync(dest).isSymbolicLink() &&
      path.resolve(path.dirname(dest), fs.readlinkSync(dest)) === src
    ) {
      results.push({ dest: entry.dest, method: "ok (linked)", backup: null });
      continue;
    }
  } catch {
    /* dest が無い → 通常フロー */
  }

  const bak = backup(dest);
  const isDir = fs.statSync(src).isDirectory();
  const method = tryLink(src, dest, isDir);
  results.push({ dest: entry.dest, method, backup: bak });
}

console.log(`claude-dotfiles install → ${claudeDir}\n`);
for (const r of results) {
  const bakNote = r.backup ? `  (既存を退避: ${path.basename(r.backup)})` : "";
  console.log(`  ${r.method.padEnd(14)} ~/.claude/${r.dest}${bakNote}`);
}
const copies = results.filter((r) => r.method === "copy").length;
if (process.platform === "win32" && copies > 0) {
  console.log(
    `\n注意: ${copies} 件が symlink できず copy になりました (Developer Mode 無効?)。` +
      `\ncopy されたものは repo を pull しても自動反映されません。pull 後に再度 node install.mjs を実行してください。`
  );
}
console.log("\n完了。settings.json は {{CLAUDE_DIR}} 展開済みコピーのため、repo 側を編集したら再実行してください。");
