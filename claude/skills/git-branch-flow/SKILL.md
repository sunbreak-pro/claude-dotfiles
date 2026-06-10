---
name: git-branch-flow
description: Branch strategy and PR workflow procedures (GitHub Flow default). Use when creating a branch, opening a PR, choosing between merge / rebase / squash, integrating main into a feature branch, or deleting a merged branch. Triggers include "ブランチ切って", "PR 作って", "rebase", "squash", "merge", "main を取り込む", "branch", "pull request", "マージ方法".
---

MANDATORY FIRST ACTION: Output `<The git-branch-flow will launch>` before doing anything else.

# Git Branch Flow — 手順カタログ

ブランチ戦略・PR 作成・マージ判断の **手順** をまとめたスキル。規約・安全則は `git-workflow` スキル参照。

---

## 1. デフォルト戦略: GitHub Flow（短命 feature branch）

```
main ──┬──────┬──────┬──── (常にデプロイ可能)
       │      │      │
       └─feat/x  └─fix/y  └─chore/z   (寿命 1-2 日 / 1 PR = 1 論理変更)
```

- **main は常にデプロイ可能** な状態を維持
- feature branch は **2 日以内** に PR → main マージを目標
- AI エージェントは **main に直接コミットしない**（人間と違ってチームサイズ例外を適用しない）
- プロジェクトで上書きしたい場合は `.claude/CLAUDE.md` の §7 等に明記する

### 例外戦略

- **Trunk-Based Development**: CI が成熟していて feature branch を経由しないチーム → このスキルの大半は不要
- **Git Flow**: 複数バージョン並行サポートが必要な大規模製品 → このスキルでは扱わない（過剰）

---

## 2. ブランチ命名規則

```
feat/<short-description>       # 新機能
fix/<short-description>        # バグ修正
chore/<short-description>      # 雑務 / 依存更新
docs/<short-description>       # ドキュメントのみ
refactor/<short-description>   # リファクタ
hotfix/<short-description>     # 緊急本番修正
test/<short-description>       # テスト追加
```

- すべて lowercase + hyphen
- スペース・特殊文字禁止
- `<short-description>` は kebab-case で 30 文字以内目安
- `/` 区切りで GitHub UI のフォルダ表示が効く

### 命名例

```
feat/task-priority-sort
fix/schedule-timezone-bug
chore/upgrade-tauri-2-1
docs/migration-plan-update
refactor/dataservice-extract-cache
```

---

## 3. ブランチ作成手順

```bash
# 1. main を最新化
git checkout main
git fetch origin
git pull --rebase origin main

# 2. 新規ブランチ作成
git checkout -b feat/<slug>

# 3. （初回 push 時に）upstream 設定
git push -u origin feat/<slug>
```

### main ブランチ汚染チェック

ユーザーが「コミットして」「push して」と言ったとき、現在ブランチが `main` / `master` / `production` の場合は **作業前にブランチを切る** ことを提案する:

```
警告: 現在 main にいます。直接コミットを避けるため、
新規 feature branch を切ることを推奨します。
切替えますか? (推奨: feat/<提案 slug>)
```

---

## 4. main を feature branch に取り込む（同期）

feature branch 作業中、main の変更を取り込みたいとき:

### 推奨: rebase 方式（線形履歴）

```bash
git fetch origin
git rebase origin/main
# conflict が出たら git-conflict-resolver で解析
git rebase --continue   # 解決後
# まだ push してないコミットなら通常 push
git push                # 既に push 済みなら force-with-lease 必須（要ユーザー確認）
git push --force-with-lease
```

### 代替: merge 方式（マージコミットが残る）

```bash
git fetch origin
git merge origin/main
# conflict が出たら解決後 commit
git push
```

### 判断基準

| 状況                                          | 推奨                                     |
| --------------------------------------------- | ---------------------------------------- |
| まだ誰も pull してない自分専用 feature branch | rebase（履歴が綺麗）                     |
| 他の人 / 別マシンが pull 済みの可能性         | merge（force push 不要）                 |
| feature branch が長命（5 日以上）             | merge（rebase の conflict 累積を避ける） |

---

## 5. Pull Request 作成

### 5.1 PR タイトル

- Conventional Commits と同じ形式: `feat(scope): subject`
- 70 文字以下

