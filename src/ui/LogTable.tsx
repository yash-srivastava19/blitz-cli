import React from "react";
import { Box, Text, useApp } from "ink";
import type { TaskRow } from "../db/tasks.js";
import { formatDurationHuman } from "../utils/time.js";

interface Props {
  tasks: TaskRow[];
  days: number;
}

const STATUS_COLOR: Record<string, string> = {
  completed: "green",
  abandoned: "red",
  in_progress: "yellow",
};

const STATUS_ICON: Record<string, string> = {
  completed: "✓",
  abandoned: "✗",
  in_progress: "⏱",
};

export function LogTable({ tasks, days }: Props) {
  const { exit } = useApp();
  setTimeout(() => exit(), 50);

  if (tasks.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>No tasks in the last {days} days.</Text>
      </Box>
    );
  }

  // Group by date
  const byDate = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    if (!byDate.has(t.date)) byDate.set(t.date, []);
    byDate.get(t.date)!.push(t);
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold>Task log — last {days} days</Text>
      <Box marginTop={1} flexDirection="column">
        {[...byDate.entries()].map(([date, rows]) => (
          <Box key={date} flexDirection="column" marginBottom={1}>
            <Text bold color="cyan">{date}</Text>
            {rows.map((t) => {
              const color = STATUS_COLOR[t.status] ?? "white";
              const icon = STATUS_ICON[t.status] ?? " ";
              const planned = formatDurationHuman(t.planned_ms);
              const actual = t.actual_ms ? formatDurationHuman(t.actual_ms) : "—";
              return (
                <Box key={t.id} gap={1} paddingLeft={2}>
                  <Text color={color}>{icon}</Text>
                  <Text>{t.name.padEnd(30).slice(0, 30)}</Text>
                  <Text dimColor>{planned.padStart(5)}</Text>
                  {t.status === "completed" && (
                    <Text dimColor>→ {actual}</Text>
                  )}
                  {t.reflection && (
                    <Text dimColor>
                      [{t.reflection === "accurate" ? "✓" : t.reflection === "underestimated" ? "↑" : "↓"}]
                    </Text>
                  )}
                  {t.note && <Text dimColor>"{t.note}"</Text>}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
