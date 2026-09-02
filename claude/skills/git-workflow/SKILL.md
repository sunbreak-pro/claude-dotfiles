---
name: git-workflow
description: Git operation conventions, commit message rules, and destructive command guardrails. Use as the SSOT for any git command — commit, push, branch, merge, rebase, PR, force-push, conflict, or git-related error messages. For branch strategy / PR / merge-rebase-squash judgment use git-branch-flow. For conflict triage use git-conflict-resolver.
---

# Git Workflow — 規約と安全則の正本

| 用途                                                  | 担当                    |
| ----------------------------------------------------- | ----------------------- |
| コミット規約 / Co-Authored-By / 破壊的コマンドの境界  | 本スキル                |
| ブランチ戦略 / PR 作成 / merge・rebase・squash の判断 | `git-branch-flow`       |
| conflict の解析・提案                                 | `git-conflict-resolver` |

## 0. 状況把握と自動化レベル

「コミットして」「push して」「PR 作って」で起動したら、まず並列で状況を取る:

```bash
git status; git branch --show-current; git log --oneline -5
git rev-list --count @{u}..HEAD 2>/dev/null || echo 0   # 未 push
git rev-list --count HEAD..@{u} 2>/dev/null || echo 0   # 未 pull
git diff --stat; git diff --cached --stat
gh pr list --head $(git branch --show-current) --json number,url 2>/dev/null || true
```

出力が長くなりそうなら（復旧作業・多 worktree）汎用エージェントに委譲して要約だけ受け取る。

### 0.1 自動化レベル

| 操作                                       | 動作                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| commit                                     | 自動。メッセージは提示せず実行し、報告に載せる                                    |
| push（feature branch）                     | 自動                                                                              |
| push（main / master / production）         | **ブロック**。branch 切替へ                                                       |
| PR 作成（feature branch から）             | 自動。止まるのは secrets を含む diff / 保護 branch 宛て / conflict ありのときだけ |
| PR マージ（§0.1.1 の条件を満たす）         | 自動                                                                              |
| PR マージ（条件を満たさない）              | 停止して報告                                                                      |
| rebase（自分専用 branch）                  | 実行前に確認                                                                      |
| rebase（共有 branch）/ `--force`           | **ブロック**                                                                      |
| `--force-with-lease`（feature / 保護 ref） | 確認後 / **ブロック**                                                             |
| conflict                                   | 解析・提案のみ。編集は確認後                                                      |

### 0.1.1 PR の自動マージ（正本）

プロジェクト側の POLICY / CLAUDE.md による override が常に優先する（例: life-editor は P-001「merge は常にユーザー」で不適用。`gh pr merge` が `permissions.ask` にある場合も同じ）。

次の 2 つを満たすときだけ、確認を挟まずマージする。片方でも欠けたら停止して報告する。

| 安全弁                 | 判定                                                                | 満たさない場合                                                  |
| ---------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| conflict が無い        | `gh pr view <PR#> --json mergeable,mergeStateStatus` が `MERGEABLE` | `git-conflict-resolver` へ。`UNKNOWN` は数秒後に 1 回だけ再取得 |
| role-qa のレビュー通過 | 同一セッションで role-qa を別コンテキスト起動し、Blocking ゼロ      | 直してから再監査。未実施ならその場で起動する                    |

CI / status check は必須条件にしない。赤いチェックに気づいたらマージ後に報告する。手順と方式は `git-branch-flow` §5（既定 `gh pr merge <PR#> --squash --delete-branch`）。

### 0.2 状況分類

| 状況                                    | アクション                            |
| --------------------------------------- | ------------------------------------- |
| main / master / production にいて dirty | branch 切替（git-branch-flow §2）     |
| feature branch に未コミット変更         | commit → push                         |
| 未 push commit あり                     | push                                  |
| 未 pull commit あり                     | rebase or merge（git-branch-flow §3） |
| Unmerged paths                          | `git-conflict-resolver`               |
| feature branch + commit 済 + PR なし    | PR 作成（git-branch-flow §4）         |
| PR あり                                 | `gh pr checks` で状態確認             |

「コミットして」だけでも判断する: main にいる → 先に branch / conflict 中 → 解決が先 / 変更なし → その旨を報告。「PR 作って」→ 未コミットなら commit、未 push なら push、既存 PR があれば更新。

## 1. Commit Message（Conventional Commits v1.0.0）

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

- type: `feat`(MINOR) / `fix`(PATCH) / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- subject: 命令形・先頭小文字・末尾ピリオドなし・72 文字以内。scope はプロジェクトで統一（省略可）
- Breaking Change: `feat(api)!: ...` か footer `BREAKING CHANGE: ...`
- AI が書いたコミットは末尾に `Co-Authored-By: Claude <noreply@anthropic.com>`（セッションから別の署名を指定されたらそちら）

## 2. 破壊的コマンドのガードレール

**完全ブロック**（明示要求があっても二段確認）: `git push --force` / `-f`、保護 ref（main / master / production / release/\*）への `--force-with-lease`、`git filter-branch` / `filter-repo`、`reflog expire` + `gc --prune=now`。

**実行前に確認**: `--force-with-lease`（feature）、`reset --hard`、`clean -f`、`checkout -- <file>` / `restore <file>`、`branch -D`、`stash drop` / `clear`、`commit --amend`（push 済みなら禁止）、共有 branch の `rebase`、`--no-verify`、タグの削除。

**確認不要**: 読み取り系（status / diff / log / show / blame）、`add <specific-files>`、`commit`（新規）、`fetch`、`pull --rebase`（feature のみ）、`push`（feature）、`checkout -b`、`stash` / `stash pop`、`gh pr view / list / checks`、`restore --staged`、`clean -n`。

## 3. Staging

- ファイル名指定を優先。`git add -A` / `.` は task-tracker END フローのような全変更コミット時だけ
- コミットしない: `.env*` / `*.pem` / `credentials.json` / API key を含むファイル / `node_modules/` / ビルド成果物

## 4. Pre-commit hook が落ちたとき

コミットは成立していない。指摘を直して再ステージし、**新しいコミット**を作る（`--amend` は使わない）。

## 5. 推奨設定

```bash
git config --global rerere.enabled true
git config --global pull.rebase true
git config --global merge.conflictstyle zdiff3
git config --global push.default current
git config --global init.defaultBranch main
```

リポジトリ側: main の branch protection（PR 必須 / force push ブロック / 削除禁止）、lockfile の merge driver 指定。
