---
name: task-tracker
description: Track task progress in per-chat memory/ and history/ files (or legacy MEMORY.md/HISTORY.md). Also supports a read-only inspect mode for dashboarding other chats' progress without writes. Use at the start and end of every work session, when switching tasks, or when inspecting cross-chat status. Triggers include "task start", "task end", "session start", "session end", "作業開始", "作業終了", "作業途中", "中断", "session pause", "task-tracker inspect", "inspect chats", "他チャットの状況", "per-chat ダッシュボード", and any task status update.
---

> セッション開始 / 終了時に呼び出す。手動呼び出しも可能。

「task-trackerを起動します」と表示する。

# Task Tracker

作業開始時・途中中断時・終了時にタスク進捗と履歴を一貫して更新する。
**並行チャット衝突回避のため per-chat ファイル方式を標準とし、従来 MEMORY.md/HISTORY.md 方式へのフォールバック (legacy モード) も維持する**。複数タスクの並行管理に対応。

## 動作モード (起動時自動判定)

判定は 2 段。**Step 1 で書き込み有無を決め、Step 2 で読み書き先を決める**。

### Step 1: 引数チェック (書き込み有無)

| 起動引数                             | モード             | 書き込み                                                                 |
| ------------------------------------ | ------------------ | ------------------------------------------------------------------------ |
| `inspect` または `inspect --history` | **inspect モード** | なし (Read only。出力フォーマットは「inspect モードフロー §手順 5」参照) |
| 上記以外 (start / pause / end 等)    | **通常モード**     | あり                                                                     |

判定詳細: Skill tool の `args` 文字列を空白で split した最初のトークン (= サブコマンド) が `inspect` と一致するときに inspect モード起動。例: `args="inspect"` / `args="inspect --history"` は起動、`args="start"` / `args="`タスクの inspect`"` (文中の inspect) は起動しない。`args` 未指定時は通常モード扱い。

inspect モードは Step 2 で per-chat 判定が **成立** しているときのみ使用可能 (legacy では即エラー停止。詳細は inspect モードフロー参照)。

### Step 2: ディレクトリ判定 (書き込み先 / 読み取り先)

| 条件                                                                                                                  | モード              | 通常モード時の書き込み先                                                |
| --------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------- |
| `.claude/memory/` が存在し、**かつ** `.claude/memory/INDEX.md` または `.claude/memory/chat-*.md` のいずれかが存在する | **per-chat モード** | `memory/chat-<self>.md` + `history/chat-<self>.md` + 各 INDEX.md 再生成 |
| 上記条件が不成立 (`.claude/memory/` が存在しない、または INDEX.md も chat-\*.md も無い)                               | **legacy モード**   | `.claude/MEMORY.md` + `.claude/HISTORY.md` (従来通り)                   |

判定条件に **マーカーの AND** を入れている理由: 他プロジェクトで `.claude/memory/` が別目的で偶然存在するケース（例: `code-teacher` の学習素材）で誤判定するのを防ぐ。per-chat 機構の意思表示マーカーは **`INDEX.md`（旧・tracked 時代）と `chat-*.md`（tracked・SSOT）のどちらか**。スクリプト方式では INDEX.md が git 非追跡 (.gitignore 済) になり新規 clone で hook 実行前に存在しないことがあるため、**追跡される `chat-*.md` の存在もマーカーに含める**。

per-chat モードでは `<self>` を `.claude/comm/.session-name` から取得。**以下のいずれかに該当する場合はエラーで停止**（事故防止 — 自己判定不能のまま書き込むと別チャットの memory を上書きする恐れ）:

- `.session-name` ファイルが存在しない
- 中身が空 (空白・改行のみを含む)
- 中身に `chat-` プレフィックスが含まれる（仕様違反 — 本体部分のみを書く）
- 中身に改行を除く空白文字や `/`, `.`, `..` 等のパストラバーサル文字が含まれる

エラー時の提示メッセージ例: 「`.claude/comm/.session-name` を `echo <本体部分のみ> > .claude/comm/.session-name` で正しく作成してください（例: `engineer`, `main`, `qa` 等。`chat-` プレフィックスは不要）」

