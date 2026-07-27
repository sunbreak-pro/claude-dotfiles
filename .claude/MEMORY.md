# MEMORY.md - タスクトラッカー

## 進行中

（なし）

## 直近の完了

- Opus 5 向けハーネス調整 第 1 弾（出力長規定の新設 / session-verifier Gate 5・6 統合） ✅（2026-07-27）
- statusline 新 3 行デザイン（使用率バー / model+effort / 場所情報） ✅（2026-07-12）

## 予定

- `hooks/adversarial-review-gate.mjs` の発火条件を絞る（コード拡張子・認証／秘密情報まわりのパスのみ。現状は `.md` 1 行修正でも Stop でブロックする）
- role-\* エージェントのモデルティア見直し（全て opus/xhigh のまま。メインが opus-5/high になり上下が逆転している）
- `claude/docs/plans/2026-07-19-multiagent-harness-cost-optimization.md` の前提改訂（全編がメイン = `fable-5[1m]` 固定を前提に書かれているが settings は opus-5 に変更済み。§5.6 手順 4 の session-verifier 記述も今回の変更で陳腐化）
- `rules/skill-management.md` に「組み込みスキル（`security-review` 等）は `skills/` に実体を持たず frontmatter から直接参照できる」例外を追記する（`role-qa.md` の `skills: security-review` は正常に解決している。実体が無いのを壊れと誤判定しないため）
- `rules/agent-management.md` / `rules/skill-management.md` の一元管理ルールが実態と不一致（`~/dev/Claude/*-lib` は存在せず、`~/.claude/{agents,skills}` が本リポジトリへの直接シンボリックリンク）
