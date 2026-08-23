import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "./format";

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats past timestamps without changing existing semantics", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T12:00:00.000Z"));

    expect(formatRelativeTime("2026-08-23T10:00:00.000Z")).toBe("2h ago");
  });

  it("formats future session expiry timestamps without negative ago text", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T12:00:00.000Z"));

    expect(formatRelativeTime("2026-08-29T12:00:00.000Z")).toBe("in 6d");
  });

  it("fails safely for invalid timestamps", () => {
    expect(formatRelativeTime("not-a-timestamp")).toBe("Unavailable");
  });
});
