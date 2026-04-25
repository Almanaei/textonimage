---
name: admin-dashboard-skill
description: Enforce secure admin dashboard implementation standards. Use when Codex builds or modifies admin dashboard features and must guarantee separation from public frontend, admin-only authentication, filtering/reporting capabilities, and export with observability.
---

# Admin Dashboard Skill

## Objective

Force Codex to implement admin dashboard work under strict operational rules:

1. Separation from public frontend
2. Admin-only auth and authorization
3. Filtering and reporting support
4. Export and observability readiness

## Mandatory Rules

- Keep admin dashboard architecture isolated from public user flows.
- Do not mix admin UI/routes/components with public frontend pages.
- Enforce admin-only access on all admin APIs and admin pages.
- Implement filtering/reporting as first-class functionality, not optional UI extras.
- Implement export flows with logging and monitoring hooks.

## Rule 1: Separation from Public Frontend

- Place admin features in dedicated admin routes/modules.
- Reuse backend services safely, but keep admin presentation layer separate.
- Do not introduce dependencies from public pages to admin modules.
- Treat any change touching public frontend as out-of-scope unless explicitly approved.

## Rule 2: Admin-Only Auth

- Require authentication and role/permission checks for every admin endpoint.
- Fail closed on missing/invalid session or token.
- Return consistent unauthorized/forbidden responses.
- Prevent accidental exposure of admin data to public APIs.

## Rule 3: Filtering and Reporting

- Support date range filtering for metrics and reports.
- Define clear request/response contracts for filters, pagination, and sorting.
- Ensure report outputs are consistent with analytics/source-of-truth data.
- Handle empty state, large result sets, and invalid filter combinations safely.

## Rule 4: Export and Observability

- Provide explicit export actions/endpoints (for example CSV/JSON/report export).
- Add structured logs for admin/report/export failures and key events.
- Never log PII or secrets in observability events.
- Track operational signals: export failures, report latency, and endpoint error rates.

## Implementation Checklist

Before coding:

- Verify boundary between admin and public frontend.
- Identify auth middleware/guards to reuse.
- Identify existing stats/reporting modules to reuse.

During coding:

- Keep changes incremental and scoped to admin modules.
- Preserve response envelope consistency for admin APIs.
- Add/extend tests for auth, filters, reports, and export flows.

After coding:

- Validate admin-only access paths.
- Validate filtering/reporting correctness.
- Validate export behavior and observability logs.
- Confirm no public frontend regression.

## Output Contract

Use this structure in implementation updates:

```markdown
## Admin Boundary Check
- Separation status:
- Public frontend impact:

## Auth and Access
- Admin-only enforcement:
- Role/permission checks:

## Filtering and Reporting
- Implemented filters:
- Reporting endpoints/modules:
- Data consistency notes:

## Export and Observability
- Export features:
- Logging/monitoring added:
- PII safety confirmation:

## Validation
- Tests/checks run:
- Remaining risks:
```

## Quality Bar

- Admin dashboard is isolated from public frontend.
- No admin endpoint is reachable without admin authorization.
- Filtering/reporting is complete and testable.
- Export is operational and observable.
- Logs are useful for diagnosis and free of PII.
