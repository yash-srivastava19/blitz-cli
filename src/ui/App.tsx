import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { ActiveTask } from "../state/index.js";
import { readState } from "../state/index.js";
import {
  getStreak,
  getTodayTasks,
  getDailyGoal,
  getCompletionRate,
} from "../db/tasks.js";
import { formatDurationHuman } from "../utils/time.js";
import { HomeView } from "./views/HomeView.js";
import { LogView } from "./views/LogView.js";
import { StatsView } from "./views/StatsView.js";

type View = "home" | "log" | "stats";

const BAR_WIDTH = 12;

function buildBar(fraction: number): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

export function App() {
  const [view, setView] = useState<View>("home");
  const [navLocked, setNavLocked] = useState(false);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(readState());
  const [triggerNewTask, setTriggerNewTask] = useState(false);
  const [tick, setTick] = useState(0);

  // Refresh active task state every second (in case it changes from timer)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTask(readState());
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useInput((input, key) => {
    if (navLocked) return;
    if (input === "1") { setView("home"); }
    else if (input === "2") { setView("log"); }
    else if (input === "3") { setView("stats"); }
    else if (input === "n") {
      setView("home");
      setTriggerNewTask(true);
    } else if (input === "q") {
      process.stdout.write("\x1b[?1049l");
      process.exit(0);
    }
  });

  // Header stats
  const streak = getStreak();
  const todayTasks = getTodayTasks();
  const dailyGoal = getDailyGoal();
  const completedToday = todayTasks.filter((t) => t.status === "completed").length;
  const focusedMs = todayTasks
    .filter((t) => t.actual_ms != null)
    .reduce((sum, t) => sum + (t.actual_ms ?? 0), 0);
  const completionRate = getCompletionRate(7);
  const onTimePct = Math.round(completionRate * 100);
  const goalFraction = dailyGoal > 0 ? completedToday / dailyGoal : 0;

  const streakLabel = streak > 0 ? `🔥 ${streak}d` : "no streak";
  const todayLabel = `${completedToday}/${dailyGoal} today`;
  const onTimeLabel = `${onTimePct}% on-time`;
  const headerRight = `${streakLabel} · ${todayLabel} · ${onTimeLabel}`;

  const termWidth = process.stdout.columns || 80;
  const leftPad = " blitz ";
  const rightPad = ` ${headerRight} `;
  const midWidth = Math.max(0, termWidth - leftPad.length - rightPad.length - 4);
  const headerMid = "─".repeat(midWidth);

  const tabLabels = ["[1] Today", "[2] Log", "[3] Stats"];
  const navRight = "n new  q quit";

  return (
    <Box flexDirection="column" width={termWidth}>
      {/* Header */}
      <Box>
        <Text bold color="cyan"> blitz </Text>
        <Text dimColor>{headerMid}</Text>
        <Text bold> {headerRight} </Text>
      </Box>

      {/* Content */}
      <Box flexGrow={1} flexDirection="column">
        {view === "home" && (
          <HomeView
            activeTask={activeTask}
            onActiveTaskChange={setActiveTask}
            triggerNewTask={triggerNewTask}
            onTriggerConsumed={() => setTriggerNewTask(false)}
            onNavLockChange={setNavLocked}
          />
        )}
        {view === "log" && <LogView onNavLockChange={setNavLocked} />}
        {view === "stats" && <StatsView />}
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
        <Box width={termWidth - navRight.length - 2} flexDirection="row" gap={2}>
          {tabLabels.map((label, i) => {
            const isActive =
              (i === 0 && view === "home") ||
              (i === 1 && view === "log") ||
              (i === 2 && view === "stats");
            return (
              <Text key={label} bold={isActive} color={isActive ? "cyan" : undefined}>
                {label}
              </Text>
            );
          })}
        </Box>
        <Text dimColor>{navRight}</Text>
      </Box>
    </Box>
  );
}
