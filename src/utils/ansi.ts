// Minimal ANSI helpers — no deps, no Ink needed for static output
export const c = {
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue:   (s: string) => `\x1b[34m${s}\x1b[0m`,
  magenta:(s: string) => `\x1b[35m${s}\x1b[0m`,
};

export function bar(fraction: number, width = 20, color = c.green): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * width);
  return color("█".repeat(filled)) + c.dim("░".repeat(width - filled));
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function print(line = ""): void {
  process.stdout.write(line + "\n");
}