## セッション状態の判定

起動時、ユーザー発話や状況から「どのフローを実行するか」を判定する。かつて専用のセッション管理エージェントが担っていた状態判定を task-tracker 本体へ統合した。判断に迷ったら推測せず確認する。

### 入力シグナル → 状態の対応表

| ユーザー発話・状況                                              | 判定    | 実行するフロー                                               |
| --------------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| 「作業開始」「session start」「再開する」「次のタスクやる」     | START   | 作業開始フロー（multi-session-coordinator 競合チェック込み） |
| 「進捗確認」「MEMORY 見せて」「今どこまで」「他チャットの状況」 | INSPECT | inspect モードフロー（Read のみ。書き込みなし）              |
| 「中断」「途中保存」「session pause」「ちょっと止める」         | PAUSE   | 作業途中フロー                                               |
| 「作業終了」「コミットして」「session end」「PR 出せる状態に」  | END     | session-verifier を先に実行 → 作業終了フロー                 |
| 曖昧（「これで終わり？」「進める？」など）                      | ASK     | 下記「判定が曖昧なときの確認手順」                           |

### 判定が曖昧なときの確認手順

1. 現在の memory（per-chat: `.claude/memory/chat-<self>.md` / legacy: `.claude/MEMORY.md`）を Read して状態を把握する
2. ユーザーに具体的な状態を提示して確認する:

   ```
   現在の状態:
   - 進行中: 🔧 タスク名（着手日: YYYY-MM-DD）
     - 現在: ...
     - 次: ...

   ご希望の操作はどれですか？
   1. 作業を再開（次のサブタスクへ）
   2. 中断（途中保存して終了）
   3. 完了（HISTORY に記録してコミット）
   ```

3. 回答を得てから対応するフローを実行する

## 対象ファイル

### per-chat モード

| ファイル                                         | 役割                                              | 操作                                      |
| ------------------------------------------------ | ------------------------------------------------- | ----------------------------------------- |
| `.claude/memory/chat-<self>.md`                  | 当該チャットのタスクトラッカー (3 セクション構成) | 更新                                      |
| `.claude/memory/INDEX.md`                        | 全チャット集約ビュー (across all chats)           | 自動再生成（スクリプト方式は git 非追跡） |
| `.claude/history/chat-<self>.md`                 | 当該チャットの変更履歴 (詳細形式)                 | 先頭追記                                  |
| `.claude/history/INDEX.md`                       | 全チャット集約ビュー (時系列降順 5 件)            | 自動再生成（スクリプト方式は git 非追跡） |
| `.claude/history/archive/YYYY-MM/chat-<self>.md` | ローリングアーカイブ (5 件超過時の移動先)         | 必要時新規作成                            |

### legacy モード

| ファイル                     | 役割                                                | 操作       |
| ---------------------------- | --------------------------------------------------- | ---------- |
| `.claude/MEMORY.md`          | タスクトラッカー (進行中/直近の完了/予定 の 3 構成) | 更新       |
| `.claude/HISTORY.md`         | 変更履歴 (詳細形式対応)                             | 先頭追記   |
| `.claude/HISTORY-archive.md` | ローリングアーカイブ                                | 必要時追加 |

## ファイル形式 (両モード共通)

per-chat モードの `chat-<self>.md` も legacy モードの `MEMORY.md` / `HISTORY.md` も**同じ見出し構造**を持つ。違いはファイル名と分割粒度だけ。

### MEMORY 形式

```markdown
# MEMORY (chat-<self>) ← per-chat モード時。legacy では `# MEMORY.md - タスクトラッカー`

## 進行中

### 🔧 タスク名（着手日: YYYY-MM-DD）

**対象**: `関連ファイル/ディレクトリ`
**計画書**: `.claude/docs/vision/plans/YYYY-MM-DD-task-slug.md`

- 前回: —
- 現在: 現在取り組んでいるサブタスク
- 次: 次に予定しているサブタスク

### ⏸️ 別のタスク名（着手日: YYYY-MM-DD）

**対象**: `関連ファイル/ディレクトリ`

