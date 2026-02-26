/** Parse "25m", "1h", "1h30m", "90s" → milliseconds */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  let total = 0;
  const re = /(\d+)\s*(h|m|s)/g;
  let match: RegExpExecArray | null;
  let found = false;
  while ((match = re.exec(s)) !== null) {
    found = true;
    const n = parseInt(match[1], 10);
    if (match[2] === "h") total += n * 3_600_000;
    else if (match[2] === "m") total += n * 60_000;
    else total += n * 1_000;
  }
  // Plain number → treat as minutes
  if (!found && /^\d+$/.test(s)) {
    total = parseInt(s, 10) * 60_000;
    found = true;
  }
  return found && total > 0 ? total : null;
}

/** Format ms → "25:00" or "1:30:00" */
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Format ms → "25m", "1h 30m" for display */
export function formatDurationHuman(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** Today as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
