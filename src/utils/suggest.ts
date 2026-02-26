/** Inline Levenshtein distance */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Similarity 0–1 (1 = identical) */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

/** Given a task name and list of {name, actualMs}, suggest median actual_ms of similar tasks.
 *  Returns null if fewer than 3 similar tasks found. */
export function suggestDuration(
  name: string,
  history: { name: string; actualMs: number }[]
): number | null {
  const THRESHOLD = 0.5;
  const similar = history
    .filter((h) => similarity(name, h.name) >= THRESHOLD)
    .map((h) => h.actualMs)
    .sort((a, b) => a - b);

  if (similar.length < 3) return null;

  // Median
  const mid = Math.floor(similar.length / 2);
  const raw = similar.length % 2 === 0
    ? (similar[mid - 1] + similar[mid]) / 2
    : similar[mid];

  // Round to nearest 5 minutes
  const fiveMin = 5 * 60_000;
  return Math.round(raw / fiveMin) * fiveMin;
}
