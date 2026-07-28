#!/usr/bin/env node
// adversarial-review-gate — コード変更を含む応答を「別コンテキストのレビューに通したか」でゲートする。
//   引数 "record" : PostToolUse(Edit|Write) で変更ファイルを session ごとに記録する
//                   (レビューに値するファイルのみ。判定は needsReview を参照)
//   引数 "check"  : Stop で発火。未レビューの変更があれば 1 度だけ exit 2 でブロックし、
//                   別コンテキスト(role-qa / security-reviewer)での diff レビューを促す。
// 設計思想:
//   - 「自分の宿題を自分で採点しない」= 実装した本人でなく、新鮮な文脈のサブエージェントに
//     diff だけを見せて批判させる（公式ベストプラクティスの adversarial review）。
//   - 変更ゼロの応答(質問/調査/雑談)では何も出さず exit 0（コンテキスト消費なし）。
//   - 対象はコードと秘密情報を持つファイルだけに絞る。docs / 設定 / テキストのみの変更で
//     止めると、誤字修正 1 行のたびに opus 級のサブエージェント監査を呼ぶことになり割に合わない
//     (Opus 5 は自己検証が既定挙動なので、軽微な変更に外部監査を強制する価値が薄い)。
//   - ループ防止: 1 セッション 1 回のみブロック（blockedOnce フラグ、最初の Stop で消費）。
//     以降の変更は同一セッションでは再ゲートしない割り切り。公式の「8 回連続ブロックで
//     強制終了」安全弁にも当たらない。
// サブエージェント(Agent ツール)経由の編集も、その PostToolUse はメインと同一 session_id を
//   受け取るため同じ state ファイルに記録され、メイン Stop の check が拾う(実測確認済み・
//   Claude Code 2.1.x)。よって SubagentStop への追加配線は不要。
import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const mode = process.argv[2]; // "record" | "check"

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // stdin が読めなければ何もしない
}

const sessionId = input.session_id || "unknown";
const cacheDir = path.join(os.homedir(), ".claude", ".cache", "adversarial-review");
const stateFile = path.join(cacheDir, `${sessionId}.json`);

function loadState() {
  try {
    return JSON.parse(readFileSync(stateFile, "utf8"));
  } catch {
    return { changed: [], blockedOnce: false };
  }
}
function saveState(s) {
  // temp に書いてから rename(原子的)。並列 record 同士の書き込み衝突でファイルが
  // 壊れるのを防ぐ。process.pid で temp 名を分離。
  mkdirSync(cacheDir, { recursive: true });
  const tmp = `${stateFile}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(s));
  renameSync(tmp, stateFile);
}

// レビューに値する変更かの判定。ここを通らないファイルは記録せず、Stop でも止めない。
//   1) コード — 実行される以上、バグ・副作用の余地がある
//   2) 秘密情報を持つファイル — 拡張子に関わらず漏洩の影響が大きい
//   3) Docker / CI 定義 — 実行環境と配布経路に影響する
// ファイル名に auth / token 等を含むコードは 1) で拾えるため、名前ベースの追加判定は置かない
// (置くと `skills/session-verifier/SKILL.md` のような無関係な .md まで巻き込む)。
const CODE_EXT =
  /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|rs|py|go|rb|java|kt|kts|swift|mm?|c|h|cc|cpp|hpp|cs|php|sh|bash|zsh|ps1|sql|vue|svelte|astro|graphql|prisma)$/i;
const SECRET_FILE = /^(\.env|.*\.(pem|key|crt|cer|p12|pfx|keystore|jks)$|id_(rsa|ed25519)|credentials?$)/i;
const INFRA_FILE = /^(Dockerfile|docker-compose[.\w-]*\.ya?ml|Containerfile)$/i;
const CI_PATH = /(^|[\\/])\.github[\\/]workflows[\\/].+\.ya?ml$/i;

function needsReview(fp) {
  const base = path.basename(fp);
  return CODE_EXT.test(base) || SECRET_FILE.test(base) || INFRA_FILE.test(base) || CI_PATH.test(fp);
}

// 古い state ファイル(2 日以上前)の掃除。session ごとに 1 ファイル増えるための増殖防止。
function cleanup() {
  try {
    const now = Date.now();
    for (const f of readdirSync(cacheDir)) {
      const p = path.join(cacheDir, f);
      if (now - statSync(p).mtimeMs > 2 * 24 * 60 * 60 * 1000) {
        rmSync(p, { force: true });
      }
    }
  } catch {
    /* cache ディレクトリが無ければ何もしない */
  }
}

if (mode === "record") {
  try {
    const fp = input.tool_input?.file_path;
    if (fp && needsReview(fp)) {
      const s = loadState();
      if (!s.changed.includes(fp)) s.changed.push(fp);
      saveState(s);
    }
  } catch {
    /* 記録は本質でないので失敗しても静かに素通り(fail-open・兄弟 hook と統一) */
  }
  process.exit(0);
}

if (mode === "check") {
  cleanup();
  const s = loadState();
  // 変更なし → 素通り / 既に一度促した → 二度は止めない(ループ防止)
  if (!s.changed.length || s.blockedOnce) process.exit(0);
  s.blockedOnce = true;
  saveState(s);
  const list = s.changed.map((f) => `  - ${f}`).join("\n");
  process.stderr.write(
    `このセッションでレビュー対象(コード / 秘密情報 / 実行環境定義)のファイルを ${s.changed.length} 個変更しています:\n${list}\n\n` +
      `応答を確定する前に、変更 diff を別コンテキストでアドバーサリアルにレビューしてください。` +
      `Agent ツールで role-qa を起動し(認証/認可/入力処理/秘密情報に触れたなら security-reviewer も並列で)、` +
      `git diff だけを見せて要件とのギャップ・バグ・副作用を報告させ、指摘を反映してから応答を終えてください。\n` +
      `軽微・自明な変更(typo / コメント / フォーマットのみ)でレビュー不要と判断したら、` +
      `その旨を一言添えてそのまま続行してかまいません。`
  );
  process.exit(2);
}

process.exit(0);
