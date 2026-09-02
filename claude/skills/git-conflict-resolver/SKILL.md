---
name: git-conflict-resolver
description: Analyze merge / rebase conflicts and propose resolution strategy. Reads both sides, classifies the conflict type (logic / lockfile / generated / formatting), and presents a recommended merge for each file. Does NOT auto-resolve — user confirmation is mandatory before any edit. Triggers include "conflict", "コンフリクト", "競合", "CONFLICT (content)", "Automatic merge failed", "merge conflict", "rebase conflict", git status showing "Unmerged paths".
---

# Git Conflict Resolver — 解析と提案

conflict を解析して提案するまで。編集はユーザー確認後（lockfile の再生成だけ例外）。

## 1. 解析

```bash
git status; git diff --name-only --diff-filter=U; git diff --check
git log --merge --oneline; git log --merge -p -- <file>
git diff :1:<file> :2:<file>    # base vs ours
git diff :1:<file> :3:<file>    # base vs theirs
```

| 種別             | 特徴                                  | 対応                                        |
| ---------------- | ------------------------------------- | ------------------------------------------- |
| logic            | 同一行で異なるロジック変更            | 両側の意図と推奨マージ案を提示              |
| lockfile         | package-lock / yarn.lock / Cargo.lock | §3 の再生成                                 |
| generated        | dist/ build/ schema dump              | 再生成を提案。手動編集しない                |
| formatting only  | 空白 / インデント / import 順         | 片側採用 + フォーマッタ                     |
| rename collision | 片側 rename / 片側 edit               | rename 検出を確認し、どちらを尊重するか提示 |

`merge.conflictstyle = zdiff3` なら `||||||| base` で共通祖先が見え、両側の変更意図を base 起点で読める。

### 出力

```markdown
## Conflict Analysis

### 検出された conflict

- `path/to/file.ts`（logic）/ `package-lock.json`（lockfile）/ ...

### `path/to/file.ts`

**ours（HEAD: feat/x）の意図**: ...
**theirs（main）の意図**: ...
**推奨マージ**: <統合後のコード> / 理由: <副作用が無いか>

## 確認事項

1. 推奨マージで進めるか（yes / 修正案 / 自分で編集）
2. 完了コマンドは `git rebase --continue` か `git commit` か（`git status` で判別）
```

## 2. 編集（確認後）

Edit で解決 → `git add <file>` を個別指定 → `git diff --check` でマーカー残存確認 → rebase 中なら `git rebase --continue`、merge 中なら `git commit`。

## 3. lockfile

手動マージしない。片側を取って再生成する（feature に main を取り込むときは `--theirs` = main 側。迷ったらどちらでもよい）:

```bash
git checkout --theirs package-lock.json && npm install --package-lock-only && git add package-lock.json
# yarn: yarn install / pnpm: pnpm install --lockfile-only / cargo: cargo generate-lockfile
```

生成物（`dist/` 等）は `.gitignore` に入れるべきなら入れて `git rm --cached`、そうでなければ再生成してステージ。

## 4. 中断

`git merge --abort` / `git rebase --abort` / `git cherry-pick --abort` で conflict 前の状態に戻る。

`rerere.enabled = true` なら同一 conflict の再発時に過去の解決が自動再適用される（`git rerere status` / `diff`）。
