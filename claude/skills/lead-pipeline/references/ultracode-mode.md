# ultracode モード — マルチエージェント並列采配

> lead-pipeline の参照ドキュメント。`ultracode` キーワード検出時は lead-pipeline 本文のティア判定の代わりに本モードで采配する。**安全則・既存資産との関係は lead-pipeline 本文に従う**（ここで重複定義しない）。

## これは何か

`ultracode` は**ユーザーがプロンプトに含めるオプトインキーワード**（スラッシュコマンドではない）。検出されたターンはマルチエージェント・オーケストレーションで処理する。ハーネスが対応する環境（Claude Code on the web 等）では専用のオーケストレーション機構が有効化されるが、非対応環境でも本モードが同等の采配を定義するため、どのマシンでも挙動が揃う。

lead-pipeline が「荷物の量を見てから運び方を決める現場監督」だとすると、ultracode モードは**最初から引っ越し業者フル編成 + 複数トラック同時運行**。ティア判定をスキップし、並列化できる工程はすべて並列化する。

## 発動条件

- ユーザープロンプトに `ultracode` が含まれる（UserPromptSubmit hook `pipeline-gate.mjs` が本モードへのポインタを注入する）
- メインが重量級かつ並列分解が効くと判断し、ユーザーに ultracode 付与を提案して合意を得た場合

### 非対象

- キーワードが無い通常タスク → lead-pipeline のティア判定へ
- 質問・調査のみのプロンプトに ultracode が付いた場合 → Phase 1（偵察ファンアウト）のみ実施し報告して終了
- 並列分解が効かない依存鎖支配のタスク → lead-pipeline 重ティア（逐次フルチェーン）へフォールバック

## 采配フロー（Phase 制・並列最大化）

各 Phase 内は **1 メッセージ内の複数 Agent 呼び出し**で並列起動する。Phase 間は前段の出力が後段の入力になるため逐次。

```
Phase 0  task-tracker (START) — active-sessions 競合チェック込み
Phase 1  偵察ファンアウト — Explore agent ×2〜4（対象領域 / 影響範囲 / 既存実装 / known-issues を分担）
Phase 2  role-pm — Phase 1 の結果を入力に要件分解。独立実装単位（unit）への分割表を出させる
Phase 3  role-engineer ×N — unit ごとに並列起動（依存 unit のみ逐次）。各 engineer は unit 単位の変更を返す
Phase 4  session-verifier — 統合検証（型 / lint / test / 構造）。失敗 unit のみ修正サイクルへ
Phase 5  role-qa + security-reviewer — 並列監査（必ず実装と別コンテキスト）
Phase 6  task-tracker (END) — MEMORY/HISTORY 記録 + commit
Phase 7  git-workflow — branch 保護判定。PR を出すなら git-branch-flow へ
```

### unit 分割の基準（Phase 2 で role-pm に課す）

- **触るファイル集合が互いに素**であること（同一ファイルを 2 unit が編集しない）
- 各 unit が単独で session-verifier を通せる粒度であること
- unit 数の目安は 2〜5。それ以上に割れるなら `/batch`（worktree + PR 分割）の領分なので execution-router に判断を戻す
- 分割できない場合は素直に逐次へフォールバック = lead-pipeline 重ティアと同型

## 安全則・既存資産との関係（重複定義しない）

**lead-pipeline 本文の「安全則（必須）」「既存資産との関係」に従う**。本モード固有の要点のみ再掲:

- sub-agent から sub-agent を呼ばない。並列起動を含む全起動はメインが Agent ツールで行う
- 同一ファイルを並列 engineer に渡さない。競合が判明したら該当 unit を統合して逐次化する
- Phase 4 失敗時は Phase 5 以降に進まない（lead-pipeline と同じ停止則）
- 「ultracode か `/batch` か」の判断は execution-router に委譲。**各 unit を PR 化したいなら `/batch`**、1 ブランチ 1 PR に統合するなら ultracode モード
- hook: `pipeline-gate.mjs`（UserPromptSubmit）が `ultracode` 検出時に本モードへのポインタを注入する。実装系キーワードのみのときは lead-pipeline のティア判定へ誘導する（同一フックで排他判定・二重注入なし）
