import React from "react";
import { Box, Text } from "ink";
import {
  getStreak,
  getTodayTasks,
  getDailyGoal,
  getRecentTasks,
  getCompletionRate,
  getAccuracyRate,
} from "../../db/tasks.js";
import { formatDurationHuman } from "../../utils/time.js";

const BAR_WIDTH = 12;

function buildBar(fraction: number): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * BAR_WIDTH);
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

const DOT_WIDTH = 5;
function buildDotBar(count: number, max: number): string {
  if (max === 0) return "○".repeat(DOT_WIDTH);
  const filled = Math.round(Math.min(1, count / max) * DOT_WIDTH);
  return "●".repeat(filled) + "○".repeat(DOT_WIDTH - filled);
}

export function StatsView() {
  const streak = getStreak();
  const todayTasks = getTodayTasks();
  const dailyGoal = getDailyGoal();
  const completedToday = todayTasks.filter((t) => t.status === "completed").length;
  const goalFraction = dailyGoal > 0 ? completedToday / dailyGoal : 0;

  const recentTasks = getRecentTasks(7);
  const completionRate = getCompletionRate(7);
  const accuracyRate = getAccuracyRate(20);

  // Build daily breakdown for last 7 days
  type DaySummary = {
    date: string;
    label: string;
    count: number;
    totalMs: number;
  };

  const dayMap = new Map<string, DaySummary>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    dayMap.set(iso, { date: iso, label, count: 0, totalMs: 0 });
  }
  for (const t of recentTasks) {
    const entry = dayMap.get(t.date);
    if (entry && t.status === "completed") {
      entry.count += 1;
      entry.totalMs += t.actual_ms ?? 0;
    }
  }
  const days = Array.from(dayMap.values());
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold>Accountability Dashboard</Text>

      <Box flexDirection="column" marginTop={1} gap={0}>
        {/* Streak */}
        <Box gap={2}>
          <Text dimColor>{"Streak    ".padEnd(10)}</Text>
          <Text>🔥 {streak} day{streak !== 1 ? "s" : ""}</Text>
        </Box>

        {/* Today */}
        <Box gap={2}>
          <Text dimColor>{"Today     ".padEnd(10)}</Text>
          <Text color="green">{buildBar(goalFraction)}</Text>
          <Text>
            {completedToday} / {dailyGoal} tasks
          </Text>
        </Box>
      </Box>

      {/* 7-day breakdown */}
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>── Last 7 days ─────────────────</Text>
        {days.map((day) => (
          <Box key={day.date} gap={2}>
            <Text dimColor>{day.label.padEnd(14).slice(0, 14)}</Text>
            <Text color={day.count > 0 ? "cyan" : "gray"}>
              {buildDotBar(day.count, maxCount)}
            </Text>
            <Text dimColor>
              {day.totalMs > 0 ? formatDurationHuman(day.totalMs) : "—"}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Rates */}
      <Box flexDirection="column" marginTop={1} gap={0}>
        <Box gap={2}>
          <Text dimColor>{"Completion".padEnd(10)}</Text>
          <Text color="green">{buildBar(completionRate)}</Text>
          <Text>{Math.round(completionRate * 100)}% (7d)</Text>
        </Box>
        <Box gap={2}>
          <Text dimColor>{"Accuracy  ".padEnd(10)}</Text>
          <Text color="cyan">{buildBar(accuracyRate)}</Text>
          <Text>{Math.round(accuracyRate * 100)}% (last 20)</Text>
        </Box>
      </Box>
    </Box>
  );
}
