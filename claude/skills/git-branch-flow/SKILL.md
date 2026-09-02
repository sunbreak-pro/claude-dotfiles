---
name: git-branch-flow
description: Branch strategy and PR workflow procedures (GitHub Flow default). Use when creating a branch, opening a PR, choosing between merge / rebase / squash, integrating main into a feature branch, or deleting a merged branch. Triggers include "ブランチ切って", "PR 作って", "rebase", "squash", "merge", "main を取り込む", "branch", "pull request", "マージ方法".
---

# Git Branch Flow — 手順カタログ

規約・安全則は `git-workflow`。ここは手順だけ。

## 1. 戦略と命名

GitHub Flow（短命 feature branch）。main は常にデプロイ可能、feature branch は 2 日以内に PR、**AI エージェントは main に直接コミットしない**。プロジェクトで上書きするなら `.claude/CLAUDE.md` に明記する。

ブランチ名は `feat/` `fix/` `chore/` `docs/` `refactor/` `hotfix/` `test/` + kebab-case 30 文字以内（例: `feat/task-priority-sort`）。

### worktree

- ディレクトリは `<repo>/.claude/worktrees/<name>`、名前は branch 名の `/` を `-` に置換。`+` は使わない。`claude --worktree <name>` は branch に `worktree-` prefix を付ける（規約を厳守するなら `git worktree add` を手動で）
- **削除できる条件（4 つ全部）**: 紐付く PR が MERGED / `git -C <wt> log origin/main..HEAD` が空 / `git -C <wt> status -s` が空 / その worktree を cwd とする稼働セッションが無い（`claude agents --json` で確認。mtime や reflog だけで inactive と判断しない）。揃わなければ `.claude/memory/INDEX.md` と `.claude/comm/outbox/` も見てから判断
- branch 削除: PR MERGED 済みなら `git branch -d`。PR 無しかつ未マージ commit 無し（`git log <branch> --not main origin/main` が空）なら `-D` 可。それ以外は削除しない

### Multi-chat Worktree Policy（採用プロジェクト限定）

プロジェクトの CLAUDE.md にこの節があるとき、メインリポジトリは専有ブランチ（通常 `main`）だけを許可する。プロジェクトに専用スキルがあればそちらが優先。

```bash
git worktree add .claude/worktrees/<slug>/ -b <branch>   # 既存 branch なら -b を外す
cd .claude/worktrees/<slug>/
echo <branch> > .claude/comm/.session-branch             # 担当宣言。省略禁止
claude                                                   # または claude --worktree <slug>
```

メインリポジトリ（`git rev-parse --show-toplevel` が `.claude/worktrees/` 配下でない）で feature への checkout を求められたら停止して上記へ誘導する。同一 branch を 2 つの worktree から触るのは git 仕様で不可なので branch 分割を提案する。

## 2. ブランチ作成

```bash
git checkout main && git fetch origin && git pull --rebase origin main
git checkout -b feat/<slug>
git push -u origin feat/<slug>   # 初回 push 時
```

main / master / production にいる状態で「コミットして」と言われたら、先に branch を切ってから進める。

## 3. main を feature に取り込む

- 自分専用 branch → `git fetch origin && git rebase origin/main`（push 済みなら `--force-with-lease`、実行前に確認）
- 他所で pull 済みの可能性 / 5 日以上の長命 branch → `git merge origin/main`
- conflict は `git-conflict-resolver`

## 4. PR 作成

タイトルは Conventional Commits 形式で 70 文字以内。事前に `git status` / `git log main..HEAD --oneline` / `gh pr list --head <branch>` を確認する。

```bash
gh pr create --title "feat(tasks): add priority sorting" --body "$(cat <<'EOF'
## Summary
- <1-3 bullets>

## Test plan
- [ ] <verification step>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## 5. マージ方式

| 方式             | 履歴                 | 推奨ケース                  |
| ---------------- | -------------------- | --------------------------- |
| Squash and Merge | 1 PR = 1 commit      | 個人開発 / 短命 PR（既定）  |
| Rebase and Merge | 各 commit 保持・線形 | コミット粒度が綺麗な PR     |
| Merge Commit     | 分岐構造保持         | 大型機能 / 長期プロジェクト |

```bash
gh pr merge <PR#> --squash --delete-branch     # 既定。--rebase / --merge で切替
git checkout main && git pull --rebase origin main && git branch -d feat/<slug> && git fetch --prune
```

自動マージの可否は `git-workflow` §0.1.1 が正本。他の人がその branch を基に作業しているなら rebase は使わない。

## 6. lockfile

手動マージしない。conflict は `git-conflict-resolver`。lockfile だけが変わる PR は依存更新としてレビュー必須。
