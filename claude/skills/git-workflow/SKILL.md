---
name: git-workflow
description: Git operation conventions, commit message rules, and destructive command guardrails. Use as the SSOT for any git command — commit, push, branch, merge, rebase, PR, force-push, conflict, or git-related error messages. For branch strategy / PR / merge-rebase-squash judgment use git-branch-flow. For conflict triage use git-conflict-resolver.
---

MANDATORY FIRST ACTION: Output `<The git-workflow will launch>` before doing anything else.

# Git Workflow — SSOT

このスキルは git 操作の **規約と安全則の参照書** です。手順カタログは別スキルに分離しています。

| 用途                                                    | 担当スキル                     |
| ------------------------------------------------------- | ------------------------------ |
| コミット規約 / Co-Authored-By / 破壊的コマンドの境界    | **git-workflow**（このスキル） |
| ブランチ戦略 / PR 作成 / merge vs rebase vs squash 判断 | `git-branch-flow`              |
| コンフリクト解析・解決提案                              | `git-conflict-resolver`        |
| 状況判断 + 戦略決定 + 上記スキル委譲                    | `git-orchestrator` agent       |

---

## 1. Commit Message Convention（Conventional Commits v1.0.0）

### 形式

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### type 一覧（公式仕様準拠 / SemVer 連動）

| type       | SemVer 影響 | 用途                                   |
| ---------- | ----------- | -------------------------------------- |
| `feat`     | MINOR       | 新機能                                 |
| `fix`      | PATCH       | バグ修正                               |
| `docs`     | なし        | ドキュメントのみ                       |
| `style`    | なし        | フォーマット・空白（ロジック変更なし） |
| `refactor` | なし        | リファクタ（feat でも fix でもない）   |
| `perf`     | なし        | パフォーマンス改善                     |
| `test`     | なし        | テスト追加・修正                       |
| `build`    | なし        | ビルドシステム / 外部依存              |
| `ci`       | なし        | CI 設定                                |
| `chore`    | なし        | その他（雑務 / 設定）                  |
| `revert`   | 状況依存    | コミット取り消し                       |

### subject ルール

- 命令形（imperative）: `add` / `fix` / `remove`（`added` / `fixes` ではない）
- 先頭小文字、末尾ピリオドなし
- 実務上限 72 文字（git log 折り返し幅）

### scope ルール

- コードベースのセクションを表す名詞: `feat(api):` / `fix(parser):`
- プロジェクト固有で統一する（life-editor なら `tasks` / `schedule` / `notes` など）
- 省略可

### Breaking Change の記法

```bash
# 方式 1: ! 記法（簡潔）
feat(api)!: change endpoint response format

# 方式 2: footer 記法（詳細説明付き）
feat(api): change endpoint response format

BREAKING CHANGE: Response body now returns `data` wrapper object.
```

### Co-Authored-By（AI エージェントが書いた場合は必須）

```
feat(tasks): add priority sorting

Co-Authored-By: Claude <noreply@anthropic.com>
```

形式: blank line のあと commit message 末尾に `Co-Authored-By: Name <email>`。GitHub がプロフィールリンクを認識する。

---

## 2. 破壊的コマンドのガードレール（厳守）

### 2.1 完全ブロック（ユーザー明示要求があっても二段確認）

| コマンド                                                                                      | 理由                                     |
| --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `git push --force` / `git push -f`                                                            | リモート履歴の上書き → 他者の作業消失    |
| `git push --force-with-lease` をブランチ保護対象（main / master / production / release/\*）へ | 同上、保護 ref への force は危険性が高い |
| `git filter-branch` / `git filter-repo`                                                       | 履歴改変                                 |
| `git reflog expire --expire=now --all` + `git gc --prune=now`                                 | reflog 消失で復元不可になる              |

### 2.2 ユーザー確認必須（明示要求があれば実行可）

