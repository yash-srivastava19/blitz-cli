#!/usr/bin/env bun
import { readState } from "./state/index.js";
import { parseDuration, formatDurationHuman } from "./utils/time.js";
import { suggestDuration } from "./utils/suggest.js";
import { getCompletedHistory, insertTask } from "./db/tasks.js";
import { writeState } from "./state/index.js";

const args  = process.argv.slice(2);
const first = args[0];

// ── Dispatch ─────────────────────────────────────────────────────────────────

if (first === "log") {
  const { renderLog } = await import("./commands/log.js");
  renderLog();

} else if (first === "stats") {
  const { renderStats } = await import("./commands/stats.js");
  renderStats();

} else if (!first) {
  // No args → status snapshot or today summary
  const active = readState();
  if (active) {
    const { printStatusCard } = await import("./ui/StatusCard.js");
    printStatusCard(active);
  } else {
    const { printTodaySummary } = await import("./ui/TodaySummary.js");
    printTodaySummary();
  }

} else {
  // Start or reattach a task
  const name = first;
  const durationArg = args[1];

  // Reattach if same task is already running
  const existing = readState();
  if (existing && existing.name === name) {
    const { render } = await import("ink");
    const React = await import("react");
    const { TimerDisplay } = await import("./ui/TimerDisplay.js");
    const { waitUntilExit } = render(React.default.createElement(TimerDisplay, { task: existing }));
    await waitUntilExit();
    process.exit(0);
  }

  // Determine planned duration
  let plannedMs: number;
  if (durationArg) {
    const parsed = parseDuration(durationArg);
    if (!parsed) {
      console.error(`Could not parse duration: "${durationArg}"`);
      console.error(`Examples: 25m, 1h, 1h30m, 90s`);
      process.exit(1);
    }
    plannedMs = parsed;
  } else {
    const history   = getCompletedHistory(100);
    const suggested = suggestDuration(name, history);
    if (suggested) {
      console.log(`Based on history: ~${formatDurationHuman(suggested)} suggested`);
      plannedMs = suggested;
    } else {
      plannedMs = 25 * 60_000;
    }
  }

  // Insert DB row + write state
  const id = insertTask(name, plannedMs);
  const activeTask = { id, name, startedAt: Date.now(), plannedMs, extendedMs: 0 };
  writeState(activeTask);

  // Launch interactive timer (Ink only used here)
  const { render } = await import("ink");
  const React = await import("react");
  const { TimerDisplay } = await import("./ui/TimerDisplay.js");
  const { waitUntilExit } = render(React.default.createElement(TimerDisplay, { task: activeTask }));
  await waitUntilExit();
}
