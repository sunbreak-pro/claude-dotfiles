# HISTORY.md - 変更履歴

### 2026-07-27 - Opus 5 向けハーネス調整 第 1 弾（出力長規定 / session-verifier 軽量化）

#### 概要

Opus 5 の公式ドキュメント（「自己検証は既定挙動なので旧世代から引き継いだ検証指示は過剰検証を招く。削除せよ」「effort を下げても応答長は縮まらないので長さはプロンプトで指定せよ」）に合わせ、出力の量を縛る規定を新設し、session-verifier からモデルが自律的に行う汎用チェックを削った。

#### 変更点

- **output-styles/tone-persona.md**: 「応答の量とかたち」節を新設。既定は短く / 見出し・表・箇条書きは項目 3 つ以上のときだけ / 作業報告は「何をしたか・結果どうなったか・次に判断が要る点」の 3 点に絞る / 差分は変更箇所のみ・長い出力は `file.ts:42` 形式で示す / 長い場合は結論を 3 行以内で先出し / ユーザーの長さ指定を最優先。自己確認リストに「聞かれていないことまで書いていないか」を追加
- **rules/tone.md**: 正本が tone-persona 側であることを示す参照に加え、要点 3 つ（既定は短く / 報告は 3 点 / 全文を貼らず `file.ts:42` で示す）を実体として記載。output style はメイン会話にしか届かずサブエージェントのコンテキストには入らないため、`rules/` 経由でないと最も報告が長くなる相手に規定が届かない
- **CLAUDE.md**: 口調章に「応答の量」節を追加。同章の冒頭が「tone-persona を正本として直し、この章と tone.md を追随させる」と定めているのに従ったもの。output style が外れた場面での保険も兼ねる
- **skills/session-verifier/SKILL.md**: Gate 5（Structural Review）と Gate 6（Bug Pattern Scan）を統合し、Gate 5「プロジェクト固有ルールの整合」1 本に集約。React / TypeScript / State 管理の汎用バグチェックリストと、汎用コード品質チェック（未使用 export・`console.log`・コメントアウト・TODO）を削除。残したのは CLAUDE.md と `coding-principles.md` に明文化されたプロジェクト固有規約、多点同期の確認、known-issues 照合のみ（いずれもモデルが事前に知りようがない情報）。178 → 147 行
- **skills/session-verifier/SKILL.md（ルール節・frontmatter）**: 「汎用バグ検出・一般的なコード品質チェックを手順として書き足さない」を明記して再追加を抑止。description も「structural review / bug pattern analysis」から「project-specific consistency checks」へ追随
- **agents/role-engineer.md**: セルフ検証フローの記述「構造レビュー / バグパターン分析」を「プロジェクト固有ルールの整合確認」へ更新
- **独立レビュー（role-qa 監査）の反映**: (a) 「読み手が次の判断に要らない情報は書かない」が比喩まで削りかねないため「短くするために比喩と結論の根拠は削らない」を明記、(b) スキル・エージェントが出力フォーマットを明示している場合はそちらを優先する旨を追加（session-verifier の Verdict や role-\* の引き継ぎ書式を潰さないため）、(c) 箇条書きは「3 つ以上でも地の文で流せるなら文章を優先」を追記、(d) Gate 2 に「`no-console` は `eslint:recommended` に含まれないため、lint 設定に無ければ 1 度だけ finding として報告し恒久対処として lint ルール追加を提案」を追加（Gate 6 削除で唯一純減となった検査の受け皿）、(e) Gate 5 見出しを図・Verdict 表と揃えて `Project Rules（プロジェクト固有ルールの整合）` に、Verdict の Coverage 行に `⏭️` を追加

### 2026-07-12 - statusline 新 3 行デザイン

#### 概要

`claude/statusline-command.mjs` を全面書き換えし、1 行目に使用率バー（context / 5h / 7d rate limits）、2 行目に model 名 + reasoning effort、3 行目に cwd + git branch + worktree 名を表示する新レイアウトへ移行した。

#### 変更点

- **line 1**: `context_window.used_percentage` と `rate_limits.five_hour / seven_day` を 10 マス幅のバー + % 表示（50% 以上で黄、80% 以上で赤に段階着色）。値が null / 欠損ならグレーの空バーで退化
- **line 2**: `model.display_name` + `effort.level`（effort 対応モデルのみ表示）
- **line 3**: cwd（home は `~` 短縮）+ git branch（dirty で `*`）+ worktree 名（`worktree.name` → `workspace.git_worktree` の順で参照）
- **削除**: 旧デザインの user@host 表示・セッションコスト表示・per-chat memory の進行中タスク表示（`▶ task` 行）
- **安全設計の維持**: git 呼び出しは guard + timeout + `--no-optional-locks`、stdin JSON の parse 失敗や条件付きフィールド欠損でもクラッシュしない