- 前回: 前回完了したサブタスク
- 現在: 中断時の作業内容
- 次: 再開時に取り組むサブタスク

## 直近の完了

- タスク名 ✅（YYYY-MM-DD）
- 別のタスク名 ✅（YYYY-MM-DD）

## 予定

- 次に着手予定のタスク1
- 次に着手予定のタスク2
```

### HISTORY 形式

```markdown
# HISTORY (chat-<self>) ← per-chat モード時。legacy では `# HISTORY.md - 変更履歴`

### YYYY-MM-DD - タイトル

#### 概要

変更の概要を1〜2文で記述。

#### 変更点

- **カテゴリ名**: 具体的な変更内容
- **カテゴリ名**: 具体的な変更内容
```

### フォーマットルール

- 各エントリは `### YYYY-MM-DD - タイトル` で開始する（降順、最新が先頭）
- `#### 概要` と `#### 変更点` の2サブセクションで構成
- 変更点は箇条書きで、カテゴリ（太字）+ 説明の形式
- 中断記録は簡易形式: `- YYYY-MM-DD: [途中] タスク名 — 進捗の要約`

### MEMORY セクション規約

- **進行中**: 並行作業中のタスク群。各タスクは `###` ブロック
  - ステータスアイコン: 🔧 作業中 / ⏸️ 中断中
  - **対象**: 関連するファイルパスやディレクトリ
  - **計画書**: 関連計画書のパス (あれば)
  - 前回/現在/次の3行で進捗追跡
  - タスクなしは `（なし）`
- **直近の完了**: 最近完了したタスク (最大3件)。古いものは HISTORY 記録済
- **予定**: 次に着手予定 (順序あり)
- per-chat モードでは複数タスク並行 = 1 つの `chat-<self>.md` 内で並ぶ

## INDEX 再生成ロジック (per-chat モード専用)

メモリ/履歴書き込み後に必ず実行する。

### 再生成方式の自動判定 (重要)

**`.claude/hooks/regen-index.sh` が存在するかどうか** で方式が分かれる:

| 条件                                | 方式                          | INDEX.md の git 扱い           | 再生成手段                                                                 |
| ----------------------------------- | ----------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| `.claude/hooks/regen-index.sh` 存在 | **スクリプト方式 (推奨・新)** | **git 非追跡 (.gitignore 済)** | `bash .claude/hooks/regen-index.sh` を 1 回実行するだけ (LLM 書き換え禁止) |
| 同スクリプト不在                    | **インライン方式 (legacy)**   | git 追跡                       | 下記の手順で LLM が INDEX.md を書き直す                                    |

- **スクリプト方式**: INDEX.md は派生物 (SSOT は各 `chat-*.md`) として git 追跡を外し、並行チャットのマージ衝突源を物理的に排除した方式。task-tracker は `bash .claude/hooks/regen-index.sh` を実行するだけでよく、**INDEX.md を自分で Edit / Write しない**。staging もしない (§ステージング参照)。
- **インライン方式 (legacy)**: スクリプトを導入していない既存プロジェクト向け。従来通り LLM が下記ロジックで INDEX.md を全文再生成し、tracked ファイルとして stage する。

以下の「memory/INDEX.md 再生成」「history/INDEX.md 再生成」手順は **インライン方式でのみ** 使用する (スクリプト方式ではスクリプトが等価の処理を決定論的に行う)。

### memory/INDEX.md 再生成

1. `.claude/memory/chat-*.md` を全 scan (`INDEX.md` 自身は除外)
2. 各ファイルから「進行中」「直近の完了」「予定」セクションの内容を抽出
3. across all chats で 1 ファイルにまとめる:

```markdown
# MEMORY INDEX (auto-generated by task-tracker)

> 各 `chat-*.md` の集約ビュー。SSOT は各 `chat-*.md`。

最終更新: YYYY-MM-DD HH:MM:SS (chat-<self>)

---

## 進行中 (across all chats)

- [chat-engineer] Data Unification DU-B (DU-B-3 着手判断待ち) — 着手: 2026-05-21
- [chat-main] per-chat MEMORY 機構実装 (Phase 1 検証中) — 着手: 2026-05-23

## 直近の完了 (across all chats, 各チャット最大 3 件)

- [chat-engineer] DU-B-2 ✅ (2026-05-23)
- [chat-main] Phase 0 調査 ✅ (2026-05-23)

## 予定 (across all chats)

- [chat-main] FileChanged 計画 Phase 0 仕様検証スパイク
```

