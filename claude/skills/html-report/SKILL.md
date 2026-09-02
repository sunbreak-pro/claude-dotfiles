---
name: html-report
description: 判断材料を HTML で出して Artifact に発行する型。選択肢が 3 つ以上並ぶ報告・比較表・スクリーンショット付き検証・進捗の俯瞰・計画書の読む用に使う。答えが 1 つの報告や 1 問 1 答では使わない（文章で返す）。Triggers include "HTML で", "レポートにして", "Artifact で", "比較表", "ダッシュボード", "画面で見たい", "html-report".
---

# html-report — 判断材料を HTML で出す型

確認は claude.ai/code/artifacts が既定（2026-09-02 こうだいさん決定）。ターミナルの文章は要約だけにし、判断材料は HTML に載せて Artifact で発行する。

## いつ使うか

| 使う                                                      | 使わない                            |
| --------------------------------------------------------- | ----------------------------------- |
| 選択肢が 3 つ以上並ぶ判断（採用 / 保留 / 見送り）         | 答えが 1 つの報告                   |
| 比較表・トレードオフ                                      | 1 問 1 答・雑談                     |
| スクリーンショット付きの検証結果（before / after + 所見） | コードの差分そのもの（PR で見る）   |
| 複数レーンの進捗の俯瞰                                    | 途中経過の実況                      |
| 計画書の「読む用」（正本は .md のまま）                   | 正本になる文書（.md / repo が正本） |

## 手順

1. `templates/report.html` をコピーして書く。置き場はプロジェクト内なら `docs/reports/YYYY-MM-DD-<slug>.html`、プロジェクト外なら `~/.claude/docs/reports/`。
2. 内容は上から **結論カード → 根拠（表・図・スクショ） → 置いた仮定 / 未確認 → 次に判断が要る点** の順。結論カードは「今日から / 必要になったら / 入れない」の 3 分類か、「採用 / 保留 / 見送り」のチップで状態を色で示す。
3. `Artifact` ツールで発行する（初回は `favicon` 必須。同じファイルの再発行は同じパスで）。発行前に `artifact-design` スキルを読む。
4. 報告の末尾に **URL とファイルパスの両方** を書く。発行に失敗したらパスだけを書き、`Start-Process <path>` を提示する。
5. life-editor に控えを残すなら `life-editor-note` スキル（`scripts/le-note.mjs` に URL・パス・要点を渡す。`--pdf` で同名 PDF も作る。PDF の添付は MCP 未対応なのでパスを書くだけ）。

## 見た目の約束（テンプレートに実装済み・変えない）

- 1 ファイル完結。外部スクリプトは cdnjs のみ、フォントは Google Fonts のみ（BIZ UDPGothic + IBM Plex Mono）。
- ライト / ダーク両対応。色はトークン 12 個（ground / panel / ink / ink-2 / line / accent / accent-soft / code-bg / ok / warn / stop / idle）だけを使い、要素に直接 hex を書かない。
- 部品は 5 種だけ: 結論カード / チップ / コールアウト / 表 / コード。角丸は 6px と 3px の 2 段階。絵文字は使わない。
- 表は `overflow-x: auto` の枠に入れる。数字は `tabular-nums`。本文幅は 720px、表と図は 960px。
- 先頭に日付・種別・プロジェクトの eyebrow、`<title>` は 2〜4 語の名前（説明を付けない）。
- スクリーンショットは `visual-inspect` で Claude が読み、所見を Blocking / 要確認 / 問題なし の縦線色で示す。読み手に目視を頼まない。

## 型の見本

正本のテンプレートは claude.ai/design で作る。渡すブリーフ = `references/claude-design-brief.md`（環境制約・トークン・5 型の構造・納品形式を含む）。書き出した HTML は `templates/` に置く。


Claude Design のキャンバス「Report Templates」に 5 型（判断レポート / 進捗 / 画面検証 / 計画書 / トークンと部品）と対案 B を置いてある。URL はメモリ `html-report-and-life-editor-mcp-stdio`。artboard の元ファイルは `canvas/`（`design` スキルで再シードするときはここから）。新しい型を足すときはキャンバスに artboard を足してから、ここに 1 行追記する。
