/**
 * M5-T1 — POST /api/track endpoint tests
 *
 * Run against a live dev server: npx tsx scripts/test-track.ts
 *
 * Test cases:
 *   1 — Valid page_view event           → 200
 *   2 — Valid download_clicked event    → 200
 *   3 — Unknown event type              → 400
 *   4 — Missing eventType field         → 400
 *   5 — Oversized body (no Content-Length) → 413
 *   6 — Empty body                      → 400
 *   7 — Non-JSON body                   → 400
 */
export {};

const BASE_URL = "http://localhost:3000/api/track";

interface TestCase {
  id: string;
  description: string;
  buildRequest: () => RequestInit;
  expectedStatus: number;
  assertBody?: (json: unknown) => void;
}

const cases: TestCase[] = [
  // ── 1 — Valid page_view ──────────────────────────────────────────────────
  {
    id: "TRK-001",
    description: "Valid page_view event should return 200",
    buildRequest: () => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "page_view" }),
    }),
    expectedStatus: 200,
    assertBody: (json) => {
      const j = json as Record<string, unknown>;
      if (j.success !== true) throw new Error(`Expected success=true, got ${JSON.stringify(j)}`);
    },
  },

  // ── 2 — Valid download_clicked ───────────────────────────────────────────
  {
    id: "TRK-002",
    description: "Valid download_clicked event should return 200",
    buildRequest: () => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "download_clicked" }),
    }),
    expectedStatus: 200,
    assertBody: (json) => {
      const j = json as Record<string, unknown>;
      if (j.success !== true) throw new Error(`Expected success=true, got ${JSON.stringify(j)}`);
    },
  },

  // ── 3 — Unknown event type ───────────────────────────────────────────────
  {
    id: "TRK-003",
    description: "Unknown event type should return 400",
    buildRequest: () => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "unknown_event" }),
    }),
    expectedStatus: 400,
    assertBody: (json) => {
      const j = json as Record<string, unknown>;
      if (j.success !== false) throw new Error(`Expected success=false, got ${JSON.stringify(j)}`);
      if (typeof j.message !== "string") throw new Error("Expected message string");
    },
  },

  // ── 4 — Missing eventType field ──────────────────────────────────────────
  {
    id: "TRK-004",
    description: "Missing eventType field should return 400",
    buildRequest: () => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
    expectedStatus: 400,
    assertBody: (json) => {
      const j = json as Record<string, unknown>;
      if (j.success !== false) throw new Error(`Expected success=false, got ${JSON.stringify(j)}`);
    },
  },

  // ── 5 — Oversized body without Content-Length ────────────────────────────
  {
    id: "TRK-005",
    description: "Oversized body (5 KB, no Content-Length) should return 413",
    buildRequest: () => ({
      method: "POST",
      // Deliberately omit Content-Type to also omit automatic Content-Length
      // from fetch for the body size enforcement test.
      headers: {},
      // 5 KB payload: repeat a string to exceed the 1 KB limit
      body: "A".repeat(5 * 1024),
      // duplex needed in Node 18+ for streaming body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      duplex: "half" as any,
    }),
    expectedStatus: 413,
  },

  // ── 6 — Empty body ───────────────────────────────────────────────────────
  {
    id: "TRK-006",
    description: "Empty body should return 400",
    buildRequest: () => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    }),
    expectedStatus: 400,
  },

  // ── 7 — Non-JSON body ────────────────────────────────────────────────────
  {
    id: "TRK-007",
    description: "Non-JSON body should return 400",
    buildRequest: () => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    }),
    expectedStatus: 400,
    assertBody: (json) => {
      const j = json as Record<string, unknown>;
      if (j.success !== false) throw new Error(`Expected success=false, got ${JSON.stringify(j)}`);
    },
  },
];

async function runCase(tc: TestCase): Promise<boolean> {
  const res = await fetch(BASE_URL, tc.buildRequest());

  const pass = res.status === tc.expectedStatus;
  const icon = pass ? "✅" : "❌";

  let detail = `status=${res.status}`;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("json")) {
    try {
      const json = await res.json();
      detail += ` body=${JSON.stringify(json)}`;
      if (pass && tc.assertBody) tc.assertBody(json);
    } catch {
      // body already consumed or not JSON
    }
  }

  console.log(`${icon} [${tc.id}] ${tc.description} — ${detail}`);
  return pass;
}

async function main() {
  console.log("=== /api/track Tests (M5-T1) ===\n");

  let passed = 0;
  let failed = 0;

  for (const tc of cases) {
    try {
      const ok = await runCase(tc);
      if (ok) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`❌ [${tc.id}] ${tc.description} — THREW:`, err);
      failed++;
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) process.exit(1);
}

main();
