/**
 * Tests for buildAdminOverview conversion-rate semantics.
 *
 * Scenario coverage:
 *   - Empty dataset → 0%
 *   - One converting session out of two visitors → 50%
 *   - One session with multiple successes → never exceeds 100%
 *   - Visitors=0 fallback to sessions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

interface Row {
  total?: string;
  visitors?: string;
  successful?: string;
  avg_duration_ms?: string;
  converting_sessions?: string;
}

type QueryResult = { rows: Row[] };

const responses: QueryResult[] = [];

function pushScenario(opts: {
  sessions: number;
  visitors: number;
  totalGenerations: number;
  successfulGenerations: number;
  convertingSessions: number;
  avgDurationMs?: number;
  rateLimited?: number;
}): void {
  responses.length = 0;
  responses.push(
    { rows: [{ total: String(opts.sessions) }] },
    { rows: [{ visitors: String(opts.visitors) }] },
    {
      rows: [
        {
          total: String(opts.totalGenerations),
          successful: String(opts.successfulGenerations),
          avg_duration_ms: String(opts.avgDurationMs ?? 0),
          converting_sessions: String(opts.convertingSessions),
        },
      ],
    },
    { rows: [{ total: String(opts.rateLimited ?? 0) }] },
  );
}

const queryMock = vi.fn(async () => {
  const next = responses.shift();
  if (!next) throw new Error("no more canned responses");
  return next;
});

vi.mock("@/lib/db", () => ({
  getPool: () => ({ query: queryMock }),
}));

const { buildAdminOverview } = await import("@/lib/admin/aggregation");

describe("buildAdminOverview — conversion rate", () => {
  beforeEach(() => {
    queryMock.mockClear();
  });

  it("returns 0% when there are no visitors and no sessions", async () => {
    pushScenario({
      sessions: 0,
      visitors: 0,
      totalGenerations: 0,
      successfulGenerations: 0,
      convertingSessions: 0,
    });
    const result = await buildAdminOverview({ startAt: null, endAt: null });
    expect(result.totals.conversionRate).toBe(0);
  });

  it("computes percentage of converting sessions over visitors", async () => {
    pushScenario({
      sessions: 5,
      visitors: 4,
      totalGenerations: 6,
      successfulGenerations: 6,
      convertingSessions: 2,
    });
    const result = await buildAdminOverview({ startAt: null, endAt: null });
    // 2 converting / 4 visitors = 50%
    expect(result.totals.conversionRate).toBe(50);
  });

  it("falls back to sessions when visitors=0", async () => {
    pushScenario({
      sessions: 4,
      visitors: 0,
      totalGenerations: 7,
      successfulGenerations: 7,
      convertingSessions: 1,
    });
    const result = await buildAdminOverview({ startAt: null, endAt: null });
    // 1 converting / 4 sessions = 25%
    expect(result.totals.conversionRate).toBe(25);
  });

  it("never exceeds 100% even when one session generates many successes", async () => {
    // Regression for F1: visitors=0, sessions=2, successful=7, but only one
    // session converted. Old math returned 350% (7/2*100). New math clamps.
    pushScenario({
      sessions: 2,
      visitors: 0,
      totalGenerations: 7,
      successfulGenerations: 7,
      convertingSessions: 1,
    });
    const result = await buildAdminOverview({ startAt: null, endAt: null });
    expect(result.totals.conversionRate).toBeGreaterThanOrEqual(0);
    expect(result.totals.conversionRate).toBeLessThanOrEqual(100);
    expect(result.totals.conversionRate).toBe(50);
  });

  it("clamps to 100% if upstream data is inconsistent", async () => {
    // Defensive: if convertingSessions > base for any reason (clock skew,
    // join anomaly), the dashboard must still render a sane number.
    pushScenario({
      sessions: 1,
      visitors: 0,
      totalGenerations: 5,
      successfulGenerations: 5,
      convertingSessions: 3,
    });
    const result = await buildAdminOverview({ startAt: null, endAt: null });
    expect(result.totals.conversionRate).toBe(100);
  });
});
