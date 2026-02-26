import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { ActiveTask } from "../../state/index.js";
import { readState, writeState, clearState } from "../../state/index.js";
import {
  insertTask,
  completeTask,
  abandonTask,
  getTodayTasks,
  getDailyGoal,
  getCompletedHistory,
} from "../../db/tasks.js";
import {
  formatDuration,
  formatDurationHuman,
  parseDuration,
} from "../../utils/time.js";
import { suggestDuration } from "../../utils/suggest.js";
import { sendNotification } from "../../utils/notify.js";

type HomeMode =
  | { stage: "idle" }
  | { stage: "name_input"; nameInput: string }
  | {
      stage: "duration_input";
      name: string;
      durationInput: string;
      suggested: number | null;
    }
  | {
      stage: "timer";
      timerStage:
        | "running"
        | "done_prompt"
        | "extend_input"
        | "abandon_prompt";
      extendInput: string;
      abandonInput: string;
    };

const BAR_WIDTH = 32;

function buildBar(fraction: number, expired = false): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return expired
    ? "█".repeat(BAR_WIDTH)
    : "█".repeat(filled) + "░".repeat(empty);
}

const GOAL_BAR_WIDTH = 12;
function buildGoalBar(fraction: number): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * GOAL_BAR_WIDTH);
  const empty = GOAL_BAR_WIDTH - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

interface Props {
  activeTask: ActiveTask | null;
  onActiveTaskChange: (task: ActiveTask | null) => void;
  triggerNewTask: boolean;
  onTriggerConsumed: () => void;
  onNavLockChange: (locked: boolean) => void;
}

