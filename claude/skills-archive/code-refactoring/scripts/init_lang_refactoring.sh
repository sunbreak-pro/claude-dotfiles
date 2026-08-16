#!/usr/bin/env bash
set -euo pipefail

# プロジェクト固有リファクタリングスキル生成スクリプト
#
# Usage:
#   init_lang_refactoring.sh <lang> <project-root> [project-name]
#
# Examples:
#   init_lang_refactoring.sh python /home/user/my-app
#   init_lang_refactoring.sh typescript /home/user/web-app "Web Dashboard"
#   init_lang_refactoring.sh rust /home/user/engine "Game Engine"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/../assets/templates/SKILL.md.template"
COLLECTION_DIR="$HOME/.claude/skills/refactoring-collection"

# --- 言語プリセット定義 ---
declare -A PRESETS_VAR PRESETS_FUNC PRESETS_CLASS PRESETS_CONST
declare -A PRESETS_IMPORT PRESETS_LINES PRESETS_INDENT PRESETS_ARGS
declare -A PRESETS_PERF PRESETS_DISPLAY

PRESETS_DISPLAY=(
  [python]="Python" [typescript]="TypeScript" [javascript]="JavaScript"
  [rust]="Rust" [go]="Go" [java]="Java" [cpp]="C++"
  [ruby]="Ruby" [swift]="Swift" [kotlin]="Kotlin"
)
PRESETS_VAR=(
  [python]="snake_case" [typescript]="camelCase" [javascript]="camelCase"
  [rust]="snake_case" [go]="camelCase" [java]="camelCase" [cpp]="snake_case"
  [ruby]="snake_case" [swift]="camelCase" [kotlin]="camelCase"
)
PRESETS_FUNC=(
  [python]="snake_case" [typescript]="camelCase" [javascript]="camelCase"
  [rust]="snake_case" [go]="PascalCase(exported)/camelCase(unexported)"
  [java]="camelCase" [cpp]="snake_case" [ruby]="snake_case"
  [swift]="camelCase" [kotlin]="camelCase"
)
PRESETS_CLASS=(
  [python]="PascalCase" [typescript]="PascalCase" [javascript]="PascalCase"
  [rust]="PascalCase" [go]="PascalCase" [java]="PascalCase" [cpp]="PascalCase"
  [ruby]="PascalCase" [swift]="PascalCase" [kotlin]="PascalCase"
)
PRESETS_CONST=(
  [python]="UPPER_SNAKE_CASE" [typescript]="UPPER_SNAKE_CASE"
  [javascript]="UPPER_SNAKE_CASE" [rust]="UPPER_SNAKE_CASE"
  [go]="PascalCase(exported)" [java]="UPPER_SNAKE_CASE" [cpp]="UPPER_SNAKE_CASE"
  [ruby]="UPPER_SNAKE_CASE" [swift]="camelCase(let)" [kotlin]="UPPER_SNAKE_CASE"
)
PRESETS_IMPORT=(
  [python]="1. stdlib → 2. third-party → 3. local (isort準拠)"
  [typescript]="1. node_modules → 2. @alias → 3. relative"
  [javascript]="1. node_modules → 2. @alias → 3. relative"
  [rust]="1. std → 2. external crates → 3. crate modules"
  [go]="1. stdlib → 2. external → 3. internal (goimports準拠)"
  [java]="1. java.* → 2. javax.* → 3. third-party → 4. project"
  [cpp]="1. system headers → 2. third-party → 3. project headers"
  [ruby]="1. stdlib → 2. gems → 3. local"
  [swift]="1. Foundation/UIKit → 2. third-party → 3. project"
  [kotlin]="1. java/kotlin stdlib → 2. third-party → 3. project"
)
PRESETS_LINES=([default]=30)
PRESETS_INDENT=([default]=3)
PRESETS_ARGS=([default]=4)
PRESETS_PERF=(
  [python]="- リスト内包表記をループより優先\n- 大量データにはジェネレータを使用\n- 文字列結合は join() を使用"
  [typescript]="- 不要な再レンダリングを避ける（React使用時）\n- Optional chaining で早期リターン\n- Map/Set を O(n) ルックアップ回避に使用"
  [javascript]="- DOM操作をバッチ化\n- イベントデリゲーションを活用\n- Map/Set を O(n) ルックアップ回避に使用"
  [rust]="- 不要な clone() を除去\n- イテレータチェーンを優先\n- 借用で所有権移動を回避"
  [go]="- goroutineリークに注意\n- sync.Pool で高頻度アロケーション削減\n- スライスの事前容量確保"
  [java]="- Stream APIを適切に使用\n- StringBuilder で文字列結合\n- 不変オブジェクトを優先"
  [cpp]="- ムーブセマンティクスを活用\n- 不要なコピーを回避（const参照）\n- RAII でリソース管理"
  [ruby]="- each より map/select を優先\n- freeze で文字列リテラルを不変化\n- N+1クエリを回避（Rails使用時）"
  [swift]="- 値型(struct)をデフォルトに\n- lazy プロパティで遅延初期化\n- ARC循環参照に注意(weak/unowned)"
  [kotlin]="- data classを活用\n- シーケンスで遅延評価\n- coroutineでの構造化並行性"
)

