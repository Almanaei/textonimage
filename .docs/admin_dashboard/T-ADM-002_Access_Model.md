# T-ADM-002 — Admin Access Model

## Document Control
- Task ID: `T-ADM-002`
- Owner: Security Agent
- Date: 2026-04-23
- Milestone: `M8`

## Authentication Model
- Mechanism: Bearer token on every admin API request.
- Token source: environment variable `ADMIN_API_KEYS`.
- Configuration format:
  - `ADMIN_API_KEYS=viewer:<token>,analyst:<token>,operator:<token>,admin:<token>`
- Matching:
  - constant-time token comparison (`HMAC + timingSafeEqual`).
- Production guard:
  - each configured admin token must be at least 32 chars in production.

## Authorization Model
- Permission set:
  - `admin:read`
  - `admin:export`
- Role matrix:

| Role | Permissions |
|---|---|
| viewer | `admin:read` |
| analyst | `admin:read` |
| operator | `admin:read`, `admin:export` |
| admin | `admin:read`, `admin:export` |

## Endpoint Authorization Matrix
| Endpoint | Method | Permission |
|---|---|---|
| `/api/admin/stats/overview` | `GET` | `admin:read` |
| `/api/admin/stats/generations` | `GET` | `admin:read` |
| `/api/admin/stats/users` | `GET` | `admin:read` |
| `/api/admin/stats/sessions` | `GET` | `admin:read` |
| `/api/admin/reports` | `GET` | `admin:read` |
| `/api/admin/reports/export` | `POST` | `admin:export` |

## Session and Security Policy
- API auth is stateless bearer-token based for admin routes.
- Unauthorized and forbidden responses:
  - `401` Unauthorized
  - `403` Forbidden
  - `429` Too many failed auth attempts
- Cache policy:
  - all admin auth/error responses and admin data responses use `Cache-Control: no-store`.
- Failed authentication throttling:
  - in-memory sliding window rate limit for failed admin auth attempts.
  - env controls:
    - `ADMIN_AUTH_MAX_ATTEMPTS` (default 30)
    - `ADMIN_AUTH_WINDOW_MS` (default 60000)

## Unauthorized Access Paths Identified
1. Missing token to admin API.
2. Invalid bearer token.
3. Valid token but insufficient permission (read-only role trying export).
4. Credential stuffing/brute force through repeated invalid tokens.

## Controls Applied Per Unauthorized Path
1. Missing/invalid token -> `401` + structured warning log.
2. Insufficient permission -> `403` + structured warning log.
3. Excessive failed auth attempts -> `429` + structured warning log.
4. All responses fail closed; no partial data leakage in error envelopes.

## Logging and PII Safety
- Admin auth logs record route, permission, and status class.
- No raw token values, names, or emails are logged.

## Acceptance Criteria Mapping
- Admin login model defined: yes (bearer-token model).
- Roles/permissions documented: yes (role + endpoint matrices).
- Unauthorized paths identified: yes (see Unauthorized Access Paths).
- Session security requirements explicit: yes (cache policy, fail-closed responses, throttling).

