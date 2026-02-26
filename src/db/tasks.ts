import { getDb } from "./index.js";
import { today } from "../utils/time.js";

export interface TaskRow {
  id: number;
  name: string;
  started_at: number;
  ended_at: number | null;
  planned_ms: number;
  actual_ms: number | null;
  status: "in_progress" | "completed" | "abandoned";
  note: string | null;
  reflection: "accurate" | "underestimated" | "overestimated" | null;
  date: string;
}

export function insertTask(name: string, plannedMs: number): number {
  const db = getDb();
  const now = Date.now();
  const result = db.run(
    `INSERT INTO tasks (name, started_at, planned_ms, status, date)
     VALUES (?, ?, ?, 'in_progress', ?)`,
    [name, now, plannedMs, today()]
  );
  return result.lastInsertRowid as number;
}

export function completeTask(
  id: number,
  reflection: "accurate" | "underestimated" | "overestimated",
  note?: string
): void {
  const db = getDb();
  const now = Date.now();
  const row = db.query("SELECT started_at FROM tasks WHERE id = ?").get(id) as { started_at: number } | null;
  if (!row) return;
  const actualMs = now - row.started_at;
  db.run(
    `UPDATE tasks SET ended_at = ?, actual_ms = ?, status = 'completed', reflection = ?, note = ?
     WHERE id = ?`,
    [now, actualMs, reflection, note ?? null, id]
  );
}

export function abandonTask(id: number, note?: string): void {
  const db = getDb();
  const now = Date.now();
  const row = db.query("SELECT started_at FROM tasks WHERE id = ?").get(id) as { started_at: number } | null;
  if (!row) return;
  const actualMs = now - row.started_at;
  db.run(
    `UPDATE tasks SET ended_at = ?, actual_ms = ?, status = 'abandoned', note = ?
     WHERE id = ?`,
    [now, actualMs, note ?? null, id]
  );
}

export function getRecentTasks(days = 7): TaskRow[] {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const dateStr = cutoff.toISOString().slice(0, 10);
  return db.query(
    `SELECT * FROM tasks WHERE date >= ? ORDER BY started_at DESC`
  ).all(dateStr) as TaskRow[];
}

export function getTodayTasks(): TaskRow[] {
  const db = getDb();
  return db.query(
    `SELECT * FROM tasks WHERE date = ? ORDER BY started_at ASC`
  ).all(today()) as TaskRow[];
}

export function getCompletedHistory(limit = 100): { name: string; actualMs: number }[] {
  const db = getDb();
  return db.query(
    `SELECT name, actual_ms as actualMs FROM tasks
     WHERE status = 'completed' AND actual_ms IS NOT NULL
     ORDER BY started_at DESC LIMIT ?`
  ).all(limit) as { name: string; actualMs: number }[];
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface DayStats {
  date: string;
  completed: number;
  abandoned: number;
  total: number;
}

export function getStreak(): number {
  const db = getDb();
  const rows = db.query(
    `SELECT date, COUNT(*) as completed
     FROM tasks WHERE status = 'completed'
     GROUP BY date ORDER BY date DESC`
  ).all() as { date: string; completed: number }[];

  if (rows.length === 0) return 0;

  let streak = 0;
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);

  for (const row of rows) {
    const d = new Date(row.date + "T00:00:00");
    const diffDays = Math.round((cur.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === streak) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getCompletionRate(days = 7): number {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const dateStr = cutoff.toISOString().slice(0, 10);
  const row = db.query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
     FROM tasks WHERE date >= ? AND status != 'in_progress'`
  ).get(dateStr) as { total: number; completed: number } | null;
  if (!row || row.total === 0) return 0;
  return row.completed / row.total;
}

export function getAccuracyRate(limit = 20): number {
  const db = getDb();
  const rows = db.query(
    `SELECT reflection FROM tasks
     WHERE status = 'completed' AND reflection IS NOT NULL
     ORDER BY started_at DESC LIMIT ?`
  ).all(limit) as { reflection: string }[];
  if (rows.length === 0) return 0;
  const accurate = rows.filter((r) => r.reflection === "accurate").length;
  return accurate / rows.length;
}

export function getDailyGoal(): number {
  const db = getDb();
  const row = db.query(`SELECT value FROM config WHERE key = 'daily_goal'`).get() as { value: string } | null;
  return row ? parseInt(row.value, 10) : 4;
}
