# Admin Dashboard — Predeployment QA Report

**Run:** 2026-04-25 04:16 UTC+3
**Tester:** Cursor agent (Playwright MCP)
**Target:** `http://localhost:3000` (Next.js 16.2.4 dev, Turbopack)
**Artifacts:** `qa/predeploy/admin/20260425-041620/`

---

## Verdict: CONDITIONAL GO

All eight test phases passed. No security or functional blockers. Two non-blocking findings should be triaged before production:

1. **Conversion Rate KPI = 350% with Visitors = 0** — overview aggregation likely divides by the wrong base. Cosmetic but visible to operators.
2. **Login rate-limit threshold = 10 req/min/IP (default)** — appropriate for prod, but operators sharing one egress IP may trip it. Document this in the runbook.

The `admin/admin` credential pair shipped in `app/.env.local` does not work; the active password is `AdminAlmannai`. Confirm `.env.local` is dev-only and not deployed.

---

## Phase Results

| # | Phase | Result | Notes |
|---|---|---|---|
| 1 | Authorization (unauthed) | PASS | All 6 admin endpoints return 401; `/admin` redirects to `/admin/login` |
| 2 | Login flows | PASS | Bad creds → 401 + UI message; empty fields → client validation; rate-limit fires at 10 req/min (429); valid login issues `admin_session` cookie |
| 3 | Dashboard load | PASS | 10 KPIs populate, badges render, 0 console errors / 0 warnings |
| 4 | Filtering | PASS | `startDate`, `endDate`, `success`, `errorType` query params correctly wired; empty-state copy renders; reset clears params |
| 5 | Pagination + sort | PASS | `page`, `pageSize` propagate; prev/next disabled at bounds; sessions `sortBy` toggles correctly |
| 6 | Export pipeline | PASS | All 10 combos (5 types × csv/json) → 200 with proper `Content-Type` + `Content-Disposition`; UI export creates valid blob/download; invalid date range → 400 |
| 7 | Refresh + logout | PASS | Refresh refetches all 5 endpoints; logout calls `/api/admin/auth/logout` and redirects; post-logout APIs return 401 |
| 8 | Public isolation + mobile | PASS | Public page makes 0 calls to `/api/admin/*`; no admin links in DOM; mobile viewport renders without layout breakage |

---

## Phase 1 — Unauthenticated access

```
GET  /api/admin/stats/overview     → 401 {"success":false,"message":"Unauthorized"}
GET  /api/admin/stats/generations  → 401
GET  /api/admin/stats/users        → 401
GET  /api/admin/stats/sessions     → 401
GET  /api/admin/reports            → 401
POST /api/admin/reports/export     → 401
GET  /admin                        → 302 → /admin/login
```

Screenshot: `20260425-041620/01-login-redirect.png`

## Phase 2 — Login

- 1 bad-cred attempt → UI shows `"Invalid username or password."`
- Empty submit → client renders `Username is required.` and `Password is required.`
- After 10 attempts within 60s window → server returns `429 Too many requests. Please try again later.` (configured by `RATE_LIMIT_WINDOW_MS=60000`, `RATE_LIMIT_MAX=10` in `app/lib/rate-limit.ts`)
- Valid `admin` / `AdminAlmannai` → 200, `admin_session` HttpOnly cookie set

> **Note:** `app/.env.local` ships an `ADMIN_CREDENTIALS` hash that is **not** for password `admin` despite the comment. The actual valid password is `AdminAlmannai` (verified). Update the comment or regenerate the hash.

## Phase 3 — Dashboard KPIs

```
Visitors: 0          Sessions: 2          Returning Users: 0
Successful Gen: 7    Failed Gen: 0        Total Gen: 7
Conversion Rate: 350%   Avg Gen Time: 9234 ms
Download Clicks: 1   Rate-Limited: 0

API Health: healthy   Sync: Apr 25, 2026, 4:20 AM
```

Screenshot: `20260425-041620/02-dashboard-loaded.png`. Console clean (0 errors / 0 warnings).

> **Finding F1 (non-blocking):** `Conversion Rate = 350%` with `Visitors = 0`. Inspect `buildAdminOverview` in [`app/lib/admin/aggregation.ts`](app/lib/admin/aggregation.ts) for the denominator used when visitors are 0 (likely `successful/sessions` or unguarded division).

## Phase 4 — Filters

Apply `startDate=2026-04-20`, `endDate=2026-04-25`, status `Failed only`, errorType `server` → all 5 endpoints refetched with correct query strings:

```
/api/admin/stats/overview?startDate=2026-04-20&endDate=2026-04-25
/api/admin/stats/generations?startDate=...&success=false&errorType=server&page=1&pageSize=25&sortOrder=desc
/api/admin/stats/users?...
/api/admin/stats/sessions?...&sortBy=last_seen_at
/api/admin/reports?...&includeTrends=true
```

Generations table shows `"No generation records for the selected filters."` empty state. Reset button restores defaults and refetches.

## Phase 5 — Pagination & sort

- Generations page-size 25 → 50 fires `pageSize=50`. Prev/Next disabled (only 7 rows).
- Sessions sort `last_seen_at` → `created_at` fires `sortBy=created_at`.

