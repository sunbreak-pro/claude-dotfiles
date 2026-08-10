# Skill Launch Notification

> **本ルールが宣言の正本**（機械実体 = `hooks/skill-launch-notice.mjs`）。**個々の SKILL.md 本文には書かない** — 以前は各 SKILL.md 冒頭に `MANDATORY FIRST ACTION` 行を転記していたが、rule + hook の 2 系統に集約した。

- MANDATORY: When invoking the Skill tool, you MUST output the following message BEFORE any other output:
  `<The {skill-name} will launch>`
  where `{skill-name}` is the exact name of the skill being invoked
- This applies to ALL skills without exception
- NEVER skip this message

例外: `agents/*.md` の自己アナウンス行（「role-qaを起動します」等）は残す。エージェントは Agent ツール経由で起動され、Skill tool の hook 対象外のため。
