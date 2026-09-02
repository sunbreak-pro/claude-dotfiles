# ultracode モード — 並列最大化の采配

`ultracode` はユーザーがプロンプトに含めるオプトインキーワード（`/effort ultracode` = xhigh + dynamic workflow orchestration とは別物。こちらはハーネス側の采配モード）。検出したターンはティア判定を省いて重ティア扱いにし、並列化できる工程をすべて並列にする。安全則は lead-pipeline 本文に従う。

## 発動と非対象

- 発動: プロンプトに `ultracode` がある（`pipeline-gate.mjs` が注入）。または重量級かつ並列分解が効くとメインが判断し、ユーザーに `ultracode` 付与を 1 回だけ提案して採用された
- 質問・調査のみに付いていたら Phase 1（偵察ファンアウト）だけ実施して報告
- 並列分解が効かない依存鎖のタスクは lead-pipeline 重ティア（逐次）へ

## Phase

各 Phase 内は 1 メッセージで複数 Agent を起動する。Phase 間は前段の出力が後段の入力になるときだけ逐次。

```
Phase 0  task-tracker (START)
Phase 1  偵察 — Explore ×2〜4（対象領域 / 影響範囲 / 既存実装 / known-issues）。メインは並行して要件の整理を始める
Phase 2  role-pm — Phase 1 を入力に要件分解と unit 分割表
Phase 3  role-engineer × unit — 並列。メインも 1 unit を自分で実装する
Phase 4  session-verifier — 統合検証。失敗 unit だけ修正サイクル
Phase 5  role-qa + security-reviewer — 並列監査（実装と別コンテキスト）
Phase 6  task-tracker (END) → git-workflow
```

## unit 分割の基準（Phase 2 で role-pm に課す）

- 触るファイル集合が互いに素
- 各 unit が単独で session-verifier を通せる粒度
- 2〜5 unit。それ以上に割れるなら `/batch`（worktree + PR 分割）の領分なので execution-router に戻す
- 各 unit を PR 化したいなら `/batch`、1 ブランチ 1 PR に統合するなら ultracode
