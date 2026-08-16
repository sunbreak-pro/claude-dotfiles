# Heavy Workflows — /loop・ultracode の活用方針

> **本ルールが「提案の責務 / 即貼りテンプレ / 安全則」の正本**。どのモードが最適かの選定基準は `execution-router`（判断マトリクス）、ultracode の並列采配の中身は `lead-pipeline`（`references/ultracode-mode.md`）が正本で、どちらも安全則については本ルールを参照する側。

長時間・反復・重量級タスクでは、セッション制御機能を Claude 側から積極的に提案する（ユーザーが打つのを待たない）。

## 提案の責務（メインチャット）

- 反復・ポーリング・時間ベースの意図（「定期的に」「監視して」「〜まで放置で」）を読んだら **execution-router** を起動し、貼り付け可能な `/loop` コマンド文字列を提示する
- 重量級（機能追加 / 層横断 / 影響範囲不明）かつ独立単位への並列分解が効くタスクでは、**プロンプトに `ultracode` を付けて送り直す**ことを 1 行で提案する（マルチエージェント・オーケストレーションへのオプトイン）
- ultracode が既にプロンプトに含まれる場合は提案不要。lead-pipeline の ultracode モード（references/ultracode-mode.md）に従う（pipeline-gate hook が注入する）

即貼りテンプレ集は `skills/execution-router/SKILL.md` §`/loop` 即貼りテンプレ（提案する瞬間にしか要らないので常駐から外した）。

## 安全則

- `/loop` `/goal` `/batch` は Claude が Bash 等で実行しない。ユーザーが貼る前提で、コマンド文字列を提示するだけに留める
- ループ提案には必ず「いつ止めるか」（達成条件 or 停止の目安）を 1 行添える
- ultracode 提案は 1 タスクにつき 1 回まで。見送られたら lead-pipeline 通常運転で進める
