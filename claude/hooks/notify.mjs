#!/usr/bin/env node
// Notification hook: desktop notification "Claude Code が入力を待っています".
// macOS: osascript / Windows: PowerShell toast (BurntToast 不要) / other: no-op.
import { execFileSync } from "node:child_process";

const TITLE = "Claude Code";
const MESSAGE = "Claude Code が入力を待っています";

try {
  if (process.platform === "darwin") {
    execFileSync(
      "osascript",
      ["-e", `display notification "${MESSAGE}" with title "${TITLE}"`],
      { stdio: "ignore", timeout: 5000 }
    );
  } else if (process.platform === "win32") {
    const ps = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$texts = $xml.GetElementsByTagName('text')
$texts.Item(0).AppendChild($xml.CreateTextNode('${TITLE}')) | Out-Null
$texts.Item(1).AppendChild($xml.CreateTextNode('${MESSAGE}')) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Claude Code').Show($toast)
`;
    execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      stdio: "ignore",
      timeout: 10000,
    });
  }
} catch {
  /* notification failure must never break the session */
}
process.exit(0);
