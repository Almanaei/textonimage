import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, _resetStore } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request", () => {
    expect(checkRateLimit("1.2.3.4")).toBe(true);
  });

  it("allows requests within the limit", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("1.2.3.4")).toBe(true);
    }
  });

  it("blocks request exceeding the limit", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.2.3.4");
    }
    expect(checkRateLimit("1.2.3.4")).toBe(false);
  });

  it("resets after the window expires", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.2.3.4");
    }
    expect(checkRateLimit("1.2.3.4")).toBe(false);

    // Advance past the 60-second window
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit("1.2.3.4")).toBe(true);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.2.3.4");
    }
    expect(checkRateLimit("1.2.3.4")).toBe(false);
    expect(checkRateLimit("5.6.7.8")).toBe(true);
  });
});
