import { getTodayTasks, getStreak, getDailyGoal } from "../db/tasks.js";
import { formatDurationHuman } from "../utils/time.js";
import { c, bar, print } from "../utils/ansi.js";

export function printTodaySummary(): void {
  const tasks  = getTodayTasks();
  const streak = getStreak();
  const goal   = getDailyGoal();

  const completed = tasks.filter(t => t.status === "completed").length;
  const abandoned = tasks.filter(t => t.status === "abandoned").length;
  const focus     = tasks.filter(t => t.actual_ms).reduce((s, t) => s + (t.actual_ms ?? 0), 0);

  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  print();
  print(`  ${c.bold(dayName)}`);
  print();
  print(`  Completed   ${bar(completed / goal, 12)}  ${completed} / ${goal}`);

  if (streak > 0) {
    const flame = streak >= 3 ? "🔥" : "✦";
    print(`  Streak      ${flame}  ${streak} day${streak !== 1 ? "s" : ""}`);
  }

  if (focus > 0) {
    print(`  Focus time  ${c.green(formatDurationHuman(focus))}`);
  }

  if (tasks.length > 0) {
    print();
    for (const t of tasks) {
      const icon = t.status === "completed" ? c.green("✓")
                 : t.status === "abandoned" ? c.red("✗")
                 : c.yellow("⏱");
      const name = t.name.length > 40 ? t.name.slice(0, 39) + "…" : t.name;
      print(`    ${icon}  ${name}`);
    }
  }

  print();
  if (abandoned > 0) {
    print(c.dim(`  ${abandoned} abandoned today`));
  }
  print(c.dim(`  Start a task:  blitz "your next thing" 25m`));
  print();
}
