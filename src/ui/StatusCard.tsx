import type { ActiveTask } from "../state/index.js";
import { formatDuration, formatDurationHuman } from "../utils/time.js";
import { c, bar, print } from "../utils/ansi.js";

export function printStatusCard(task: ActiveTask): void {
  const totalMs   = task.plannedMs + task.extendedMs;
  const elapsed   = Date.now() - task.startedAt;
  const remaining = Math.max(0, totalMs - elapsed);
  const fraction  = Math.min(1, elapsed / totalMs);
  const expired   = remaining <= 0;

  print();
  print(`  ${c.bold(task.name)}`);
  print(
    `  ${bar(fraction, 20, expired ? c.red : c.green)}  ` +
    (expired ? c.red("time's up!") : `${formatDuration(remaining)} remaining`)
  );
  print();
  print(c.dim(`  Reattach:  blitz "${task.name}" ${formatDurationHuman(task.plannedMs)}`));
  print();
}