### history/INDEX.md 再生成

1. `.claude/history/chat-*.md` を全 scan
2. 各ファイルから `### YYYY-MM-DD - タイトル` の先頭ブロックを抽出
3. across all chats で時系列降順 5 件:

```markdown
# HISTORY INDEX (auto-generated by task-tracker)

> 各 `chat-*.md` の集約ビュー。SSOT は各 `chat-*.md`。

最終更新: YYYY-MM-DD HH:MM:SS (chat-<self>)

---

## 直近エントリ (across all chats, 時系列降順 5 件)

- 2026-05-23 [chat-main] Phase 1 完了 (per-chat 機構ブート)
- 2026-05-23 [chat-engineer] DU-B-2 完了 (taskMapper 2 行分割)
- ...
```

## 作業開始フロー

### Step 0 前 — 並行チャット競合チェック（条件付き）

他チャットが同時に活動している可能性がある場合のみ実行する（単独セッションならスキップ可。かつて専用のセッション管理エージェントの START フローが担っていた手順を統合）。

- `.claude/active-sessions/` に自分以外のセッションファイルがある、または共有ファイル（memory/history）を複数チャットが触りうる構成のとき、**multi-session-coordinator を先に起動**して競合の有無を確認する（`.claude/active-sessions/<my-session-id>.json` の存在で起動済みかを判定。未起動なら呼び出す）
- 競合が解消されてから以降の Step に進む

### Step 0 — モード判定 + self 解決

1. `test -d .claude/memory/` で per-chat モード判定
2. per-chat モードなら `cat .claude/comm/.session-name` で self 取得
   - 不在時: **エラー停止**。「`echo <name> > .claude/comm/.session-name` を実行してから再試行してください」と提示
3. legacy モードなら以降の "MEMORY.md/HISTORY.md" 参照を従来通り

### Step 1 以降

1. Read 対象を mode に応じて決定:
   - per-chat: `.claude/memory/chat-<self>.md` (なければ MEMORY 形式の初期テンプレートで作成)
   - legacy: `.claude/MEMORY.md`
2. 「予定」の先頭タスクを「進行中」に移動し `### 🔧` ブロックとして追加:
   - `### 🔧 タスク名（着手日: YYYY-MM-DD）`
   - **対象**: 関連ファイルを推定して記載
   - 前回: —、現在: 最初のサブタスク、次: 2番目のサブタスク
3. 「予定」から移動したタスクを削除
4. 既に「進行中」にタスクがある場合は追加で開始可能 (`（なし）` は削除)
5. Edit で当該ファイルを更新
6. **per-chat モードのみ**: INDEX 再生成（§再生成方式の自動判定 — スクリプト方式は `bash .claude/hooks/regen-index.sh` 実行のみ。LLM で書き換えない）
7. 更新結果をユーザーに表示

## 作業途中フロー

セッション終了時にタスクが未完了の場合に実行する。

1. Step 0 (モード判定 + self 解決) 同上
2. Read で対象 memory ファイル取得
3. 「進行中」の該当タスクのステータスを `⏸️` に変更 (`### 🔧` → `### ⏸️`)
4. 前回/現在/次を最新の進捗に更新
5. 該当 history ファイル先頭に中断記録追記:
   - per-chat: `.claude/history/chat-<self>.md` 先頭
   - legacy: `.claude/HISTORY.md` 先頭
   - 形式: `- YYYY-MM-DD: [途中] タスク名 — 進捗の要約`
6. 他の「進行中」タスクはそのまま維持
7. **per-chat モードのみ**: INDEX 再生成（§再生成方式の自動判定 — スクリプト方式は `bash .claude/hooks/regen-index.sh`）
8. 更新結果をユーザーに表示

