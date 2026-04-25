/**
 * T-027–T-030 Edge Case Tests
 *
 * Run against a live dev server: npx tsx scripts/test-edge-cases.ts
 *
 * Tests:
 *   T-027 — Very long name (>60 chars) → 422
 *   T-028 — Single-character name       → 400
 *   T-029 — Extra whitespace in name    → 200 (trimmed + normalised)
 *   T-030 — Arabic diacritics/tashkeel  → 200 (renders correctly)
 */
export {};

const BASE_URL = "http://localhost:3000/api/generate";

interface TestCase {
  id: string;
  description: string;
  body: { name: string; email: string };
  expectedStatus: number;
  /** Optional assertion on the response body (for JSON errors) */
  assertBody?: (json: unknown) => void;
}

const cases: TestCase[] = [
  // ── T-027 — Very long name (> 60 chars) ─────────────────────────────────
  {
    id: "T-027",
    description: "Very long name (> 60 chars) should return 400 (Zod validation)",
    body: {
      name: "عبدالرحمن بن محمد بن عبدالله بن سعد بن فهد العبدالله السعودي الكبير",
      email: "test@example.com",
    },
    expectedStatus: 400,
  },

  // ── T-028 — Single character name ────────────────────────────────────────
  {
    id: "T-028",
    description: "Single-character name should return 400 (min 2 chars required)",
    body: { name: "س", email: "test@example.com" },
    expectedStatus: 400,
  },

  // ── T-029 — Extra whitespace ─────────────────────────────────────────────
  {
    id: "T-029",
    description: "Extra whitespace should be trimmed and succeed with 200",
    body: {
      name: "  سالم   المناعي  ",
      email: "test@example.com",
    },
    expectedStatus: 200,
  },

  // ── T-030 — Arabic diacritics / tashkeel ─────────────────────────────────
  {
    id: "T-030",
    description: "Arabic diacritics (tashkeel) should render correctly → 200",
    body: {
      name: "مُحَمَّدٌ العَلِيّ",
      email: "test@example.com",
    },
    expectedStatus: 200,
  },
];

async function runCase(tc: TestCase): Promise<boolean> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tc.body),
  });

  const pass = res.status === tc.expectedStatus;
  const icon = pass ? "✅" : "❌";

  let detail = `status=${res.status}`;
  if (!pass || res.status !== 200) {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("json")) {
      const json = await res.json();
      detail += ` body=${JSON.stringify(json)}`;
      tc.assertBody?.(json);
    }
  } else {
    // 200 — verify we got a PNG back
    const ct = res.headers.get("content-type") ?? "";
    const pngOk = ct.startsWith("image/png");
    detail += ` content-type=${ct} png=${pngOk}`;
    if (!pngOk) return false;
  }

  console.log(`${icon} [${tc.id}] ${tc.description} — ${detail}`);
  return pass;
}

async function main() {
  console.log("=== Edge Case Tests (T-027 to T-030) ===\n");

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
