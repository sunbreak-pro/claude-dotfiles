# Skill Launch Notification

- Skill ツールを呼ぶときは、他のどの出力よりも先に `<The {skill-name} will launch>` を出す（`{skill-name}` は正確なスキル名）。全スキル例外なし。
- 強制は `hooks/skill-launch-notice.mjs` が持つ。本ルールは宣言のみで、個々の SKILL.md 本文には転記しない。
- `agents/*.md` の自己アナウンス行（「role-qa を起動します」等）は別枠で残す（Agent ツール起動は hook の対象外）。