## 作業終了フロー

> **実行タイミング = `session-verifier` が緑になった直後**（2026-08-10 ユーザー確定・life-editor `D-20260810-main-1`）。ユーザーの確認も、実装 PR の merge も待たない。「merge したら声をかけてください」でセッションを止めないこと — merge は人の手番なので、待つと終端が人待ちで固まる。実装 PR の状態は**書いた時点の実測**（open / merged）で記す。
>
> tracker の更新を実装ブランチに載せない運用のプロジェクトでは、専用ブランチ（life-editor は `chore/tracker-<chat>-YYYYMMDD`）を切って commit → PR まで進める。

1. Step 0 (モード判定 + self 解決) 同上
2. Read で memory + history 両ファイル取得 (並列)
3. memory ファイル更新:
   - 「進行中」から完了タスクの `###` ブロックを削除
   - 「直近の完了」の先頭に `- タスク名 ✅（YYYY-MM-DD）` 追加
   - 「直近の完了」が3件超過なら古いものを削除 (HISTORY 記録済)
   - 「進行中」に他タスクが残らない場合は `（なし）` を記載
4. history ファイル先頭 (`# HISTORY` 直後) に詳細エントリ追記:
   ```
   ### YYYY-MM-DD - タスク名
   #### 概要 (1〜2文)
   #### 変更点 (箇条書き)
   ```
5. 計画書アーカイブ (両モード共通・**実行者は本スキル**。code-plan-editor は参照のみで archive しない):
   - a. `.claude/docs/vision/plans/YYYY-MM-DD-*.md` パターンの実装プランファイルを Glob で確認 (fallback として `.claude/YYYY-MM-DD-*.md` legacy 配置も確認)
   - b. 完了タスクに関連する計画書を特定:
     - ファイル内の `**Task**:` がタスク名と一致
     - またはファイル名 slug がタスク名と部分一致
   - c. 該当ファイルが見つかった場合:
     - **乖離レビュー 3 行を計画書の Worklog へ必須記入**（下記）
     - Status を `COMPLETED` に更新 (Edit)
     - `.claude/archive/` に移動 (Bash: `mv`)
     - `.claude/archive/` が存在しない場合は作成してから移動
     - history エントリの完了記録に `（計画書: archive/ファイル名）` を付記
   - d. 該当ファイルがない場合はサイレントスキップ

   **乖離レビュー 3 行**（archive 前に必ず Worklog へ追記する。「特になし」も明記して省略しない）:

   1. **スコープ逸脱**: Scope 宣言の外を触ったか。触ったなら何をどういう判断で
   2. **AC 免除**: 満たせなかった Acceptance Criteria と、その扱い（免除したなら誰の承認で）
   3. **途中で出た判断の行き先**: 実装中に浮上した追加要望・QA の Suggestion・verifier の非 Blocking finding を、どこへ送ったか（判断キュー / Issue # / decisions の D-ID / 破棄）

   3 行のいずれかが**規約級**（今後の全作業に効くルールの話）なら、`decisions/` の台帳か `docs/known-issues/` へ昇格させる。ここで拾わなかった指摘は消えるので、行き先の空欄を残さない。

6. ローリングアーカイブ:
   - **per-chat モード**: 該当 `history/chat-<self>.md` が 5 件超過なら、最古エントリを `history/archive/YYYY-MM/chat-<self>.md` へ移動 (ディレクトリは必要時 mkdir)
   - **legacy モード**: 従来通り `HISTORY.md` 5 件超過 → `HISTORY-archive.md`
