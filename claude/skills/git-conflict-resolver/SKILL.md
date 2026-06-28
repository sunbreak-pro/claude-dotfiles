---
name: git-conflict-resolver
description: Analyze merge / rebase conflicts and propose resolution strategy. Reads both sides, classifies the conflict type (logic / lockfile / generated / formatting), and presents a recommended merge for each file. Does NOT auto-resolve — user confirmation is mandatory before any edit. Triggers include "conflict", "コンフリクト", "競合", "CONFLICT (content)", "Automatic merge failed", "merge conflict", "rebase conflict", git status showing "Unmerged paths".
---

MANDATORY FIRST ACTION: Output `<The git-conflict-resolver will launch>` before doing anything else.

# Git Conflict Resolver — 解析と提案専用

このスキルは **conflict を解析して提案するだけ**。実際の編集はユーザー確認後に行う。
自動解決は明示的な許可がない限り**しない**（lockfile の例外は §4 参照）。

---

## 1. 解析フロー

### Step 1: 状況把握

```bash
git status                           # Unmerged paths を一覧
git diff --name-only --diff-filter=U # conflict ファイルのみ抽出
git diff --check                     # マーカー漏れ・空白エラー検出
```

### Step 2: コンフリクトの種別判定

各 conflict ファイルを Read ツールで開き、以下に分類する:

| 種別                  | 特徴                                       | 対応                                                   |
| --------------------- | ------------------------------------------ | ------------------------------------------------------ |
| **logic conflict**    | 同一行で異なるロジック変更                 | 両側の意図解説 + 推奨マージ案を提示                    |
| **lockfile conflict** | package-lock.json / yarn.lock / Cargo.lock | §4 の自動再生成手順を提案                              |
| **generated file**    | dist/ build/ schema dump 等                | 「再生成すれば良い」旨を提案、手動編集しない           |
| **formatting only**   | 空白 / インデント / import 順 のみ         | 「片側採用 + フォーマッタ実行」を提案                  |
| **rename collision**  | 片側で rename / 片側で edit                | git の rename 検出を確認、ファイル名側を尊重するか提示 |

### Step 3: 両側の意図を読む

```bash
git log --merge --oneline                # マージ関連のコミット一覧
git log --merge -p -- <conflicted-file>  # ファイル単位の関連コミット詳細
git diff :1:<file> :2:<file>             # base vs ours の差分
git diff :1:<file> :3:<file>             # base vs theirs の差分
```

注: `:1:` = 共通祖先 / `:2:` = ours / `:3:` = theirs

### Step 4: 提案フォーマット（必須出力）

```markdown
## Conflict Analysis

### 検出された conflict

- `path/to/file1.ts`(logic conflict)
- `package-lock.json`(lockfile conflict)
- `dist/bundle.js`(generated file)

### `path/to/file1.ts` の解析

**ours（HEAD: feat/x）の意図**:
<コミット履歴と diff から推定したロジック>

**theirs（main）の意図**:
<同上>

**推奨マージ**:
\`\`\`typescript
// 両側の意図を統合した最終形
\`\`\`

理由: <なぜこの統合が正しいか / 副作用がないか>

### `package-lock.json`

→ §4 の再生成手順を推奨。手動編集は禁止。

### `dist/bundle.js`

→ 再生成可能ファイル。`npm run build` で再生成 → ステージングを推奨。

---

## 確認事項

1. `path/to/file1.ts` の推奨マージで進めますか? (yes / 修正案を提示 / 自分で編集する)
2. lockfile は再生成手順で進めますか?
3. 全 conflict を解決した後、`git rebase --continue` または `git commit` のどちらの完了コマンドを使いますか?
```

---

## 2. 編集実行（ユーザー OK 後のみ）

```bash
# Step 1: ユーザー承認を得てから Edit ツールでファイル編集
# Step 2: ステージング（必ず個別ファイル指定）
git add path/to/file1.ts
git add path/to/file2.ts

# Step 3: マーカー残存チェック
git diff --check

# Step 4: 完了コマンド（merge 中 / rebase 中で異なる）
git status   # "rebase in progress" / "All conflicts fixed but you are still merging" を見て判断
# rebase 中
git rebase --continue
# merge 中
git commit   # default commit message が入る、編集して保存
```

