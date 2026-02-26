import { describe, it, expect } from "bun:test";
import { suggestDuration } from "../utils/suggest.js";

const history = [
  { name: "Write blog post", actualMs: 30 * 60_000 },
  { name: "Write blog post", actualMs: 35 * 60_000 },
  { name: "Write blog post", actualMs: 25 * 60_000 },
  { name: "Review PRs", actualMs: 20 * 60_000 },
  { name: "Review PRs", actualMs: 15 * 60_000 },
  { name: "Review PRs", actualMs: 18 * 60_000 },
];

describe("suggestDuration", () => {
  it("returns median for similar tasks", () => {
    const result = suggestDuration("Write blog post", history);
    // Sorted actuals: 25, 30, 35 → median 30m → rounded to nearest 5m = 30m
    expect(result).toBe(30 * 60_000);
  });

  it("returns null if fewer than 3 similar tasks", () => {
    expect(suggestDuration("totally unrelated task xyz", history)).toBeNull();
  });

  it("rounds to nearest 5 minutes", () => {
    const h = [
      { name: "standup", actualMs: 12 * 60_000 },
      { name: "standup", actualMs: 13 * 60_000 },
      { name: "standup", actualMs: 14 * 60_000 },
    ];
    const result = suggestDuration("standup", h);
    // median ~13m → rounds to 15m
    expect(result).toBe(15 * 60_000);
  });

  it("is case-insensitive", () => {
    const result = suggestDuration("WRITE BLOG POST", history);
    expect(result).not.toBeNull();
  });
});
