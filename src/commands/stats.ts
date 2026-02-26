import {
  getStreak, getCompletionRate, getAccuracyRate,
  getTodayTasks, getDailyGoal, getRecentTasks,
} from "../db/tasks.js";
import { formatDurationHuman } from "../utils/time.js";
import { c, bar, pct, print } from "../utils/ansi.js";

export function renderStats(): void {
  const streak         = getStreak();
  const completionRate = getCompletionRate(7);
  const accuracyRate   = getAccuracyRate(20);
  const todayTasks     = getTodayTasks();
  const goal           = getDailyGoal();
  const todayDone      = todayTasks.filter(t => t.status === "completed").length;

  // Last 7 days mini-calendar
  const recent = getRecentTasks(7);
  const byDate = new Map<string, typeof recent>();
  for (const t of recent) {
    if (!byDate.has(t.date)) byDate.set(t.date, []);
    byDate.get(t.date)!.push(t);
  }

  print();
  print(c.bold("  Blitz — Accountability Dashboard"));
  print();

  // ── Streak ──────────────────────────────────────────────────────────────
  const flame = streak >= 3 ? "🔥" : streak > 0 ? "✦" : "·";
  print(`  ${c.bold("Streak")}         ${flame}  ${streak} day${streak !== 1 ? "s" : ""}`);
  print();

  // ── Today ───────────────────────────────────────────────────────────────
  print(`  ${c.bold("Today")}          ${bar(todayDone / goal, 16)}  ${todayDone} / ${goal} tasks`);
  print();

  // ── 7-day mini calendar ─────────────────────────────────────────────────
  print(`  ${c.bold("Last 7 days")}`);
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const rows = byDate.get(dateStr) ?? [];
    const done = rows.filter(r => r.status === "completed").length;
    const abn  = rows.filter(r => r.status === "abandoned").length;
    const focus = rows.filter(r => r.actual_ms).reduce((s, r) => s + (r.actual_ms ?? 0), 0);

    const isToday = i === 0;
    const label = (isToday ? c.cyan(dayLabel) : dayLabel).padEnd(isToday ? 22 : 14);
    const dots  = rows.length === 0
      ? c.dim("  —")
      : c.green("●".repeat(done)) + (abn ? c.red("●".repeat(abn)) : "");
    const focusStr = focus ? c.dim(`  ${formatDurationHuman(focus)}`) : "";

    print(`    ${label}  ${dots}${focusStr}`);
  }
  print();

  // ── Rates ───────────────────────────────────────────────────────────────
  const compColor = completionRate >= 0.7 ? c.green : c.yellow;
  const accColor  = accuracyRate  >= 0.6 ? c.green : c.yellow;

  print(`  ${c.bold("Completion")}     ${bar(completionRate, 16, compColor)}  ${pct(completionRate)} (7d)`);
  print(`  ${c.bold("Estimate acc.")}  ${bar(accuracyRate,  16, accColor)}   ${pct(accuracyRate)} (last 20)`);
  print();
  print(c.dim("  blitz log   for full history"));
  print();
}