---

## 3. マーカー読み方（zdiff3 推奨）

`merge.conflictstyle = zdiff3` を有効にしている場合、3-way 表示で共通祖先が見える:

```
<<<<<<< ours
const timeout = 5000;
||||||| base
const timeout = 3000;
=======
const timeout = 10000;
>>>>>>> theirs
```

→ base を起点に「ours が +2000」「theirs が +7000」と読める。両側が同じ意図（タイムアウト緩和）なら theirs（10000）採用が妥当、と推論できる。

設定推奨（git-workflow §5.1）:

```bash
git config --global merge.conflictstyle zdiff3
```

---

## 4. lockfile の安全な解決

**手動マージは絶対にしない**。dependency tree を破壊する。

### npm (package-lock.json)

```bash
git checkout --theirs package-lock.json   # または --ours
npm install --package-lock-only           # 差分を自動再生成
git add package-lock.json
```

### yarn

```bash
git checkout --theirs yarn.lock
yarn install
git add yarn.lock
```

### pnpm

```bash
git checkout --theirs pnpm-lock.yaml
pnpm install --lockfile-only
git add pnpm-lock.yaml
```

### Cargo (Rust)

```bash
git checkout --theirs Cargo.lock
cargo generate-lockfile
git add Cargo.lock
```

### 判断: --ours か --theirs か

- 自分の feature branch に main を取り込む rebase / merge の場合:
  - **--theirs を採用**（main の依存版を取る）→ 再生成
- main から feature を取り込む（PR マージ）の場合:
  - GitHub の merge UI で完結することが多い。手元で解決する場合は **--theirs**（feature の依存版）→ 再生成

迷ったら **どちらでも良い**（再生成で正規化される）。重要なのは手動編集しないこと。

---

## 5. generated file の取り扱い

`dist/` `build/` `out/` `target/` 等のビルド成果物が conflict した場合:

1. ビルド成果物が `.gitignore` に入っていないか確認 → 入れるべきなら入れて `git rm --cached` で除外
2. 入っていない場合は再生成: `npm run build` / `cargo build` 等
3. 再生成結果をステージング

**ビルド成果物を手動マージしない**。バイナリ的に壊れる可能性が高い。

---

## 6. 解決を諦めて中断する手順

```bash
# merge を中断
git merge --abort

# rebase を中断
git rebase --abort

# cherry-pick を中断
git cherry-pick --abort
```

これで conflict 発生前の状態に戻る。安全。

---

## 7. rerere（自動キャッシュ）

`rerere.enabled = true` にしておくと、同一 conflict の再発時に過去の解決を自動再適用する。
特に rebase で同じコミットを繰り返し当て直すケースで威力を発揮する。

```bash
git config --global rerere.enabled true   # 一度だけ
git rerere status                          # 現在キャッシュされている解決
git rerere diff                            # 直近の自動適用差分
```

詳細: Pro Git §7.9

---

## 8. 起動条件

- ユーザーが「conflict」「コンフリクト」「競合」「マージ失敗」「rebase 中に止まった」と言ったとき
- `git status` 結果に `Unmerged paths:` または `you are currently merging` / `you are currently rebasing` が含まれるとき
- git 操作の出力に `CONFLICT (content):` / `Automatic merge failed` が現れたとき
- `git-workflow` skill からの委譲

---

## 9. 非対象（このスキルでは扱わない）

- conflict 防止のためのブランチ運用 → `git-branch-flow`
- コミットメッセージ規約 → `git-workflow`
- 状況判断と委譲 → `git-workflow` skill

---

## 10. 参考一次ソース

- Pro Git §7.9 (Rerere): https://git-scm.com/book/en/v2/Git-Tools-Rerere
- git-rerere(1): https://git-scm.com/docs/git-rerere
- Atlassian (How to resolve merge conflicts): https://www.atlassian.com/git/tutorials/using-branches/merge-conflicts
