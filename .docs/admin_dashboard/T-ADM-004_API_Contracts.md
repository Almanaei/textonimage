# T-ADM-004 — Admin API Contracts

## Document Control
- Task ID: `T-ADM-004`
- Owner: Backend Engineer Agent
- Date: 2026-04-23
- Milestone: `M8`

## Common Contract
- Base path: `/api/admin`
- Auth header: `Authorization: Bearer <token>`
- Success envelope: `{ "success": true, "data": <payload> }`
- Error envelope: `{ "success": false, "message": "<text>", "field"?: "<field|null>" }`
- Shared status codes:
  - `200` success
  - `400` validation error
  - `401` unauthorized
  - `403` forbidden
  - `405` method not allowed
  - `429` failed-auth throttling
  - `500` server error
  - `503` analytics unavailable

## Endpoints

### 1) GET `/api/admin/stats/overview`
- Permission: `admin:read`
- Query:
  - `startDate?` (`YYYY-MM-DD`)
  - `endDate?` (`YYYY-MM-DD`)
- Response payload:
  - `generatedAt`
  - `filters.startDate`, `filters.endDate`
  - `totals.visitors`
  - `totals.sessions`
  - `totals.generations`
  - `totals.successfulGenerations`
  - `totals.failedGenerations`
  - `totals.conversionRate`
  - `totals.avgGenerationTimeMs`
  - `totals.rateLimitedRequests`

### 2) GET `/api/admin/stats/generations`
- Permission: `admin:read`
- Query:
  - `startDate?`, `endDate?`
  - `page` (default 1)
  - `pageSize` (default 25, max 100)
  - `sortOrder` (`asc|desc`, default `desc`)
  - `success?` (`true|false`)
  - `errorType?`
- Response payload:
  - `generatedAt`, `page`, `pageSize`, `total`
  - `rows[]`: `id`, `sessionId`, `success`, `durationMs`, `errorType`, `createdAt`

### 3) GET `/api/admin/stats/users`
- Permission: `admin:read`
- Query:
  - `startDate?`, `endDate?`
  - `page` (default 1)
  - `pageSize` (default 25, max 100)
  - `sortOrder` (`asc|desc`, default `desc`)
- Response payload:
  - `generatedAt`, `page`, `pageSize`, `totalDays`
  - `filters.startDate`, `filters.endDate`
  - `summary.newUsers`, `activeUsers`, `returningUsers`, `pageViews`, `downloadClicks`
  - `trend[]`: `date`, `newUsers`, `activeUsers`

### 4) GET `/api/admin/stats/sessions`
- Permission: `admin:read`
- Query:
  - `startDate?`, `endDate?`
  - `page` (default 1)
  - `pageSize` (default 25, max 100)
  - `sortBy` (`created_at|last_seen_at`, default `last_seen_at`)
  - `sortOrder` (`asc|desc`, default `desc`)
- Response payload:
  - `generatedAt`, `page`, `pageSize`, `total`
  - `rows[]`: `id`, `createdAt`, `lastSeenAt`, `eventCount`, `generationCount`, `successfulGenerationCount`

### 5) GET `/api/admin/reports`
- Permission: `admin:read`
- Query:
  - `startDate?`, `endDate?`
  - `includeTrends` (`true|false`, default `true`)
- Response payload:
  - `generatedAt`
  - `overview` (same structure as overview endpoint)
  - `generations.daily[]`: `date`, `total`, `successful`, `failed`
  - `generations.errors[]`: `errorType`, `count`
  - `users.dailySessions[]`: `date`, `sessions`

### 6) POST `/api/admin/reports/export`
- Permission: `admin:export`
- Body size cap: 2KB
- Request body:
```json
{
  "reportType": "overview|generations|users|sessions|full",
  "format": "json|csv",
  "filters": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "success": "true|false",
    "errorType": "optional"
  },
  "page": 1,
  "pageSize": 100
}
```
- Successful response:
  - binary/text body
  - `Content-Disposition: attachment; filename="<generated>"`
  - `Content-Type: application/json` or `text/csv`

## Filtering, Pagination, and Validation Rules
- Date format is strict `YYYY-MM-DD`.
- `startDate <= endDate`.
- `page >= 1`.
- read endpoints `pageSize <= 100`.
- export `pageSize <= 500`.
- invalid inputs return `400` with field hints where available.

## Security and Error Handling
- All admin responses use `Cache-Control: no-store`.
- Auth is mandatory on every endpoint.
- Permission mismatch returns `403`.
- repeated auth failures may return `429`.
- DB absence returns `503` without leaking internals.