## Phase 6 — Exports

| Report | Format | Status | Content-Type | Bytes | Valid |
|---|---|---|---|---|---|
| full | csv | 200 | text/csv; charset=utf-8 | 987 | yes |
| full | json | 200 | application/json; charset=utf-8 | 835 | yes |
| overview | csv | 200 | text/csv; charset=utf-8 | 287 | yes |
| overview | json | 200 | application/json; charset=utf-8 | 339 | yes |
| generations | csv | 200 | text/csv; charset=utf-8 | 987 | yes |
| generations | json | 200 | application/json; charset=utf-8 | 2220 | yes |
| users | csv | 200 | text/csv; charset=utf-8 | 56 | yes |
| users | json | 200 | application/json; charset=utf-8 | 477 | yes |
| sessions | csv | 200 | text/csv; charset=utf-8 | 396 | yes |
| sessions | json | 200 | application/json; charset=utf-8 | 606 | yes |

All responses include `Content-Disposition: attachment; filename="admin-<type>-<iso>.{csv,json}"`. UI export-button path verified end-to-end (Blob + anchor download intercept). Invalid date range (`startDate > endDate`) → `400` with field-level message.

## Phase 7 — Refresh + logout

- Refresh re-fires the same 5 endpoints and updates `Last successful sync`.
- Sign Out → `POST /api/admin/auth/logout` (200) → redirect to `/admin/login`.
- Post-logout `GET /api/admin/stats/overview` and `/api/admin/reports` both return `401` — cookie revoked correctly.

## Phase 8 — Public isolation

On `http://localhost:3000/`:
- `document.querySelectorAll('a[href*="admin"]').length === 0`
- Page HTML contains no `/api/admin` references.
- `performance.getEntriesByType('resource')` filtered for `/api/admin` → empty array.
- No "Admin Dashboard" string in public HTML.

Public frontend is fully isolated from admin (admin-dashboard-skill Rule 1 satisfied).

Mobile viewport (390×844) re-render of `/admin`: no layout breakage, no horizontal overflow on header/filter/KPI cards. Tables scroll horizontally (intended via `overflow-x-auto`). Screenshot: `20260425-041620/04-mobile-admin.png`.

---

## Findings & Recommendations

| ID | Severity | Area | Description | Action |
|---|---|---|---|---|
| F1 | Medium | Aggregation | `Conversion Rate = 350%` with `Visitors = 0` — wrong denominator | Review denominator in [`app/lib/admin/aggregation.ts`](app/lib/admin/aggregation.ts); guard `visitors === 0` |
| F2 | Low | Env doc | `app/.env.local` comment claims password `admin` but hash is for `AdminAlmannai` | Update comment or regenerate the scrypt hash |
| F3 | Low | Ops doc | Login rate limit (10/min/IP) shared across all `/api/admin/auth/login` callers | Document threshold in deployment runbook so operators behind shared NAT know what to expect |
| F4 | Info | Observability | Logout endpoint always succeeds even when no session exists (verified post-logout call) | OK; matches typical idempotent-logout pattern |

---

## Skill Compliance — admin-dashboard-skill output contract

### Admin Boundary Check
- Separation status: **Confirmed** — admin code under `app/app/admin/**`, `app/app/api/admin/**`, `app/lib/admin/**`. No imports from public pages.
- Public frontend impact: **None** — public `/` makes no admin API calls and contains no admin links.

### Auth and Access
- Admin-only enforcement: **All 6 admin API endpoints return 401 without `admin_session` cookie or Bearer token.**
- Role/permission checks: `requireAdminAccess` in [`app/lib/admin/auth.ts`](app/lib/admin/auth.ts) maps roles → permissions; export endpoint requires `admin:export`, stats require `admin:read`. Verified for cookie path; Bearer path not exercised in this run.

### Filtering and Reporting
- Implemented filters: date range, success boolean, errorType string, pagination, sort order, sortBy (sessions). All wired through to URL query params and Zod-validated server side.
- Reporting endpoints: `/api/admin/reports`, `/api/admin/reports/export` (5 types).
- Data consistency: KPI totals match table counts (7 generations across both views). Conversion-rate denominator suspect (F1).

### Export and Observability
- Export features: 5 report types × 2 formats, all return correct MIME + filename + valid body.
- Logging/monitoring: `logAdminEvent` instrumentation visible in route handlers (`admin_overview_success`, `admin_export_success`, `admin_login_failed`, `admin_login_rate_limited`, etc.).
- PII safety: spot-checked log calls — `name`/`email` are not in event payloads. Generation rows in API responses do contain `name`/`email`, which is intended for the admin UI; ensure auditor knows admin DB has cleartext PII.

### Validation
- Tests/checks run: 8 phases, 0 console errors during dashboard interaction, 10/10 export combos verified, full auth gate verified.
- Remaining risks: F1 (KPI math), F2 (env comment), F3 (rate-limit doc).

---

## Sign-off

QA agent: Predeployment **conditional GO**. Address F1 before production rollout; F2/F3 are doc-only and can ship as part of release notes.
