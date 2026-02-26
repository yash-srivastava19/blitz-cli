import React from "react";
import { Box, Text, useApp } from "ink";
import {
  getStreak,
  getCompletionRate,
  getAccuracyRate,
  getTodayTasks,
  getDailyGoal,
} from "../db/tasks.js";

const BAR_WIDTH = 16;

function pctBar(fraction: number): string {
  const filled = Math.round(Math.min(1, fraction) * BAR_WIDTH);
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function StatsDashboard() {
  const { exit } = useApp();
  const streak = getStreak();
  const completionRate = getCompletionRate(7);
  const accuracyRate = getAccuracyRate(20);
  const todayTasks = getTodayTasks();
  const goal = getDailyGoal();
  const todayCompleted = todayTasks.filter((t) => t.status === "completed").length;

  setTimeout(() => exit(), 50);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold>Blitz Stats</Text>
      <Box marginTop={1} flexDirection="column" gap={0}>

        <Box gap={2}>
          <Text>  Streak          </Text>
          <Text color="yellow">{streak > 0 ? "🔥" : "  "} {streak} day{streak !== 1 ? "s" : ""}</Text>
        </Box>

        <Box gap={2} marginTop={1}>
          <Text>  Today           </Text>
          <Text color="green">{pctBar(todayCompleted / goal)}</Text>
          <Text>{todayCompleted} / {goal}</Text>
        </Box>

        <Box gap={2} marginTop={1}>
          <Text>  Completion rate </Text>
          <Text color={completionRate >= 0.7 ? "green" : "yellow"}>
            {pctBar(completionRate)}
          </Text>
          <Text>{pct(completionRate)} (7d)</Text>
        </Box>

        <Box gap={2} marginTop={1}>
          <Text>  Estimate acc.   </Text>
          <Text color={accuracyRate >= 0.6 ? "green" : "yellow"}>
            {pctBar(accuracyRate)}
          </Text>
          <Text>{pct(accuracyRate)} (last 20)</Text>
        </Box>

      </Box>
      <Box marginTop={1}>
        <Text dimColor>Tip: blitz log  to see recent history</Text>
      </Box>
    </Box>
  );
}
