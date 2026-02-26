import { describe, it, expect } from "bun:test";
import { parseDuration, formatDuration, formatDurationHuman } from "../utils/time.js";

describe("parseDuration", () => {
  it("parses minutes", () => expect(parseDuration("25m")).toBe(25 * 60_000));
  it("parses hours", () => expect(parseDuration("1h")).toBe(3_600_000));
  it("parses combined h+m", () => expect(parseDuration("1h30m")).toBe(5_400_000));
  it("parses seconds", () => expect(parseDuration("90s")).toBe(90_000));
  it("parses plain number as minutes", () => expect(parseDuration("45")).toBe(45 * 60_000));
  it("returns null for invalid input", () => expect(parseDuration("abc")).toBeNull());
  it("returns null for zero", () => expect(parseDuration("0m")).toBeNull());
});

describe("formatDuration", () => {
  it("formats under an hour as mm:ss", () => expect(formatDuration(25 * 60_000)).toBe("25:00"));
  it("formats exactly one hour", () => expect(formatDuration(3_600_000)).toBe("1:00:00"));
  it("formats 1h30m", () => expect(formatDuration(5_400_000)).toBe("1:30:00"));
  it("clamps negative to 0", () => expect(formatDuration(-1000)).toBe("00:00"));
});

describe("formatDurationHuman", () => {
  it("returns Xm for short durations", () => expect(formatDurationHuman(25 * 60_000)).toBe("25m"));
  it("returns Xh for exact hours", () => expect(formatDurationHuman(3_600_000)).toBe("1h"));
  it("returns Xh Ym for combined", () => expect(formatDurationHuman(5_400_000)).toBe("1h 30m"));
});
