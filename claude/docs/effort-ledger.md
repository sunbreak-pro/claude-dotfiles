# Effort Ledger — xhigh / max を使ってよいタスク種別の台帳

既定は `high`（Fable 5.1 の公式既定でもある）。`xhigh` / `max` は「high より確実に良くなる」と**実測で確認できたタスク種別**にだけ使う。この台帳に行が無い種別は high のまま。

公式の目安（platform.claude.com/docs/en/build-with-claude/effort、2026-09-02 閲覧）: `xhigh` = 30 分を超える長時間の agentic / coding 作業でトークン予算が数百万規模のもの、`max` = 最深の推論が要る作業。日常の実装・修正・レビューは `high` で足りるとされている。

## 記録の仕方

同じタスク（または同種のタスク）を `high` と `xhigh` で 1 回ずつ回し、結果の差を書く。差が「品質が上がった」と言えるときだけ採用する。時間と費用も書く（`/cost` の値で足りる）。

| 日付 | タスク種別 | high の結果 | xhigh / max の結果 | 採否 | 備考 |
| ---- | ---------- | ----------- | ------------------ | ---- | ---- |
|      |            |             |                    |      |      |

## 採用済み（xhigh / max を使う種別）

（なし — 2026-09-02 時点）

## 運用

- メインセッションの effort は `/effort high` が既定。採用済み種別に該当するタスクを受けたら、着手前に「`/effort xhigh` を貼ってから再送してください」と 1 行提案する（Claude 側から effort は変えられない）。
- サブエージェントは frontmatter に `effort:` を書かない（既定を継承）。採用済み種別のエージェントにだけ `effort: xhigh` を書く。
- `/effort ultracode`（xhigh + dynamic workflow orchestration）も同じ扱い。
