import { describe, it, expect, beforeEach } from "bun:test";

// Use an in-memory database for tests by overriding the db path
process.env.BLITZ_TEST_DB = ":memory:";

import { insertTask, completeTask, abandonTask, getTodayTasks, getStreak, getCompletionRate, getAccuracyRate } from "../db/tasks.js";
import { getDb } from "../db/index.js";

beforeEach(() => {
  // Re-initialize schema for a clean slate
  const db = getDb();
  db.run("DELETE FROM tasks");
});

describe("insertTask", () => {
  it("inserts a task with in_progress status", () => {
    const id = insertTask("Test task", 25 * 60_000);
    expect(id).toBeGreaterThan(0);
    const tasks = getTodayTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe("Test task");
    expect(tasks[0].status).toBe("in_progress");
    expect(tasks[0].planned_ms).toBe(25 * 60_000);
  });
});

describe("completeTask", () => {
  it("marks task completed with reflection", () => {
    const id = insertTask("Complete me", 25 * 60_000);
    completeTask(id, "accurate");
    const tasks = getTodayTasks();
    expect(tasks[0].status).toBe("completed");
    expect(tasks[0].reflection).toBe("accurate");
    expect(tasks[0].actual_ms).toBeGreaterThanOrEqual(0);
  });
});

describe("abandonTask", () => {
  it("marks task abandoned with optional note", () => {
    const id = insertTask("Abandon me", 25 * 60_000);
    abandonTask(id, "got interrupted");
    const tasks = getTodayTasks();
    expect(tasks[0].status).toBe("abandoned");
    expect(tasks[0].note).toBe("got interrupted");
  });
});

describe("getStreak", () => {
  it("returns 0 when no completed tasks", () => {
    expect(getStreak()).toBe(0);
  });

  it("counts consecutive days with completions", () => {
    const id = insertTask("Today task", 25 * 60_000);
    completeTask(id, "accurate");
    expect(getStreak()).toBeGreaterThanOrEqual(1);
  });
});

describe("getCompletionRate", () => {
  it("returns 0 with no tasks", () => {
    expect(getCompletionRate(7)).toBe(0);
  });

  it("returns 1.0 when all tasks completed", () => {
    const id1 = insertTask("Task 1", 25 * 60_000);
    const id2 = insertTask("Task 2", 25 * 60_000);
    completeTask(id1, "accurate");
    completeTask(id2, "accurate");
    expect(getCompletionRate(7)).toBe(1);
  });

  it("returns 0.5 when half completed", () => {
    const id1 = insertTask("Done", 25 * 60_000);
    const id2 = insertTask("Abandoned", 25 * 60_000);
    completeTask(id1, "accurate");
    abandonTask(id2);
    expect(getCompletionRate(7)).toBe(0.5);
  });
});

describe("getAccuracyRate", () => {
  it("returns 0 with no reflections", () => {
    expect(getAccuracyRate(20)).toBe(0);
  });

  it("returns proportion of accurate reflections", () => {
    const id1 = insertTask("T1", 25 * 60_000);
    const id2 = insertTask("T2", 25 * 60_000);
    const id3 = insertTask("T3", 25 * 60_000);
    completeTask(id1, "accurate");
    completeTask(id2, "accurate");
    completeTask(id3, "underestimated");
    const rate = getAccuracyRate(20);
    expect(Math.round(rate * 100) / 100).toBeCloseTo(2 / 3, 1);
  });
});