export function HomeView({
  activeTask,
  onActiveTaskChange,
  triggerNewTask,
  onTriggerConsumed,
  onNavLockChange,
}: Props) {
  const [mode, setMode] = useState<HomeMode>(() => {
    const existing = readState();
    if (existing) {
      return { stage: "timer", timerStage: "running", extendInput: "", abandonInput: "" };
    }
    return { stage: "idle" };
  });

  const [tick, setTick] = useState(0);
  const [notified, setNotified] = useState(false);

  // Tick every second for timer updates
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync navLocked based on mode
  useEffect(() => {
    const locked =
      mode.stage === "name_input" ||
      mode.stage === "duration_input" ||
      (mode.stage === "timer" &&
        (mode.timerStage === "done_prompt" ||
          mode.timerStage === "extend_input" ||
          mode.timerStage === "abandon_prompt"));
    onNavLockChange(locked);
  }, [mode]);

  // Handle 'n' trigger from App
  useEffect(() => {
    if (triggerNewTask) {
      onTriggerConsumed();
      if (mode.stage === "idle") {
        setMode({ stage: "name_input", nameInput: "" });
      }
    }
  }, [triggerNewTask]);

  // Sync timer mode when activeTask changes externally (e.g. on mount with existing task)
  useEffect(() => {
    if (activeTask && mode.stage === "idle") {
      setMode({ stage: "timer", timerStage: "running", extendInput: "", abandonInput: "" });
    }
  }, [activeTask]);

  // Notify on expiry
  useEffect(() => {
    if (!activeTask || mode.stage !== "timer" || mode.timerStage !== "running") return;
    const totalMs = activeTask.plannedMs + activeTask.extendedMs;
    const elapsed = Date.now() - activeTask.startedAt;
    if (elapsed >= totalMs && !notified) {
      setNotified(true);
      sendNotification("Blitz — Time's up!", `"${activeTask.name}" finished`);
    }
  }, [tick, activeTask, mode, notified]);

  useInput((input, key) => {
    if (mode.stage === "idle") {
      if (input === "n") {
        setMode({ stage: "name_input", nameInput: "" });
      }
    } else if (mode.stage === "timer" && mode.timerStage === "running") {
      if (input === "d") {
        setMode({ ...mode, timerStage: "done_prompt" });
      } else if (input === "e") {
        setMode({ ...mode, timerStage: "extend_input", extendInput: "" });
      } else if (input === "a") {
        setMode({ ...mode, timerStage: "abandon_prompt", abandonInput: "" });
      }
    } else if (mode.stage === "timer" && mode.timerStage === "done_prompt") {
      if (input === "1") handleFinish("accurate");
      else if (input === "2") handleFinish("underestimated");
      else if (input === "3") handleFinish("overestimated");
      else if (key.escape) {
        setMode({ stage: "timer", timerStage: "running", extendInput: "", abandonInput: "" });
      }
    }
  });

  function handleFinish(
    reflection: "accurate" | "underestimated" | "overestimated"
  ) {
    if (!activeTask) return;
    completeTask(activeTask.id, reflection);
    clearState();
    onActiveTaskChange(null);
    setNotified(false);
    setMode({ stage: "idle" });
  }

  function handleExtendSubmit(val: string) {
    if (!activeTask) return;
    const ms = parseDuration(val);
    if (ms) {
      const newExtended = activeTask.extendedMs + ms;
      const updated = { ...activeTask, extendedMs: newExtended };
      writeState(updated);
      onActiveTaskChange(updated);
    }
    setMode({ stage: "timer", timerStage: "running", extendInput: "", abandonInput: "" });
  }

  function handleAbandonSubmit(val: string) {
    if (!activeTask) return;
    abandonTask(activeTask.id, val || undefined);
    clearState();
    onActiveTaskChange(null);
    setNotified(false);
    setMode({ stage: "idle" });
  }

  function handleNameSubmit(val: string) {
    const name = val.trim();
    if (!name) {
      setMode({ stage: "idle" });
      return;
    }
    const history = getCompletedHistory(100);
    const suggested = suggestDuration(name, history);
    setMode({
      stage: "duration_input",
      name,
      durationInput: suggested ? formatDurationHuman(suggested) : "",
      suggested,
    });
  }

  function handleDurationSubmit(val: string) {
    if (mode.stage !== "duration_input") return;
    const { name, suggested } = mode;
    const input = val.trim();
    const ms = input ? parseDuration(input) : suggested;
    const plannedMs = ms ?? 25 * 60_000;

    const id = insertTask(name, plannedMs);
    const task: ActiveTask = {
      id,
      name,
      startedAt: Date.now(),
      plannedMs,
      extendedMs: 0,
    };
    writeState(task);
    onActiveTaskChange(task);
    setNotified(false);
    setMode({ stage: "timer", timerStage: "running", extendInput: "", abandonInput: "" });
  }

  // ── Stats for idle view ──────────────────────────────────────────────────
  const todayTasks = getTodayTasks();
  const dailyGoal = getDailyGoal();
  const completedToday = todayTasks.filter((t) => t.status === "completed");
  const focusedMs = todayTasks
    .filter((t) => t.actual_ms != null)
    .reduce((sum, t) => sum + (t.actual_ms ?? 0), 0);
  const goalFraction = dailyGoal > 0 ? completedToday.length / dailyGoal : 0;

  const dayName = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // ── Timer rendering ──────────────────────────────────────────────────────
  const renderTimer = () => {
    if (!activeTask) return null;
    const totalMs = activeTask.plannedMs + activeTask.extendedMs;
    const elapsed = Date.now() - activeTask.startedAt;
    const remaining = totalMs - elapsed;
    const expired = remaining <= 0;
    const fraction = elapsed / totalMs;
    const bar = buildBar(fraction, expired);

    return (
      <Box flexDirection="column" marginTop={1}>
        <Box borderStyle="round" flexDirection="column" paddingX={2} paddingY={1}>
          {/* Title + timer */}
          <Box justifyContent="space-between">
            <Text bold>{activeTask.name}</Text>
            <Text color={expired ? "red" : "cyan"} bold>
              [{formatDuration(Math.abs(remaining))}{expired ? " over" : ""}]
            </Text>
          </Box>

          {/* Progress bar */}
          <Box marginTop={0}>
            <Text color={expired ? "red" : "green"}>{bar}</Text>
          </Box>

          {/* Controls */}
          <Box marginTop={1} flexDirection="column">
            {mode.stage === "timer" && mode.timerStage === "running" && (
              <>
                {expired ? (
                  <Text color="red" bold>Time&apos;s up! d done  e extend  a abandon</Text>
                ) : (
                  <Text dimColor>d done  e extend  a abandon  q quit</Text>
                )}
                {activeTask.extendedMs > 0 && (
                  <Text dimColor>+{formatDurationHuman(activeTask.extendedMs)} extended</Text>
                )}
              </>
            )}

            {mode.stage === "timer" && mode.timerStage === "done_prompt" && (
              <Box flexDirection="column">
                <Text bold>How was your estimate?</Text>
                <Text>  [1] Accurate</Text>
                <Text>  [2] Needed more time (underestimated)</Text>
                <Text>  [3] Finished early (overestimated)</Text>
                <Text dimColor>  Esc to cancel</Text>
              </Box>
            )}

            {mode.stage === "timer" && mode.timerStage === "extend_input" && (
              <Box flexDirection="column">
                <Text bold>Extend by: </Text>
                <TextInput
                  value={mode.extendInput}
                  onChange={(v) => setMode({ ...mode, extendInput: v })}
                  onSubmit={handleExtendSubmit}
                  placeholder="e.g. 10m"
                />
              </Box>
            )}

            {mode.stage === "timer" && mode.timerStage === "abandon_prompt" && (
              <Box flexDirection="column">
                <Text bold>Reason (optional, Enter to skip):</Text>
                <TextInput
                  value={mode.abandonInput}
                  onChange={(v) => setMode({ ...mode, abandonInput: v })}
                  onSubmit={handleAbandonSubmit}
                  placeholder=""
                />
              </Box>
            )}
          </Box>
        </Box>

        {/* Today mini summary under timer */}
        <Box marginTop={1} gap={3}>
          <Text dimColor>Today:</Text>
          <Text color="green">✓ {completedToday.length} done</Text>
          <Text dimColor>·</Text>
          <Text dimColor>{formatDurationHuman(focusedMs)} focused</Text>
        </Box>
      </Box>
    );
  };

  // ── Idle view ────────────────────────────────────────────────────────────
  const renderIdle = () => (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold>{dayName}</Text>
      <Box marginTop={1} gap={2}>
        <Text>Daily Goal</Text>
        <Text color="green">{buildGoalBar(goalFraction)}</Text>
        <Text>
          {completedToday.length} / {dailyGoal} tasks · {formatDurationHuman(focusedMs)} focused
        </Text>
      </Box>

      {/* Completed tasks */}
      {completedToday.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {completedToday.map((t) => (
            <Box key={t.id} gap={2}>
              <Text color="green">✓</Text>
              <Text>{t.name.padEnd(24)}</Text>
              <Text dimColor>
                {formatDurationHuman(t.planned_ms)} → {formatDurationHuman(t.actual_ms ?? 0)}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* New task form */}
      {(mode.stage === "name_input" || mode.stage === "duration_input") && (
        <Box
          borderStyle="single"
          borderTop
          borderBottom={false}
          borderLeft={false}
          borderRight={false}
          marginTop={1}
          paddingTop={1}
          flexDirection="column"
        >
          <Text dimColor>── Start new task ──────────────────────────</Text>
          {mode.stage === "name_input" && (
            <Box gap={1} marginTop={0}>
              <Text>Name:</Text>
              <TextInput
                value={mode.nameInput}
                onChange={(v) => setMode({ stage: "name_input", nameInput: v })}
                onSubmit={handleNameSubmit}
                placeholder="What are you working on?"
              />
            </Box>
          )}
          {mode.stage === "duration_input" && (
            <Box flexDirection="column">
              <Text bold>{mode.name}</Text>
              {mode.suggested && (
                <Text dimColor>
                  Suggested: {formatDurationHuman(mode.suggested)} (based on history)
                </Text>
              )}
              <Box gap={1} marginTop={0}>
                <Text>Duration:</Text>
                <TextInput
                  value={mode.durationInput}
                  onChange={(v) =>
                    setMode({ ...mode, durationInput: v })
                  }
                  onSubmit={handleDurationSubmit}
                  placeholder={mode.suggested ? formatDurationHuman(mode.suggested) : "25m"}
                />
              </Box>
              <Text dimColor>Enter to confirm, Esc handled by input</Text>
            </Box>
          )}
        </Box>
      )}

      {mode.stage === "idle" && completedToday.length === 0 && (
        <Box marginTop={2}>
          <Text dimColor>No tasks yet today. Press n to start one.</Text>
        </Box>
      )}

      {mode.stage === "idle" && completedToday.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor>Press n to start a new task.</Text>
        </Box>
      )}
    </Box>
  );

  return (
    <Box flexDirection="column">
      {mode.stage === "timer" ? renderTimer() : renderIdle()}
    </Box>
  );
}