7. 他の「進行中」タスクはそのまま維持
8. **per-chat モードのみ**: INDEX 再生成（§再生成方式の自動判定 — スクリプト方式は `bash .claude/hooks/regen-index.sh`）
9. **scope-drift 事前検出** (per-chat モード必須 / legacy ではスキップ):

   作業終了フローで commit する前に、`git status --porcelain` を実行して **自分の管理対象外のファイルが dirty になっていないか** を確認する。並行チャットが書いた未コミット変更が自分の commit に巻き込まれる事故を構造的に防ぐ。

   #### 手順
   1. `git status --porcelain` を実行
   2. 出力を行ごとに parse し、各 path を以下のカテゴリに分類:
      - **自分の管理対象 (self-owned)** — commit 対象:
        - `.claude/memory/chat-<self>.md`
        - `.claude/history/chat-<self>.md`
        - `.claude/memory/INDEX.md` / `.claude/history/INDEX.md` — **インライン方式 (tracked) のときのみ** commit 対象。スクリプト方式では git 非追跡 (.gitignore 済) のため `git status` に現れず、stage もしない
        - `.claude/history/archive/YYYY-MM/chat-<self>.md` (該当時)
        - 完了タスクの計画書 (Step 5 で archive 移動した `.claude/docs/vision/plans/...` および `.claude/archive/...`)
        - **実装変更ファイル** (全変更コミット時のみ、ユーザーが明示したパス)
      - **他チャット由来 (foreign)** — 触ってはいけないもの:
        - 他チャットの `.claude/memory/chat-<other>.md` / `.claude/history/chat-<other>.md`
        - 他チャットの `.claude/comm/outbox/chat-<other>.md` (自分の outbox 以外)
        - 自分が触っていない実装ファイル (frontend/ shared/ supabase/ など)
      - **判別不能 (unknown)** — 上記いずれにも該当しない新規 untracked ファイルなど

   3. foreign または unknown が **1 件以上検出** されたら、ユーザーに以下を表示:

      ```
      ⚠️ scope-drift 検出: 自分の管理対象外の dirty file が <N> 件あります

      自分の管理対象外 (foreign):
        M  <path1>
        ?? <path2>
        ...

      判別不能 (unknown):
        M  <path3>
        ...

      この状態で commit すると、別チャットの作業や untracked ファイルを巻き込みます。
      推奨アクション:
        (a) これらを含めず自分の管理対象だけ pathspec で stage する (デフォルト)
        (b) ユーザーが意図的にこれらも含めたい場合は明示確認
        (c) commit を一時中断して別チャットへ確認

      ユーザーの判断を待ちます。"continue" でデフォルト (a) 実行、"abort" で commit 中断。
      ```

   4. ユーザーが "continue" と回答した場合:
      - pathspec で **self-owned のみを stage** (foreign / unknown は除外)
      - 既存 Step 10.b の per-chat モードのパス明示ステージング規約に従う
   5. ユーザーが "abort" と回答した場合:
      - commit / push を実行せず終了
      - memory / history への書き込みは既に完了している (本ステップは commit 段階のガード) ので、状態保存は影響なし
   6. foreign / unknown がゼロなら、何も警告せず Step 10.b に進む (通常フロー)

   #### 自己判別ロジックの詳細
   - `<self>` は Step 0 のモード判定で取得済の self 値を使用
   - foreign chat-\* の検出: `chat-(.+)\.md` 正規表現でマッチし、キャプチャ group が `<self>` と異なる場合
   - 計画書 path の判別: `git log --diff-filter=A` で作成者を見るのは重いので、本フローでは「完了タスクの計画書 (Step 5 で扱う) は self-owned」と扱う近似でよい (誤検出してもユーザー確認で訂正可能)
   - unknown は安全側 (foreign 扱い) で警告。**「黙って巻き込むより、無駄に警告するほうがマシ」** の原則

   #### 期待動作の例

   例 1 (foreign 検出): 別チャットが `shared/src/services/foo.ts` を編集中、自分が memory/history 更新 → 警告表示 → ユーザー "continue" → self-owned chat ファイルのみ stage → commit OK

   例 2 (drift なし): 自分の memory/history + 自分が編集した実装ファイルのみ dirty → 警告なし → 通常 Step 9.b へ

   例 3 (untracked 計画書あり): 自分が新規作成した `.claude/docs/vision/plans/2026-05-25-foo.md` が untracked → unknown 扱いで警告 → ユーザー "continue" でも除外されるため、明示的に「これも含めたい」と再指示が必要 → ユーザーが pathspec を渡す

