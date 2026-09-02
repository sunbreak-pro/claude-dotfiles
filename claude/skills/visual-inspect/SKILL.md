---
name: visual-inspect
description: 画面・スクリーンショット・図表・設計画像を「切り抜いて拡大して見る」を自分で繰り返して確かめる手順。ユーザーの目視に頼らず、細かい文字・数値・レイアウトを Claude 自身が確認するときに使う。Triggers include "画面を確認", "スクショを見て", "図表を読む", "拡大して", "切り抜いて", "細かい文字", "レイアウト崩れ", "inspect image", "zoom in".
---

# Visual Inspect — 切り抜き → 拡大 → 見る、を繰り返す

Read は画像を 1 枚まるごと縮小して見せる。細かい文字や数値はそこで潰れるので、**気になる場所を切り抜いて拡大し、もう一度 Read する**。虫眼鏡を当てる場所を自分で選び、確かめるまで動かし続けるのが本スキルの中身。道具は `scripts/crop.mjs` 1 本だけ。

## 手順

1. **画像を得る。** 手元のファイル、`mcp__claude-in-chrome__computer` の screenshot、Playwright MCP の `browser_take_screenshot`、`run` スキルで起動したアプリの画面。保存先は scratchpad か指示された場所。
2. **全体像を格子つきで見る。** `node <skill-dir>/scripts/crop.mjs <image> --grid 6x4` を実行し、出力された `*.grid.png` を Read する。格子のラベル（A1 など）が「どこを拡大するか」の住所になる。
3. **確かめたい点を列挙する。** 「タイトルの文言」「軸ラベルの単位」「フッターのバージョン」「ボタンの並び」のように、判定に要る箇所を先に決める。決めずに眺めない。
4. **切り抜いて拡大して Read する。** 1 点ごとに `--cell E4 --grid 6x4 --zoom 4`（格子で指定）か `--region x,y,w,h --zoom 3`（ピクセルで指定）。読めなければ zoom を上げるか領域を狭める。読めた内容と、期待とのズレを 1 行で記録する。
5. **全点を確認するまで 4 を繰り返す。** 「たぶん合っている」で終えない。読めなかった箇所は「未確認」として報告に残す。
6. **報告する。** 確認した箇所 / 読めた内容 / ズレ / 未確認、をまとめ、根拠にした切り抜き画像のパスを添える。

## crop.mjs

```
node scripts/crop.mjs <image> --info                       # 幅・高さ・形式
node scripts/crop.mjs <image> --grid [6x4]                 # 座標格子つき全体図 → <image>.grid.png
node scripts/crop.mjs <image> --cell B3 --grid 6x4 --zoom 4  # 格子セルを切り抜き拡大（--pad 0.1 で周囲に余白）
node scripts/crop.mjs <image> --region x,y,w,h --zoom 3    # ピクセル指定で切り抜き拡大
```

- 出力は常に PNG。標準出力に「出力パス + 切り抜き座標 + 倍率」を 1 行で返す。
- 依存は `sharp` だけ。無ければ初回に `scripts/` 配下へ自動 install する（グローバルは汚さない）。
- `<skill-dir>` は `~/.claude/skills/visual-inspect`。

## 使いどころ

- UI 変更後の runtime 検証（playwright-verify の Gate P2 / P5 と組み合わせる）
- 設計画像・ワイヤーフレーム・グラフ・表の読み取り（数値や凡例の文字を拾う）
- PDF は Read の `pages` で見た上で、粗いページはスクリーンショット化してから本手順に載せる
