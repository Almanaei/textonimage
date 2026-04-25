/**
 * scripts/test-analytics.ts — QA script for the analytics pipeline.
 *
 * Tests:
 *   1. POST /api/track  — accepts valid events, rejects invalid
 *   2. POST /api/generate — instruments generation_requested + success/error events
 *   3. GET  /api/stats  — returns KPIs; rejects missing/wrong token
 *
 * Prerequisites:
 *   - App running at BASE_URL (default http://localhost:3000)
 *   - DATABASE_URL and STATS_SECRET set in .env.local
 *
 * Usage:
 *   npx tsx scripts/test-analytics.ts
 */
export {};

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STATS_SECRET = process.env.STATS_SECRET ?? "";

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function testTrackEndpoint(): Promise<void> {
  console.log("\n── POST /api/track ──────────────────────────────────────────");

  // 1. Valid event (session ID comes from cookie set by middleware)
  const r1 = await fetch(`${BASE_URL}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType: "page_view" }),
  });
  assert("200 for valid event", r1.status === 200);
  const b1 = await r1.json() as { success: boolean };
  assert("success: true in body", b1.success === true);

  // 2. Unknown event type
  const r2 = await fetch(`${BASE_URL}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType: "unknown_event" }),
  });
  assert("400 for unknown event type", r2.status === 400);

  // 3. GET should return 405
  const r4 = await fetch(`${BASE_URL}/api/track`);
  assert("405 for GET request", r4.status === 405);

  // 4. download_clicked event with metadata
  const r5 = await fetch(`${BASE_URL}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "download_clicked",
      metadata: { format: "png" },
    }),
  });
  assert("200 for download_clicked with metadata", r5.status === 200);
}

async function testGenerateEndpoint(): Promise<void> {
  console.log("\n── POST /api/generate (event instrumentation) ───────────────");

  // 1. Valid request — should trigger generation_requested + generation_success
  const r1 = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "فاطمة", email: "test@example.com" }),
  });
  assert("200 for valid Arabic name", r1.status === 200);
  assert("Content-Type is image/png", (r1.headers.get("content-type") ?? "").includes("image/png"));

  // 2. Invalid name — should trigger generation_error (validation)
  const r2 = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "John", email: "test@example.com" }),
  });
  assert("400 for non-Arabic name", r2.status === 400);

  // 3. Name > 60 chars — should trigger generation_error (validation)
  const longName = "أ".repeat(61);
  const r3 = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: longName, email: "test@example.com" }),
  });
  assert("400 for name > 60 chars", r3.status === 400);
}

async function testStatsEndpoint(): Promise<void> {
  console.log("\n── GET /api/stats ───────────────────────────────────────────");

  // 1. No auth — should return 401
  const r1 = await fetch(`${BASE_URL}/api/stats`);
  assert("401 with no Authorization header", r1.status === 401);

  // 2. Wrong token
  const r2 = await fetch(`${BASE_URL}/api/stats`, {
    headers: { Authorization: "Bearer wrong-token" },
  });
  assert("401 with wrong token", r2.status === 401);

  if (!STATS_SECRET) {
    console.log("  ⚠ STATS_SECRET not set — skipping authenticated stats tests");
    return;
  }

  // 3. Correct token
  const r3 = await fetch(`${BASE_URL}/api/stats`, {
    headers: { Authorization: `Bearer ${STATS_SECRET}` },
  });
  assert("200 with correct token", r3.status === 200);

  const body = await r3.json() as {
    success: boolean;
    data?: {
      generatedAt: string;
      generations: { allTime: { total: number }; today: { total: number } };
      sessions: { totalAllTime: number; totalToday: number };
      errorBreakdown: unknown[];
      rateLimited: { count: number };
      trend: unknown[];
    };
  };
  assert("success: true in body", body.success === true);
  assert("data.generatedAt present", typeof body.data?.generatedAt === "string");
  assert("data.generations.allTime present", typeof body.data?.generations?.allTime?.total === "number");
  assert("data.sessions present", typeof body.data?.sessions?.totalAllTime === "number");
  assert("data.trend is array", Array.isArray(body.data?.trend));
  assert("data.errorBreakdown is array", Array.isArray(body.data?.errorBreakdown));

  // 4. POST should return 405
  const r4 = await fetch(`${BASE_URL}/api/stats`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STATS_SECRET}` },
  });
  assert("405 for POST to stats", r4.status === 405);
}

async function main(): Promise<void> {
  console.log(`\nRunning analytics QA against ${BASE_URL}\n`);

  await testTrackEndpoint();
  await testGenerateEndpoint();
  await testStatsEndpoint();

  console.log(`\n────────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