10. コミット+プッシュ:
    - a. 変更種別の判定:
      - 計画書アーカイブが実行された (= 実装計画書を実装した) → **全変更コミット**
      - 計画書アーカイブなし (= メタファイルのみの更新) → **メタファイルのみコミット**
    - b. ステージング (mode 別):
      - **per-chat モード・メタファイルのみ**: パス明示で自チャット分のみ

        ```
        # スクリプト方式 (INDEX は git 非追跡 → stage しない):
        git add .claude/memory/chat-<self>.md .claude/history/chat-<self>.md
        # インライン方式 (legacy・INDEX tracked) のときだけ INDEX も追加:
        #   git add .claude/memory/INDEX.md .claude/history/INDEX.md
        ```

        - アーカイブ移動があれば該当 `history/archive/...` path も追加
        - **INDEX.md をスクリプト方式で `git add` しない** (ignore 済なので `-f` 無しでは弾かれ、付けても衝突源を復活させる)
        - **他チャットの `chat-*.md` は絶対に触らない (単一書込者原則)**

      - **per-chat モード・全変更**: **`git add -A` を原則禁止**。実装変更を含める場合も**明示的にファイルパスを列挙して stage する**（並行チャットの未コミット変更を巻き込む事故を構造的に防ぐため、本 per-chat 機構の中核設計）。例: `git add .claude/memory/chat-<self>.md .claude/history/chat-<self>.md <実装ファイル1> <実装ファイル2> ...`（INDEX.md はスクリプト方式では含めない。インライン方式のときのみ追加）
      - **legacy モード・メタファイルのみ**: `git add .claude/MEMORY.md .claude/HISTORY.md` (+ 必要なら HISTORY-archive.md)
      - **legacy モード・全変更**: `git add -A`（並行チャット運用でない単一セッションプロジェクトでのみ。並行運用プロジェクトは per-chat モードへの移行を推奨）

    - c. コミットメッセージ生成:
      - `git diff --cached --stat` でステージ済み変更確認
      - ステージ済みファイルなしならスキップ
      - メッセージ形式: `Update task tracker: {完了タスク名}` (全変更時は実装内容反映)
    - d. コミット実行: `git commit`
    - e. プッシュ実行: `git push`
    - f. 失敗時はエラーをユーザーに表示し、手動対応を促す

11. 更新結果をユーザーに表示
12. 計画書アーカイブを実行した場合（= 実装プランを完了した場合）は、**PR を出すか確認し、出すなら git-branch-flow へ委譲する**

## inspect モードフロー

他チャットの作業状況を一覧したいときに呼び出す。**書き込み一切なし** (memory/history 双方とも Read only、INDEX.md 再生成すらしない)。

### 起動条件

- ユーザーが「他チャットの状況見せて」「inspect」「per-chat ダッシュボード」等と発話
- multi-session-coordinator から「INDEX.md 鮮度が古いので直接 Read」と判断されたとき

per-chat モード判定 (Step 0 と同じ条件) を満たさない場合は inspect モードを起動せず即エラー停止し「per-chat 機構が未導入のプロジェクトでは inspect モードは使用不可」と提示する (legacy には共有ファイルしかなく意味がない)。

**優先順位**: `args` の先頭トークンが `inspect` の場合、後続トークン (例: `start` / `end`) は無視される。同様に start / end / pause フローでは inspect 引数を受け付けない (フローが交差しない設計)。

### 手順

1. Step 0 のモード判定のみ実行 (self 解決は不要、書き込みしないので `.session-name` の有無は無視可)
2. per-chat モード成立を確認 (不成立なら上記エラーで停止)
3. Glob `.claude/memory/chat-*.md` で全 chat ファイルを列挙 (`INDEX.md` は除外)
4. 各 chat ファイルを Read で並列取得 (subagent ではなく Read を複数同一メッセージで発行)
5. ダッシュボード整形:

   ```markdown
   # task-tracker inspect (across all chats)

   実行: YYYY-MM-DD HH:MM:SS

   ## chat-<name1> (最終更新 from file mtime)

   ### 進行中

   - 🔧 タスク名 (着手 YYYY-MM-DD) — 現在: ...

   ### 直近完了 (上位 3 件)

   ### 予定 (上位 3 件)

   ## chat-<name2>

   ...
   ```

