import { spawnSync } from "child_process";

export function sendNotification(title: string, body: string): void {
  const platform = process.platform;
  if (platform === "linux") {
    spawnSync("notify-send", ["-t", "5000", title, body], { stdio: "ignore" });
  } else if (platform === "darwin") {
    const script = `display notification "${body}" with title "${title}"`;
    spawnSync("osascript", ["-e", script], { stdio: "ignore" });
  }
  // Terminal bell as fallback
  process.stdout.write("\x07");
}
