---
name: project-setter
description: 新規・既存プロジェクトで `.claude/` を立ち上げる / 整えるときの標準構造と運用原則の正本。ファイル階層・CLAUDE.md の標準章構成・plans と known-issues のライフサイクルを持つ。Triggers include "プロジェクトを立ち上げ", "`.claude/` を作る", "ワークスペース初期化", "CLAUDE.md の構成", "docs 構造", "project setup", "scaffold".
---

# Project Setter — `.claude/` の標準構造

全プロジェクト共通の運用ルール。**新しくプロジェクトを始めるとき**と、**既存プロジェクトの `.claude/` が散らかってきたとき**に開く。

## ファイル階層

```
.claude/
├── CLAUDE.md                   # 現状の SSOT（400 行以下目標）
├── MEMORY.md                   # タスクトラッカー（進行中 / 直近完了 / 予定）
├── HISTORY.md                  # セッション単位の変更履歴（降順）
├── skills/                     # プロジェクト固有スキル（シンボリックリンク含む）
├── archive/                    # 完了済みプラン保管
└── docs/
    ├── vision/                 # 抽象構想・設計原則（継続更新される指針）
    │   └── plans/              # アクティブな実装プラン（YYYY-MM-DD-<slug>.md、完了後 archive/ へ）
    ├── requirements/           # 機能要件定義（Tier 1-3 等）
    ├── known-issues/           # Root Cause + 再発防止知見（INDEX.md で索引）
    └── code-explanation/       # 任意。学習教材
```

## 運用原則

- **CLAUDE.md は 400 行以下を目標**: コンテキスト節約のため、詳細は `docs/` 配下に分離する
- **ADR は作らない**: 設計原則は `docs/vision/coding-principles.md` に集約する。ADR は「時点の判断」を固定するため古い情報を参照しがちで、vision/ のほうが「現在から未来に向けた設計原則」として継続更新できる
- **実装プランは日付 + slug 命名**: `.claude/docs/vision/plans/YYYY-MM-DD-<slug>.md`。完了後は `.claude/archive/` へ移動（ファイル内 Status を COMPLETED に更新）。`.claude/` 直下にプラン `.md` を置かない（散乱防止）
- **Known Issues**: 壊れている／壊れていた箇所の Root Cause を `docs/known-issues/NNN-<slug>.md` に蓄積。類似バグに遭遇したらまず `INDEX.md` を grep
- **MEMORY.md と HISTORY.md は task-tracker 経由で更新**: 手動編集せず、スキルに任せる

## CLAUDE.md の標準章構成（Software の場合）

1. Meta（役割・更新ルール・関連ドキュメント表）
2. Vision 要約（詳細は `docs/vision/core.md`）
3. Platform / Tech Stack
4. Architecture
5. Data Model（ある場合）
6. AI Integration（ある場合）
7. Coding Standards
8. Development Workflows
9. Feature Tier Map（詳細は `docs/requirements/`）
10. Document System（フロー・Known Issue ライフサイクル）

**Software 以外**（research・資料整理・執筆など）は上から 3〜6 と 9 を落とし、**1 / 2 / 7（作業規約）/ 10** の 4 章で始める。足りなくなってから足す。

## 既存プロジェクトを整えるとき

上の階層に**いきなり合わせない**。引っ越し先の棚を全部組んでから荷物を運ぶのと同じで、**移送先を先に作ってから移す**。移送先が無い記述は、移送先を作るまで消さない。

- CLAUDE.md が 400 行を超えているだけなら、まず「毎回必要か」で分ける（手順 → skills / 規約 → rules / 経緯 → docs）
- 何がどれだけ重いか分からない状態で削らない。順位を測ってから上位だけ触る
