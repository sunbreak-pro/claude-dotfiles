---
name: project-setter
description: 新規・既存プロジェクトで `.claude/` を立ち上げる / 整えるときの標準構造と運用原則の正本。ファイル階層・CLAUDE.md の標準章構成・plans と known-issues のライフサイクルを持つ。Triggers include "プロジェクトを立ち上げ", "`.claude/` を作る", "ワークスペース初期化", "CLAUDE.md の構成", "docs 構造", "project setup", "scaffold".
---

# Project Setter — `.claude/` の標準構造

## ファイル階層

```
.claude/
├── CLAUDE.md                   # 現状の SSOT（400 行以下目標）
├── MEMORY.md / HISTORY.md      # task-tracker が更新（手動編集しない）
├── skills/                     # プロジェクト固有スキル（実体を置く。リポジトリ外への symlink は作らない）
├── archive/                    # 完了済みプラン
└── docs/
    ├── vision/                 # 設計原則（coding-principles.md 等・継続更新）
    │   └── plans/              # 実装プラン YYYY-MM-DD-<slug>.md（完了後 archive/ へ）
    ├── requirements/           # 機能要件定義
    ├── known-issues/           # Root Cause + 再発防止（INDEX.md で索引）
    └── code-explanation/       # 任意
```

## 運用原則

- CLAUDE.md は 400 行以下。詳細は `docs/` に分離する
- ADR は作らない。設計原則は `docs/vision/coding-principles.md` に集約する（時点の判断より、現在から未来に向けた原則を継続更新する）
- 実装プランは日付 + slug 命名。`.claude/` 直下にプランを置かない
- 壊れた / 壊れていた箇所の Root Cause は `docs/known-issues/NNN-<slug>.md` に蓄積し、類似バグではまず INDEX.md を引く

## CLAUDE.md の標準章構成（Software）

1. Meta（役割・更新ルール・関連ドキュメント表） 2. Vision 要約 3. Platform / Tech Stack 4. Architecture 5. Data Model 6. AI Integration 7. Coding Standards 8. Development Workflows 9. Feature Tier Map 10. Document System

Software 以外（research・資料整理・執筆）は 1 / 2 / 7 / 10 の 4 章で始め、足りなくなってから足す。

## 既存プロジェクトを整えるとき

移送先を先に作ってから移す。移送先が無い記述は消さない。CLAUDE.md が長いだけなら「毎回必要か」で分ける（手順 → skills / 規約 → rules / 経緯 → docs）。何が重いか測ってから上位だけ触る。
