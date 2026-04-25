/**
 * M5-T2 — GET /api/stats endpoint tests
 *
 * Run against a live dev server: npx tsx scripts/test-stats.ts
 *
 * Requires STATS_SECRET to be set in environment (or .env.local).
 * Load via: npx dotenv-cli -e .env.local -- npx tsx scripts/test-stats.ts
 * or ensure STATS_SECRET is exported in your shell.
 *
 * Test cases:
 *   1 — Correct bearer token            → 200
 *   2 — Wrong token value               → 401
 *   3 — Token shorter than expected     → 401
 *   4 — Token longer than expected      → 401
 *   5 — Missing Authorization header    → 401
 *   6 — Authorization without Bearer    → 401
 *   7 — GET with correct token (method ok) → 200
 *   8 — POST method                     → 405
 */
export {};

import { readFileSync } from "fs";
import { resolve } from "path";

// Load STATS_SECRET from .env.local if not already in environment
if (!process.env.STATS_SECRET) {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("STATS_SECRET=")) {
        process.env.STATS_SECRET = trimmed.slice("STATS_SECRET=".length).trim();
        break;
      }
    }
  } catch {
    // .env.local not found — STATS_SECRET must be set in the environment
  }
}

const STATS_SECRET = process.env.STATS_SECRET ?? "";
if (!STATS_SECRET) {
  console.error(
    "⚠️  STATS_SECRET not set. Set it in your shell or .env.local.\n" +
    "   Tests requiring a valid token will report incorrect failures.",
  );
}

const BASE_URL = "http://localhost:3000/api/stats";

interface TestCase {
  id: string;
  description: string;
  buildRequest: () => RequestInit & { method?: string };
  expectedStatus: number;
  assertBody?: (json: unknown) => void;
}

const cases: TestCase[] = [
  // ── 1 — Correct bearer token → 200 ──────────────────────────────────────
  {
    id: "STS-001",
    description: "Correct bearer token should return 200",
    buildRequest: () => ({
      method: "GET",
      headers: { Authorization: `Bearer ${STATS_SECRET}` },
    }),
    expectedStatus: 200,
    assertBody: (json) => {
      const j = json as Record<string, unknown>;
      if (j.success !== true) throw new Error(`Expected success=true, got ${JSON.stringify(j)}`);
      const data = j.data as Record<string, unknown> | undefined;
      if (!data) throw new Error("Expected data object in response");
      const required = ["generatedAt", "generations", "sessions"];
      for (const key of required) {
        if (!(key in data)) throw new Error(`Missing field: ${key}`);
      }
    },
  },

  // ── 2 — Wrong token value → 401 ─────────────────────────────────────────
  {
    id: "STS-002",
    description: "Wrong token value should return 401",
    buildRequest: () => ({
      method: "GET",
      headers: { Authorization: "Bearer wrongtoken_that_does_not_match" },
    }),
    expectedStatus: 401,
    assertBody: (json) => {
      const j = json as Record<string, unknown>;
      if (j.success !== false) throw new Error(`Expected success=false, got ${JSON.stringify(j)}`);
    },
  },

  // ── 3 — Token shorter than expected → 401 ───────────────────────────────
  {
    id: "STS-003",
    description: "Token shorter than STATS_SECRET should return 401",
    buildRequest: () => ({
      method: "GET",
      headers: { Authorization: `Bearer ${STATS_SECRET.slice(0, Math.max(1, STATS_SECRET.length - 5))}` },
    }),
    expectedStatus: 401,
  },

  // ── 4 — Token longer than expected → 401 ────────────────────────────────
  {
    id: "STS-004",
    description: "Token longer than STATS_SECRET should return 401",
    buildRequest: () => ({
      method: "GET",
      headers: { Authorization: `Bearer ${STATS_SECRET}XXXXX` },
    }),
    expectedStatus: 401,
  },

  // ── 5 — Missing Authorization header → 401 ──────────────────────────────
  {
    id: "STS-005",
    description: "Missing Authorization header should return 401",
    buildRequest: () => ({
      method: "GET",
    }),
    expectedStatus: 401,
  },

  // ── 6 — Authorization without Bearer prefix → 401 ───────────────────────
  {
    id: "STS-006",
    description: "Authorization header without Bearer prefix should return 401",
    buildRequest: () => ({
      method: "GET",
      headers: { Authorization: STATS_SECRET },
    }),
    expectedStatus: 401,
  },

  // ── 7 — GET with correct token (method is allowed) → 200 ────────────────
  {
    id: "STS-007",
    description: "GET with correct token (explicit method check) should return 200",
    buildRequest: () => ({
      method: "GET",
      headers: { Authorization: `Bearer ${STATS_SECRET}` },
    }),
    expectedStatus: 200,
  },

  // ── 8 — POST method → 405 ───────────────────────────────────────────────
  {
    id: "STS-008",
    description: "POST method should return 405",
    buildRequest: () => ({
      method: "POST",
      headers: { Authorization: `Bearer ${STATS_SECRET}` },
    }),
    expectedStatus: 405,
  },
];

async function runCase(tc: TestCase): Promise<boolean> {
  const { method = "GET", ...init } = tc.buildRequest();
  const res = await fetch(BASE_URL, { method, ...init });

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
  console.log("=== /api/stats Tests (M5-T2) ===\n");

  if (!STATS_SECRET) {
    console.warn("⚠️  STATS_SECRET is empty — token-positive tests will likely fail.\n");
  }

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
