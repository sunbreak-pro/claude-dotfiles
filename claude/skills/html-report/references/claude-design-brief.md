# Claude Design に渡すブリーフ — html-report テンプレート

claude.ai/design でテンプレートを作るときに、そのまま貼るプロンプト。作った HTML は `skills/html-report/templates/` に置き、Claude Code が Artifact として発行する。

---

## 貼り付け用プロンプト

```
あなたには「Claude Code が判断材料を人間に見せるための HTML レポート」のテンプレート一式をデザインしてもらいます。用途・置かれる環境・守るべき制約を先に書きます。読んでから、不明点があれば作り始める前にまとめて質問してください。

## 何のためのものか
- 使うのは私 1 人（ソロ開発者・日本語）。AI エージェント（Claude Code）がターミナルで作業した結果を、文章の代わりに HTML で出し、私が claude.ai/code/artifacts のギャラリーから開いて読み、判断します。
- 目的は「判断のしやすさ」と「認知負荷の低下」。読み手は 1 段目だけ読んで判断でき、2 段目以降は根拠の確認に使う、という構造にします。
- 書くのは人間ではなく Claude Code です。テンプレートは「Claude が中身を差し替えやすい」ことが最優先で、装飾より構造の明快さを取ります。

## 置かれる環境（Claude Code の Artifact）の制約 — 必ず守る
1. 1 ファイル完結の HTML。CSS と JS はインライン。画像は data: URI で埋め込む（外部画像は読み込まれない）。
2. 外部から読み込めるのは次だけ: スクリプトは cdnjs.cloudflare.com / cdn.jsdelivr.net/npm / cdn.tailwindcss.com / code.jquery.com、スタイルシートは fonts.googleapis.com（フォント実体は fonts.gstatic.com）。それ以外は無音で失敗します。基本はライブラリなしで作ってください。
3. ページ全体は 16MB 以下。ダウンロードリンクや `<a download>` は動かないので置かない。
4. ライト / ダーク両対応。テーマは 3 状態あります: ルート要素に `data-theme="dark"` または `data-theme="light"` が付く場合と、何も付かず OS 設定（prefers-color-scheme）だけで決まる場合。CSS は次の型で書いてください:
   - 素の `:root` にライトの全トークンを定義する
   - `@media (prefers-color-scheme: dark)` の中で `:root:not([data-theme="light"])` にダークのトークンだけを再定義する
   - `:root[data-theme="dark"]` にもう一度ダークのトークンを再定義する
   - 部品の色は必ずトークン経由。メディアクエリや `[data-theme]` の中に部品のスタイルを直接書かない
   - `body` に必ずトークンの背景色を指定する（透明だとホストの背景が透ける）
5. 横スクロールはページ全体で起こさない。表・コード・図は自身のコンテナで `overflow-x: auto`。
6. 読み込んだ瞬間にすべて見えている状態にする（スクロールや操作で現れるアニメーションは不可。サムネイルがその静止画になります）。
7. `<title>` はファイル先頭 8KB 以内に置き、2〜4 語の固有名にする。説明文を「—」や「:」で付け足さない。

## デザイントークン（この値をそのまま使う。増やさない）
ライト: ground #f5f7f6 / panel #ffffff / ink #1c2327 / ink-2 #56636b / line #d5dcdf / accent #0e6b74 / accent-soft #dcefef / code-bg #eaf0f0 / ok #2c7a4b / warn #a86a12 / stop #a23c3c / idle #e6ebee
ダーク: ground #13181b / panel #1b2226 / ink #e4e9eb / ink-2 #99a6ad / line #2c363b / accent #5fc4cc / accent-soft #163338 / code-bg #0f1417 / ok #6fc48f / warn #e0a94a / stop #e07a7a / idle #2c363b
書体: 本文と見出しは "BIZ UDPGothic"（Google Fonts・判読性のための UD 書体）、コードとパスは "IBM Plex Mono"。fallback は "Yu Gothic UI", "Meiryo", sans-serif と "Consolas", monospace。
型スケール: h1 30px/1.3、h2 19px、h3 16px、本文 15px/1.7、補足 13px、eyebrow 11px（letter-spacing .12em・大文字）。
角丸は 6px（パネル）と 3px（チップ）の 2 段階。影は使わない。絵文字・ディングバットは使わない。

## 部品は 5 種だけ
1. 結論カード: 「今日から / 必要になったら / 入れない」の 3 分類。上に小さな色点付きの分類ラベル、見出し、理由 1〜2 文。3 列グリッド。
2. チップ: 採用（ok）/ 保留（warn）/ 見送り（stop）/ 未着手（idle）。角丸 3px、12px 太字。
3. コールアウト: 左 3px の accent 縦線 + accent-soft 背景。1 ページに 1 つまで。
4. 表: ヘッダは ground 背景・11px 大文字。数字の列は tabular-nums。panel の枠に入れて overflow-x: auto。
5. コード: code-bg 背景・IBM Plex Mono 13px。

## 作ってほしいテンプレート（5 型 + 部品表）
各型は「上から順に何を置くか」を固定します。本文幅は 720px、表と図は 960px まで。
A. 判断レポート: eyebrow（日付・種別・プロジェクト）→ h1（1 行で言い切る）→ 要約 1〜2 文 → 結論カード 3 枚 → コールアウト（前提 1 つ）→ 根拠（比較表）→ 置いた仮定 / 未確認（2 列）→ 次に判断が要る点
B. 進捗: eyebrow → h1 → 数字タイル 4 枚（待ち・進行中・完了・赤）→ レーン表（状態チップ + 手番 + 進捗バー）→ 「私の次の 3 手」と「Claude が進めているもの」の 2 列
C. 画面検証: eyebrow → h1 → 判定（Blocking 件数と可否）→ before / after のスクリーンショット 2 列（キャプションにファイル名と切り抜き範囲）→ 所見リスト（左に縦線色: stop / warn / ok、チップ + 見出し + 1 文）
D. 計画書（読む用）: eyebrow → h1 → 「やること」と「やらないこと」の 2 列 → Steps 表（# / Step / Gate / Acceptance。Gate は 自律=ok 色・人手=stop 色）→ 貼り付け用プロンプト（コード枠）
E. トークンと部品: 色 12 個 × ライト / ダークのスウォッチ、型スケール見本、部品 5 種の見本
F. 共通の空テンプレート: A の骨組みに「ここに何を書くか」を灰色のプレースホルダーで示したもの（lorem ipsum は使わない。日本語で「1 行で言い切る見出し」のように書く）

## 中身の書き方
- 見本の文章は日本語。実在しそうな題材（例: 「MCP サーバーの接続方式を決める」「PR #1433 の merge 待ち」）で書き、意味のない埋め草は入れない。
- 数字が出るところは表と本文で必ず一致させる。
- 構造を示す番号（01 / 02）は、実際に順番に意味があるところ（Steps）だけに使う。

## 納品の形
- 型ごとに 1 つの HTML ファイル（A〜F の 6 ファイル）。それぞれ単体で開いて完成している状態。
- ファイル名は kebab-case の英語（decision-report.html / progress.html / screen-verify.html / plan.html / tokens.html / blank.html）。
- 最初に E（トークンと部品）を 1 枚作って見せてください。私が確認してから残りに進みます。

## 聞かずに進めてよいこと / 聞いてほしいこと
- 余白や文言の細部は上の規約の範囲で自由に決めてください。
- トークンの値・部品の種類・各型の並び順を変えたくなったら、変える前に理由と一緒に聞いてください。
```

---

## 使い方

1. claude.ai/design で新規プロジェクトを作り、上のプロンプトを貼る。
2. E（トークンと部品）が出たら見た目を確認し、残り 5 型を作らせる。
3. 各 HTML を書き出して `skills/html-report/templates/` に置く（`report.html` は F と置き換える）。
4. 置いたら Claude Code で 1 枚発行して、ダークテーマと横スクロールを確認する（`artifact-design` の 3 状態のテーマ規約が守られているかが一番の落とし穴）。

## 前提として押さえておくこと

- Claude Design の書き出し形式が「1 ファイル完結の HTML」でない場合は、書き出し後に CSS / JS をインライン化する必要がある。ここは実物で確認する。
- Claude Code 側の早期プレビュー版キャンバス（Artifact 内で動く方）は、claude.ai/design 本体と同じ機能ではなく、発行後に編集機能が更新されない。見本として置いてあるだけで、正本はこのブリーフで作ったテンプレートにする。
