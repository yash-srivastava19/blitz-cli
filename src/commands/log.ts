import { getRecentTasks } from "../db/tasks.js";
import { formatDurationHuman } from "../utils/time.js";
import { c, bar, print } from "../utils/ansi.js";

const STATUS_ICON: Record<string, string> = {
  completed:   c.green("✓"),
  abandoned:   c.red("✗"),
  in_progress: c.yellow("⏱"),
};

const REFLECTION_ICON: Record<string, string> = {
  accurate:       c.green("~"),
  underestimated: c.red("↑"),
  overestimated:  c.dim("↓"),
};

export function renderLog(days = 7): void {
  const tasks = getRecentTasks(days);

  print();
  print(c.bold(`  Task log — last ${days} days`));
  print();

  if (tasks.length === 0) {
    print(c.dim("  No tasks yet. Start one:  blitz \"your task\" 25m"));
    print();
    return;
  }

  // Group by date (already ordered DESC by started_at)
  const byDate = new Map<string, typeof tasks>();
  for (const t of tasks) {
    if (!byDate.has(t.date)) byDate.set(t.date, []);
    byDate.get(t.date)!.push(t);
  }

  for (const [date, rows] of byDate) {
    const completed  = rows.filter(r => r.status === "completed").length;
    const abandoned  = rows.filter(r => r.status === "abandoned").length;
    const totalFocus = rows
      .filter(r => r.actual_ms != null)
      .reduce((sum, r) => sum + (r.actual_ms ?? 0), 0);

    // ── Day header ──────────────────────────────────────────────────────────
    const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
    print(
      `  ${c.bold(c.cyan(dayLabel.padEnd(18)))}` +
      `${c.green(`${completed} done`)}` +
      (abandoned ? `  ${c.red(`${abandoned} abandoned`)}` : "") +
      (totalFocus ? `  ${c.dim(formatDurationHuman(totalFocus) + " focused")}` : "")
    );

    // ── Tasks ───────────────────────────────────────────────────────────────
    // Sort oldest-first within the day
    const sorted = [...rows].sort((a, b) => a.started_at - b.started_at);
    for (const t of sorted) {
      const icon   = STATUS_ICON[t.status] ?? " ";
      const ref    = t.reflection ? ` ${REFLECTION_ICON[t.reflection]}` : "";
      const actual = t.actual_ms ? formatDurationHuman(t.actual_ms) : "";
      const plan   = formatDurationHuman(t.planned_ms);
      const time   = actual
        ? (actual === plan ? c.dim(plan) : `${c.dim(plan)} → ${actual}`)
        : c.dim(plan);
      const note   = t.note ? c.dim(`  "${t.note}"`) : "";
      const name   = t.name.length > 34 ? t.name.slice(0, 33) + "…" : t.name;

      print(`    ${icon} ${name.padEnd(35)} ${time.padStart(8)}${ref}${note}`);
    }
    print();
  }
}