6. ユーザーに表示。**memory/INDEX.md は再生成しない** (鮮度確認用に古いまま残す方が判断材料として有用)
7. オプションで `inspect --history` 引数があれば `.claude/history/chat-*.md` も同様に整形 (直近 3 エントリ抜粋)

### 禁止事項

- Edit / Write 一切禁止
- INDEX.md 再生成も禁止 (副作用ゼロを保つ)
- 他チャット ファイルの内容を勝手に解釈・要約しすぎない (原文の見出し抽出に留める)
- `git add` / `commit` / `push` 禁止

### 注意

- INDEX.md と inspect 結果が乖離していたら「INDEX が古い可能性。次回 task-tracker start/end で再生成される」と注記
- 自分自身の `chat-<self>.md` も含めて表示 (混乱回避)

## 注意事項

- 日付は実行時の日付を使用 (システムから取得)
- メモリ/履歴ファイルは3セクション構成 (進行中/直近の完了/予定) を厳守。他内容は追加しない
- HISTORY は先頭追記のみ (降順、最新が先頭)。既存行を編集しない
- **ローリングアーカイブ**:
  - per-chat モード: `history/chat-<self>.md` 5 件超過 → `history/archive/YYYY-MM/chat-<self>.md`
  - legacy モード: `HISTORY.md` 5 件超過 → `HISTORY-archive.md`
- 各ファイルの更新は Edit ツールを使用 (bash の sed / awk は使わない)
- 作業開始時は memory のみ更新 (history は終了時)
- 複数タスク並行時、作業終了は完了したタスクのみ処理。他進行中タスクには触れない
- 計画書の移動には `mv` コマンド (Bash) を使用 (Edit ではなく)
- 計画書なしタスクの完了時はアーカイブステップをサイレントスキップ
- コミットメッセージは英語で記述
- **per-chat モードの pathspec 原則**: 自チャットの chat ファイル (memory/chat-<self>.md + history/chat-<self>.md) のみ stage。INDEX.md はスクリプト方式では git 非追跡なので stage しない（インライン方式 = tracked のときだけ memory/INDEX.md + history/INDEX.md を追加）。他チャットの chat-\*.md は読み取り専用 (単一書込者原則)
- **`git add -A` は全変更コミット時のみ**。並行チャット未コミット変更が同居する作業ツリーではパス明示推奨
- **scope-drift 検出 (per-chat モード必須)**: 作業終了フロー Step 9 前哨で `git status --porcelain` を実行し、自分以外の dirty file を検出。検出時はユーザー確認を求める (foreign 巻き込み防止の構造的ガード)
- プッシュ失敗時 (リモート未設定、認証エラー等) はエラー表示してスキップ。コミット自体は維持
- コミット対象が空 (`git diff --cached` 空) はコミット・プッシュをスキップ
- **`.session-name` 不在時**: per-chat モードでは即エラー停止 (自己判定不能で他チャットファイルを上書きする恐れ)
- **INDEX 再生成失敗時**: per-chat モードで INDEX 再生成に失敗してもチャット別ファイルへの書き込みは成功扱いとし、INDEX は次回 task-tracker 実行で再試行 (致命扱いしない)
- **legacy → per-chat の移行**: 既存プロジェクトの `.claude/MEMORY.md` を凍結し新規エントリのみ per-chat にする場合、凍結ファイル先頭に「FROZEN since YYYY-MM-DD」マーカーを置く。task-tracker は `.claude/memory/` 存在で自動的に per-chat モードに切り替わるため、凍結マーカーは人間向けの注意書きとして機能 (ロジック判定は使わない)
- **inspect モードは副作用ゼロ**: Read のみで Edit / Write / INDEX 再生成 / git 操作いずれも行わない。per-chat モード成立時のみ使用可 (legacy では意味がなく即エラー停止)
- **sui-memory との境界**: タスク状態の正本は本スキル (per-chat memory/ + history/)。sui-memory はセッション横断の自動要約のみを担う。詳細は `rules/memory-boundary.md` を参照
