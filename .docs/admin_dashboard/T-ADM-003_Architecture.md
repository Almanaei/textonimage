# T-ADM-003 — Admin Dashboard Architecture

## Document Control
- Task ID: `T-ADM-003`
- Owner: System Architect Agent
- Date: 2026-04-23
- Milestone: `M8`

## Architecture Goal
Provide a separate operational interface for admins, reusing existing analytics storage and backend utilities, with strict isolation from public frontend user flows.

## Boundary and Isolation
- Public frontend:
  - `/` and public components remain unchanged.
- Admin frontend:
  - isolated under `/admin`.
  - dedicated admin client data layer (`app/app/admin/_lib/*`).
- Admin backend:
  - isolated API namespace `/api/admin/*`.
  - reusable internal modules under `app/lib/admin/*`.

## Module Boundaries
1. Admin UI Layer (`app/app/admin/*`)
   - token-gated dashboard shell
   - filter/pagination/export controls
   - visualization tables/cards
2. Admin API Layer (`app/app/api/admin/*`)
   - stats endpoints
   - reports endpoint
   - export endpoint
3. Admin Domain Layer (`app/lib/admin/*`)
   - auth + role checks
   - schema validation
   - aggregation/report builders
   - observability logging
4. Shared Data Layer (`app/lib/db.ts`, analytics tables)
   - read-only analytics queries from existing data sources.

## Data Flow
1. Admin user opens `/admin`.
2. UI sends authenticated requests with bearer token to `/api/admin/*`.
3. API enforces permission via `requireAdminAccess`.
4. API validates query/body using admin Zod schemas.
5. Aggregation/report services query `sessions`, `events`, `generation_logs`.
6. API returns normalized envelope or export artifact (CSV/JSON).
7. Structured logs capture auth denials, failures, latency, and export events.

## API Reuse vs New Components
- Reused:
  - database pool singleton (`getPool`)
  - general request handling conventions
  - existing analytics schema tables
- New admin-specific:
  - RBAC wrapper and throttling
  - admin filter schemas
  - admin aggregation/report composition
  - admin-only route handlers

## Extensibility Readiness
- RBAC:
  - role-permission map centralized in `lib/admin/auth.ts`.
- Audit logs:
  - structured log format in `lib/admin/observability.ts` ready for sink integration.
- Future auth provider migration:
  - bearer parsing and authorization isolated in one module.

## Non-Functional Controls
- No-store caching for admin endpoints.
- Fail-closed auth model.
- Body-size limits for export endpoint.
- Bounded pagination and page-size limits in schemas.

## Acceptance Criteria Mapping
- Admin dashboard isolated from public frontend: yes.
- Reuses existing backend APIs/services where possible: yes (`db`, analytics schema, shared conventions).
- Supports future RBAC/audit-log extensions: yes (centralized role map + structured observability).

