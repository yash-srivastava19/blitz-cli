import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { STATE_FILE } from "../utils/paths.js";

export interface ActiveTask {
  id: number;
  name: string;
  startedAt: number;  // Date.now()
  plannedMs: number;
  extendedMs: number;
}

export function readState(): ActiveTask | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as ActiveTask;
  } catch {
    return null;
  }
}

export function writeState(task: ActiveTask): void {
  writeFileSync(STATE_FILE, JSON.stringify(task, null, 2), "utf8");
}

export function clearState(): void {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
}
