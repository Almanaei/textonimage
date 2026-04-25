/**
 * Admin API smoke tests.
 *
 * Run against a live server:
 *   npx tsx scripts/test-admin-api.ts
 *
 * Optional env:
 *   BASE_URL=http://localhost:3000
 *   ADMIN_API_KEYS=viewer:...,operator:...,admin:...
 *   ADMIN_VIEWER_TOKEN=...
 *   ADMIN_OPERATOR_TOKEN=...
 */

export {};

type Role = "viewer" | "analyst" | "operator" | "admin";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_API_KEYS = process.env.ADMIN_API_KEYS ?? "";

function parseAdminKeys(raw: string): Partial<Record<Role, string>> {
  const parsed: Partial<Record<Role, string>> = {};
  for (const chunk of raw.split(",")) {
    const item = chunk.trim();
    if (!item) continue;
    const [role, ...tokenParts] = item.split(":");
    const token = tokenParts.join(":").trim();
    if (!token) continue;
    if (role === "viewer" || role === "analyst" || role === "operator" || role === "admin") {
      parsed[role] = token;
    }
  }
  return parsed;
}

const roleTokens = parseAdminKeys(ADMIN_API_KEYS);
const viewerToken = process.env.ADMIN_VIEWER_TOKEN ?? roleTokens.viewer ?? roleTokens.analyst ?? "";
const operatorToken = process.env.ADMIN_OPERATOR_TOKEN ?? roleTokens.operator ?? roleTokens.admin ?? "";

function assertResult(name: string, condition: boolean): void {
  if (condition) {
    console.log(`✓ ${name}`);
    return;
  }
  console.error(`✗ ${name}`);
  process.exitCode = 1;
}

async function request(path: string, token?: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
}

async function run(): Promise<void> {
  console.log("=== Admin API Smoke Tests ===");
  console.log(`Base URL: ${BASE_URL}`);

  const unauthorizedOverview = await request("/api/admin/stats/overview");
  assertResult("Unauthorized overview request returns 401", unauthorizedOverview.status === 401);

  const unauthorizedSessions = await request("/api/admin/stats/sessions");
  assertResult("Unauthorized sessions request returns 401", unauthorizedSessions.status === 401);

  if (!viewerToken) {
    console.warn("⚠ No viewer token found (ADMIN_VIEWER_TOKEN / ADMIN_API_KEYS). Skipping read-role checks.");
  } else {
    const readOverview = await request("/api/admin/stats/overview", viewerToken);
    assertResult(
      "Viewer can read overview (200 or 503 when DB missing)",
      readOverview.status === 200 || readOverview.status === 503,
    );

    const readReports = await request("/api/admin/reports", viewerToken);
    assertResult(
      "Viewer can read reports (200 or 503 when DB missing)",
      readReports.status === 200 || readReports.status === 503,
    );

    const viewerExport = await request("/api/admin/reports/export", viewerToken, {
      method: "POST",
      body: JSON.stringify({
        reportType: "overview",
        format: "json",
        filters: {},
        page: 1,
        pageSize: 25,
      }),
    });
    assertResult("Viewer export attempt returns 403", viewerExport.status === 403);
  }

  if (!operatorToken) {
    console.warn("⚠ No operator token found (ADMIN_OPERATOR_TOKEN / ADMIN_API_KEYS). Skipping export-role checks.");
  } else {
    const operatorExport = await request("/api/admin/reports/export", operatorToken, {
      method: "POST",
      body: JSON.stringify({
        reportType: "overview",
        format: "json",
        filters: {},
        page: 1,
        pageSize: 25,
      }),
    });
    assertResult(
      "Operator export works (200 or 503 when DB missing)",
      operatorExport.status === 200 || operatorExport.status === 503,
    );
  }

  if (process.exitCode && process.exitCode !== 0) {
    console.error("Admin API smoke tests failed.");
    process.exit(process.exitCode);
  }
  console.log("All admin smoke checks passed.");
  process.exit(0);
}

void run().catch((error) => {
  console.error(`Could not reach ${BASE_URL}. Start the app first (for example: npm run dev).`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
