import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import type { ActiveTask } from "../state/index.js";
import { writeState, clearState } from "../state/index.js";
import { completeTask, abandonTask } from "../db/tasks.js";
import { sendNotification } from "../utils/notify.js";
import { formatDuration, parseDuration, formatDurationHuman } from "../utils/time.js";

type Mode =
  | "running"
  | "done_prompt"
  | "extend_input"
  | "abandon_prompt"
  | "finished";

interface Props {
  task: ActiveTask;
}

const BAR_WIDTH = 32;

function buildBar(fraction: number, expired: boolean): string {
  const filled = Math.round(Math.min(1, fraction) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const fill = expired ? "█".repeat(BAR_WIDTH) : "█".repeat(filled) + "░".repeat(empty);
  return fill;
}

export function TimerDisplay({ task }: Props) {
  const { exit } = useApp();

  const [mode, setMode] = useState<Mode>("running");
  const [extendedMs, setExtendedMs] = useState(task.extendedMs);
  const [inputVal, setInputVal] = useState("");
  const [notified, setNotified] = useState(false);
  const [tick, setTick] = useState(0);

  const totalMs = task.plannedMs + extendedMs;
  const elapsed = Date.now() - task.startedAt;
  const remaining = totalMs - elapsed;
  const expired = remaining <= 0;
  const fraction = Math.min(1, elapsed / totalMs);

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Notify on expiry
  useEffect(() => {
    if (expired && !notified && mode === "running") {
      setNotified(true);
      sendNotification("Blitz — Time's up!", `"${task.name}" finished`);
    }
  }, [expired, notified, mode, task.name]);

  // Keep state file updated with latest extendedMs
  useEffect(() => {
    if (mode === "running") {
      writeState({ ...task, extendedMs });
    }
  }, [extendedMs, mode]);

  useInput((input, key) => {
    if (mode === "running") {
      if (input === "d") setMode("done_prompt");
      else if (input === "e") { setInputVal(""); setMode("extend_input"); }
      else if (input === "a") { setInputVal(""); setMode("abandon_prompt"); }
      else if (input === "q") {
        // Detach — leave state file, just exit
        exit();
      }
    } else if (mode === "done_prompt") {
      if (input === "1") finish("accurate");
      else if (input === "2") finish("underestimated");
      else if (input === "3") finish("overestimated");
    }
  });

  function finish(reflection: "accurate" | "underestimated" | "overestimated", note?: string) {
    completeTask(task.id, reflection, note);
    clearState();
    setMode("finished");
    setTimeout(() => exit(), 600);
  }

  function handleExtendSubmit(val: string) {
    const ms = parseDuration(val);
    if (ms) {
      const newExtended = extendedMs + ms;
      setExtendedMs(newExtended);
      writeState({ ...task, extendedMs: newExtended });
    }
    setMode("running");
    setInputVal("");
  }

  function handleAbandonSubmit(val: string) {
    abandonTask(task.id, val || undefined);
    clearState();
    setMode("finished");
    setTimeout(() => exit(), 600);
  }

  const elapsedNow = Date.now() - task.startedAt;
  const remainingNow = totalMs - elapsedNow;
  const bar = buildBar(fraction, expired);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (mode === "finished") {
    return (
      <Box borderStyle="round" paddingX={2} paddingY={1} flexDirection="column">
        <Text color="green" bold>✓ Done — great work!</Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="round" paddingX={2} paddingY={1} flexDirection="column" width={50}>
      {/* Title + timer */}
      <Box justifyContent="space-between">
        <Text bold>{task.name}</Text>
        <Text color={expired ? "red" : "cyan"} bold>
          [{formatDuration(Math.abs(remainingNow))}{expired ? " over" : ""}]
        </Text>
      </Box>

      {/* Progress bar */}
      <Box marginTop={0}>
        <Text color={expired ? "red" : "green"}>{bar}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {mode === "running" && !expired && (
          <Text dimColor>[d] done  [e] extend  [a] abandon  [q] detach</Text>
        )}

        {mode === "running" && expired && (
          <>
            <Text color="red" bold>Time&apos;s up! Press d/e/a</Text>
            <Text dimColor>[d] done  [e] extend  [a] abandon</Text>
          </>
        )}

        {mode === "done_prompt" && (
          <Box flexDirection="column">
            <Text bold>How was your estimate?</Text>
            <Text>  [1] Accurate</Text>
            <Text>  [2] Needed more time</Text>
            <Text>  [3] Finished early</Text>
          </Box>
        )}

        {mode === "extend_input" && (
          <Box flexDirection="column">
            <Text bold>Extend by: </Text>
            <TextInput
              value={inputVal}
              onChange={setInputVal}
              onSubmit={handleExtendSubmit}
              placeholder="e.g. 10m"
            />
          </Box>
        )}

        {mode === "abandon_prompt" && (
          <Box flexDirection="column">
            <Text bold>Reason (optional, Enter to skip):</Text>
            <TextInput
              value={inputVal}
              onChange={setInputVal}
              onSubmit={handleAbandonSubmit}
              placeholder=""
            />
          </Box>
        )}
      </Box>

      {/* Extended indicator */}
      {extendedMs > 0 && mode === "running" && (
        <Text dimColor>+{formatDurationHuman(extendedMs)} extended</Text>
      )}
    </Box>
  );
}