# --- 引数チェック ---
if [ $# -lt 2 ]; then
  echo "Usage: init_lang_refactoring.sh <lang> <project-root> [project-name]"
  echo ""
  echo "Supported languages:"
  echo "  python, typescript, javascript, rust, go, java, cpp, ruby, swift, kotlin"
  echo ""
  echo "Examples:"
  echo "  $0 python /home/user/my-app"
  echo "  $0 typescript /home/user/web-app \"Web Dashboard\""
  exit 1
fi

LANG="$1"
PROJECT_ROOT="$(cd "$2" && pwd)"
PROJECT_NAME="${3:-$(basename "$PROJECT_ROOT")}"

# --- テンプレート存在チェック ---
if [ ! -f "$TEMPLATE" ]; then
  echo "Error: Template not found at $TEMPLATE"
  exit 1
fi

# --- 言語プリセット取得 ---
LANG_DISPLAY="${PRESETS_DISPLAY[$LANG]:-$LANG}"
NAMING_VAR="${PRESETS_VAR[$LANG]:-camelCase}"
NAMING_FUNC="${PRESETS_FUNC[$LANG]:-camelCase}"
NAMING_CLASS="${PRESETS_CLASS[$LANG]:-PascalCase}"
NAMING_CONST="${PRESETS_CONST[$LANG]:-UPPER_SNAKE_CASE}"
IMPORT_ORDER="${PRESETS_IMPORT[$LANG]:-プロジェクトに合わせて定義すること}"
MAX_FUNC_LINES="${PRESETS_LINES[${LANG}]:-${PRESETS_LINES[default]}}"
MAX_INDENT="${PRESETS_INDENT[${LANG}]:-${PRESETS_INDENT[default]}}"
MAX_ARGS="${PRESETS_ARGS[${LANG}]:-${PRESETS_ARGS[default]}}"
PERF_PATTERNS="${PRESETS_PERF[$LANG]:-<!-- 言語固有のパターンを記載 -->}"

# --- スキルディレクトリ作成 ---
SKILL_DIR="${PROJECT_ROOT}/.claude/skills/${LANG}-refactoring"

if [ -d "$SKILL_DIR" ]; then
  echo "Error: Skill already exists at $SKILL_DIR"
  exit 1
fi

mkdir -p "$SKILL_DIR"

# --- テンプレート展開 ---
sed \
  -e "s|{{LANG}}|${LANG}|g" \
  -e "s|{{LANG_DISPLAY}}|${LANG_DISPLAY}|g" \
  -e "s|{{PROJECT_NAME}}|${PROJECT_NAME}|g" \
  -e "s|{{NAMING_VAR}}|${NAMING_VAR}|g" \
  -e "s|{{NAMING_FUNC}}|${NAMING_FUNC}|g" \
  -e "s|{{NAMING_CLASS}}|${NAMING_CLASS}|g" \
  -e "s|{{NAMING_CONST}}|${NAMING_CONST}|g" \
  -e "s|{{IMPORT_ORDER}}|${IMPORT_ORDER}|g" \
  -e "s|{{MAX_FUNC_LINES}}|${MAX_FUNC_LINES}|g" \
  -e "s|{{MAX_INDENT}}|${MAX_INDENT}|g" \
  -e "s|{{MAX_ARGS}}|${MAX_ARGS}|g" \
  -e "s|{{PERF_PATTERNS}}|${PERF_PATTERNS}|g" \
  -e "s|{{PROJECT_RULES}}|<!-- このプロジェクト特有の規約を追記 -->|g" \
  "$TEMPLATE" > "${SKILL_DIR}/SKILL.md"

echo "Created: ${SKILL_DIR}/SKILL.md"

# --- シンボリックリンク作成 ---
mkdir -p "$COLLECTION_DIR"
LINK_NAME="${PROJECT_NAME}--${LANG}-refactoring"
# スペースをハイフンに置換、小文字化
LINK_NAME=$(echo "$LINK_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
LINK_PATH="${COLLECTION_DIR}/${LINK_NAME}"

if [ -L "$LINK_PATH" ]; then
  echo "Warning: Symlink already exists, updating: $LINK_PATH"
  rm "$LINK_PATH"
fi

ln -s "$SKILL_DIR" "$LINK_PATH"
echo "Linked: ${LINK_PATH} -> ${SKILL_DIR}"

echo ""
echo "Done! Next steps:"
echo "  1. Edit ${SKILL_DIR}/SKILL.md to customize project-specific rules"
echo "  2. Verify with: ls -la ${COLLECTION_DIR}/"