### 5.2 PR 本文テンプレート

```markdown
## Summary

<1-3 bullet points>

## Test plan

- [ ] <verification step 1>
- [ ] <verification step 2>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 5.3 作成コマンド

```bash
gh pr create --title "feat(tasks): add priority sorting" --body "$(cat <<'EOF'
## Summary
- Add `priority` column to tasks table
- Update TaskTree to sort by priority desc

## Test plan
- [ ] Verify sort order in TaskTree
- [ ] Verify migration runs cleanly

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 5.4 PR 作成前チェック

```bash
git status                          # uncommitted がないか
git log main..HEAD --oneline        # main からの差分コミット一覧
git diff main...HEAD --stat         # 変更ファイル一覧
gh pr list --head $(git branch --show-current)  # 既存 PR がないか
```

---

## 6. merge / rebase / squash の判断（PR マージ時）

### 判断フローチャート

```
PR を main にマージしたい
│
├─ コミット履歴の粒度を残したい（bisect / blame 重視）
│   └─→ Rebase and Merge（線形履歴 + 各コミット保持）
│
├─ WIP コミットが多く、1 PR = 1 論理変更で十分
│   └─→ Squash and Merge（推奨。履歴が綺麗）
│
└─ feature の分岐構造を履歴に残したい / 大型機能の統合
    └─→ Create a Merge Commit（--no-ff、分岐点が見える）
```

### 各方式の特性

| 方式             | 履歴                 | bisect | blame | 推奨ケース                        |
| ---------------- | -------------------- | ------ | ----- | --------------------------------- |
| Squash and Merge | 1 PR = 1 commit      | 粗い   | 粗い  | WIP の多い個人開発 / 短命 PR      |
| Rebase and Merge | 各 commit 保持・線形 | 良好   | 良好  | コミット粒度が綺麗な PR           |
| Merge Commit     | 分岐構造保持         | 良好   | 良好  | 大型機能 / OSS / 長期プロジェクト |

### デフォルト推奨

- **個人開発 / 小規模 (life-editor 等)**: Squash and Merge
- **大型機能・複数人レビューあり**: Rebase and Merge
- **rebase 禁忌**: 他の人がそのブランチに基づいて作業している場合（Pro Git §3.6）

### コマンド例

```bash
# Squash merge (推奨デフォルト)
gh pr merge <PR#> --squash --delete-branch

# Rebase merge
gh pr merge <PR#> --rebase --delete-branch

# Merge commit
gh pr merge <PR#> --merge --delete-branch
```

`--delete-branch` で merge 後の feature branch 自動削除（推奨）。

---

## 7. マージ後のクリーンアップ

```bash
# ローカルで main 最新化
git checkout main
git pull --rebase origin main

# ローカル feature branch 削除（リモートは --delete-branch で削除済み）
git branch -d feat/<slug>            # マージ済みなら -d で削除可
# git branch -D は強制削除なので使わない（マージ確認をスキップする）

# 死んだリモート参照の掃除
git fetch --prune
```

---

## 8. lockfile の取り扱い

`package-lock.json` / `yarn.lock` / `Cargo.lock` を手動マージするのは危険。conflict 時は `git-conflict-resolver` 参照。

PR 作成時の lockfile 変更は通常 OK。ただし lockfile **だけ** が変更されている PR は依存更新としてレビュー必須。

---

## 9. 起動条件

- 「ブランチ切って」「branch 作って」「PR 作って」「PR を出して」
- 「main を取り込む」「rebase」「squash」「merge して」
- 「マージ方法どれにする?」
- main / master ブランチで作業しようとしているとき
- `git-orchestrator` agent からの委譲

---

## 10. 参考一次ソース

- DORA Capabilities (Trunk-Based Development): https://dora.dev/capabilities/trunk-based-development/
- Trunk Based Development (Short-Lived Feature Branches): https://trunkbaseddevelopment.com/short-lived-feature-branches/
- GitHub Docs (About merge methods): https://docs.github.com/articles/about-merge-methods-on-github
- Atlassian (Merging vs. Rebasing): https://www.atlassian.com/git/tutorials/merging-vs-rebasing
- Pro Git §3.6 (Perils of Rebasing): https://git-scm.com/book/en/v2/Git-Branching-Rebasing