| コマンド                                             | リスク                                       |
| ---------------------------------------------------- | -------------------------------------------- |
| `git push --force-with-lease`（feature branch 向け） | リモート上書き（lease 付きなので比較的安全） |
| `git reset --hard`                                   | 未コミット変更の全消去                       |
| `git clean -f` / `git clean -fd`                     | 未追跡ファイルの永久削除                     |
| `git checkout -- <file>` / `git restore <file>`      | 特定ファイルの未コミット変更消去             |
| `git branch -D`                                      | マージ確認なしのブランチ強制削除             |
| `git stash drop` / `git stash clear`                 | スタッシュの永久削除                         |
| `git commit --amend`                                 | 直前コミットの改変（push 済みなら厳禁）      |
| `git rebase` on shared branch                        | published commit の rebase（Pro Git §3.6）   |
| `--no-verify`（hook skip）                           | pre-commit / pre-push hook を回避            |
| タグの削除 + 削除 push                               | リリース履歴の消失                           |

### 2.3 自動化してよい（確認不要）

- `git status` / `git diff` / `git log` / `git show` / `git blame`（読み取り専用）
- `git add <specific-files>`（特定ファイル指定。`-A` `.` は §3 参照）
- `git commit`（new commit のみ。`--amend` は 2.2 へ）
- `git fetch`
- `git pull --rebase`（feature branch のみ。main/master へは確認）
- `git push`（feature branch への通常 push）
- `git checkout -b <new-branch>`（新規ブランチ作成）
- `git stash` / `git stash pop`
- `gh pr view` / `gh pr list` / `gh pr checks`
- `git restore --staged <file>`（ステージング解除のみ）
- `git clean -n` / `--dry-run`（プレビューのみ）

---

## 3. Staging の安全則

- **ファイル名指定を優先**: `git add path/to/file` の形で 1 つずつ
- `git add -A` / `git add .` は **task-tracker END フローのような自動化された全変更コミット時のみ** 許可
- ステージング前に必ず `git status` で確認
- **絶対にコミットしない**: `.env` / `*.pem` / `credentials.json` / API key を含むファイル / `node_modules/` / ビルド成果物（`dist/` `build/`）

---

## 4. Pre-commit Hook が落ちたとき

1. **コミットは成立していない**（hook 失敗時は git が abort する）
2. hook が指摘した問題を修正
3. ファイルを再ステージング
4. **新しいコミットを作る**（`--amend` は使わない。前回コミットを書き換える挙動になり、別の作業を破壊する可能性）

---

## 5. 推奨設定

### 5.1 グローバル設定（一度だけ実行）

```bash
git config --global rerere.enabled true              # conflict 解決の再利用
git config --global pull.rebase true                 # pull は rebase を既定に
git config --global merge.conflictstyle zdiff3       # 3-way conflict marker（共通祖先表示）
git config --global push.default current             # 現在のブランチ名で push
git config --global init.defaultBranch main
```

### 5.2 リポジトリごとの推奨

- branch protection rule（GitHub）: main は PR 必須 / status check 必須 / force push ブロック / 削除禁止
- `.gitattributes` で lockfile を merge driver 指定（package-lock.json / yarn.lock など）

---

## 6. 起動条件

このスキルは以下のときに参照する:

- ユーザーが「コミット」「push」「git の規約」「コミットメッセージ」と言ったとき
- 他のスキル / agent（git-orchestrator / git-branch-flow / git-conflict-resolver）が規約を確認したいとき
- 破壊的コマンドの可否を判断するとき

実際の手順実行は以下に委譲する:

- branch / PR / merge → `git-branch-flow`
- conflict → `git-conflict-resolver`
- 状況判断と委譲 → `git-orchestrator` agent

---

## 7. 参考一次ソース

- Conventional Commits v1.0.0: https://www.conventionalcommits.org/en/v1.0.0/
- Pro Git Book §3.6 (Perils of Rebasing): https://git-scm.com/book/en/v2/Git-Branching-Rebasing
- Pro Git Book §7.9 (Rerere): https://git-scm.com/book/en/v2/Git-Tools-Rerere
- GitHub Docs (Branch Protection): https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub Docs (Co-Authored-By): https://docs.github.com/articles/creating-a-commit-with-multiple-authors
