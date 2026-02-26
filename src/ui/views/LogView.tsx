import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { getRecentTasks } from "../../db/tasks.js";
import { formatDurationHuman } from "../../utils/time.js";
import type { TaskRow } from "../../db/tasks.js";

interface DayGroup {
  date: string;
  label: string;
  tasks: TaskRow[];
  totalMs: number;
  completedCount: number;
}

function groupByDay(tasks: TaskRow[]): DayGroup[] {
  const map = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    const group = map.get(t.date) ?? [];
    group.push(t);
    map.set(t.date, group);
  }
  const days: DayGroup[] = [];
  for (const [date, dayTasks] of map) {
    const d = new Date(date + "T00:00:00");
    const label = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const completed = dayTasks.filter((t) => t.status === "completed");
    const totalMs = dayTasks.reduce((s, t) => s + (t.actual_ms ?? 0), 0);
    days.push({ date, label, tasks: dayTasks, totalMs, completedCount: completed.length });
  }
  return days.sort((a, b) => b.date.localeCompare(a.date));
}

interface Props {
  onNavLockChange: (locked: boolean) => void;
}

export function LogView({ onNavLockChange }: Props) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const tasks = getRecentTasks(7);
  const days = groupByDay(tasks);

  // Build flat list of renderable rows
  type Row =
    | { kind: "header"; label: string; completedCount: number; totalMs: number }
    | { kind: "task"; task: TaskRow };

  const rows: Row[] = [];
  for (const day of days) {
    rows.push({
      kind: "header",
      label: day.label,
      completedCount: day.completedCount,
      totalMs: day.totalMs,
    });
    for (const t of day.tasks.sort((a, b) => a.started_at - b.started_at)) {
      rows.push({ kind: "task", task: t });
    }
  }

  const visibleRows = Math.max(5, (process.stdout.rows || 24) - 8);
  const maxScroll = Math.max(0, rows.length - visibleRows);
  const clampedOffset = Math.min(scrollOffset, maxScroll);
  const visible = rows.slice(clampedOffset, clampedOffset + visibleRows);

  useInput((input, key) => {
    if (input === "j" || key.downArrow) {
      setScrollOffset((o) => Math.min(o + 1, maxScroll));
    } else if (input === "k" || key.upArrow) {
      setScrollOffset((o) => Math.max(0, o - 1));
    }
  });

  function reflectionArrow(r: string | null): string {
    if (r === "accurate") return "~";
    if (r === "underestimated") return "↑";
    if (r === "overestimated") return "↓";
    return "";
  }

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box justifyContent="space-between">
        <Text bold>Task History — Last 7 days</Text>
        <Text dimColor>j k / ↑↓ to scroll</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {visible.map((row, i) => {
          if (row.kind === "header") {
            const sep = "─".repeat(Math.max(0, 36 - row.label.length));
            return (
              <Box key={`h-${row.label}`} gap={1}>
                <Text bold color="yellow">{row.label}</Text>
                <Text dimColor>{sep}</Text>
                <Text dimColor>
                  {row.completedCount} done · {formatDurationHuman(row.totalMs)}
                </Text>
              </Box>
            );
          } else {
            const t = row.task;
            const icon =
              t.status === "completed" ? "✓" :
              t.status === "abandoned" ? "✗" : "…";
            const color =
              t.status === "completed" ? "green" :
              t.status === "abandoned" ? "red" : "yellow";
            const arrow = reflectionArrow(t.reflection);
            return (
              <Box key={`t-${t.id}`} gap={1} paddingLeft={2}>
                <Text color={color}>{icon}</Text>
                <Text>{(t.name ?? "").padEnd(22).slice(0, 22)}</Text>
                <Text dimColor>
                  {formatDurationHuman(t.planned_ms)} → {formatDurationHuman(t.actual_ms ?? 0)}
                </Text>
                {arrow && <Text dimColor>{arrow}</Text>}
              </Box>
            );
          }
        })}
      </Box>

      {rows.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>No tasks in the last 7 days.</Text>
        </Box>
      )}

      {maxScroll > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            {clampedOffset + 1}–{Math.min(clampedOffset + visibleRows, rows.length)} of {rows.length} rows
          </Text>
        </Box>
      )}
    </Box>
  );
}
