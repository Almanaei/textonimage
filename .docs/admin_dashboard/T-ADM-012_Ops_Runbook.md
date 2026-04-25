# T-ADM-012 — Admin Dashboard Operations Runbook

## Document Control
- Task ID: `T-ADM-012`
- Owner: DevOps / On-call Operator
- Date: 2026-04-25
- Milestone: `M8`
- Related: [`T-ADM-011_Security_Review.md`](T-ADM-011_Security_Review.md), [`T-ADM-002_Access_Model.md`](T-ADM-002_Access_Model.md)

---

## 1. Rate-Limit Architecture

The app uses **two independent in-memory rate limiters**. Both reset on process restart and are per-instance (see §6 for multi-instance notes).

### 1.1 Admin Login Rate Limit (`POST /api/admin/auth/login`)

| Parameter | Env Var | Default | Location |
|---|---|---|---|
| Window duration | `RATE_LIMIT_WINDOW_MS` | `60 000` ms (1 min) | `app/lib/rate-limit.ts` |
| Max attempts per window | `RATE_LIMIT_MAX` | `10` | `app/lib/rate-limit.ts` |

The login endpoint shares the **public generate-endpoint** rate limiter, keyed by caller IP.

**When the limit is hit:** the API returns `429 Too many requests. Please try again later.` The window resets automatically after `RATE_LIMIT_WINDOW_MS` without any process restart.

### 1.2 Admin API Bearer-Token Failed-Auth Throttle

A second, separate limiter guards all other admin APIs (`/api/admin/stats/*`, `/api/admin/reports/*`, `/api/admin/reports/export`). It counts **failed authentication attempts** (wrong/missing token or cookie) from the same IP.

| Parameter | Env Var | Default | Location |
|---|---|---|---|
| Window duration | `ADMIN_AUTH_WINDOW_MS` | `60 000` ms (1 min) | `app/lib/admin/auth.ts` |
| Max failed attempts per window | `ADMIN_AUTH_MAX_ATTEMPTS` | `30` | `app/lib/admin/auth.ts` |

**When the limit is hit:** the API returns `429 Too many failed authentication attempts. Try again later.`

> **Note:** Successful authentications reset this counter for the IP.

---

## 2. Shared-NAT / VPN Warning

Both limiters key on the **client IP** as presented to Next.js (`x-forwarded-for` → `x-real-ip` → `unknown`).

**Problem:** If multiple operators share a single egress IP (office NAT, VPN exit node, or a reverse proxy that does not forward the real client IP), failed login attempts from *any* user on that IP count toward the shared limit. 10 rapid failed logins from different browsers behind NAT can lock everyone out for up to 60 seconds.

**Mitigations (in order of effort):**

| Option | How |
|---|---|
| Raise `RATE_LIMIT_MAX` for internal use | Set `RATE_LIMIT_MAX=50` and `RATE_LIMIT_WINDOW_MS=300000` in production env — still blocks bots but gives human operators more slack. |
| Ensure real IPs are forwarded | Configure your load balancer / reverse proxy to set `X-Forwarded-For` with the real client IP, not the proxy IP. |
| Separate admin login limiter | Extract a dedicated limiter (independent of the public generate-endpoint limiter) in `app/app/api/admin/auth/login/route.ts` with a looser policy. |
| Redis-backed limiter (phase 3) | Replace the in-memory `Map` in `app/lib/rate-limit.ts` with a Upstash/Redis sliding window for accurate per-IP limiting across multiple Node instances. |

---

## 3. How to Unlock a Locked-Out Operator (Self-Service)

Because the window resets automatically, the **fastest recovery is to wait** for the window to expire:

```
Rate limit window = RATE_LIMIT_WINDOW_MS / 1000 seconds (default: 60 s)
```

If the window has been configured longer (e.g., `RATE_LIMIT_WINDOW_MS=300000`), the operator can ask an on-call engineer to restart the process, which clears the in-memory store.

---

## 4. How to Restart / Reset the Rate Limit Store

The rate-limit store lives in process memory. A process restart clears it entirely.

### Docker Compose (standard deployment)
```bash
docker compose restart app
```

### Vercel / serverless (cold start = reset)
Deploying a new revision automatically creates new function instances with empty stores.

---

## 5. Adding / Rotating Admin Credentials

### Add a new operator
```bash
# In the app/ directory:
npx tsx scripts/create-admin-password.ts <username> <password> <role>
# Roles: viewer | analyst | operator | admin

# Copy the output line and append to ADMIN_CREDENTIALS in your .env / secrets manager:
# ADMIN_CREDENTIALS=<existing>,<new-line>
```

### Rotate an existing user's password
1. Generate a new hash with the script above.
2. Replace the old `username:scrypt:...:role` entry in `ADMIN_CREDENTIALS`.
3. Restart the app (session cookies already issued with the old password remain valid until the browser session ends — see §5.1 for forced invalidation).

### 5.1 Force-invalidate all active admin sessions
Admin sessions are HMAC-signed with `ADMIN_SESSION_SECRET`. Rotating the secret invalidates **all** currently active sessions immediately:

```bash
# Generate a new secret (must be ≥ 32 chars):
openssl rand -hex 32

# Update ADMIN_SESSION_SECRET in .env / secrets manager, then restart the app.
```

---

## 6. Multi-Instance Deployment Limitation

Both rate limiters are in-process `Map` stores. In a multi-instance setup (multiple Docker replicas, Kubernetes pods, or Vercel edge regions) each instance maintains its own counter. An attacker can distribute attempts across instances and never hit the limit.

**Current acceptance decision (SEC-ADM-003):** Accepted for single-instance MVP. Track as tech debt before horizontal scaling.

**Action required before scaling:**
- Replace `checkRateLimit` in `app/lib/rate-limit.ts` with an Upstash Redis or `ioredis` sliding-window implementation.
- Replace `failedAuthStore` in `app/lib/admin/auth.ts` with the same shared backend.

---

## 7. Env Var Reference — Rate Limiters

| Env Var | Default | Affects | Notes |
|---|---|---|---|
| `RATE_LIMIT_MAX` | `10` | `POST /api/admin/auth/login` and `POST /api/generate` | Shared limiter — raising it also relaxes the public generate endpoint |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Same as above | Window in milliseconds |
| `ADMIN_AUTH_MAX_ATTEMPTS` | `30` | All other `/api/admin/*` endpoints (failed-auth only) | Higher default because legitimate scripts may retry on transient failures |
| `ADMIN_AUTH_WINDOW_MS` | `60000` | Same as above | Window in milliseconds |

All four are read once at module load time. **A process restart is required to pick up changes.**

---

## 8. Incident Response Checklist

### Scenario: Operator cannot log in (possible lockout)

1. Ask the operator how many failed attempts they made and from which IP.
2. Check server logs for `event: "admin_login_rate_limited"` entries.
3. If confirmed rate-limited:
   - **Wait** for `RATE_LIMIT_WINDOW_MS` to expire (default 60 s), **or**
   - Restart the process (`docker compose restart app`).
4. If still failing after the window: verify `ADMIN_CREDENTIALS` contains a valid hash for the username (use `npm run admin:create-password` to regenerate if in doubt).
5. If the operator forgot their password, regenerate it (see §5).

### Scenario: Suspicious login activity detected

1. Immediately rotate `ADMIN_SESSION_SECRET` (see §5.1) to invalidate all active sessions.
2. Review `ADMIN_CREDENTIALS` and remove or rotate any compromised user entry.
3. Consider temporarily lowering `RATE_LIMIT_MAX` to `3` and `RATE_LIMIT_WINDOW_MS` to `300000` (5 min) to slow down further probing.
4. File a security incident report referencing `T-ADM-011`.

### Scenario: "Analytics not available" on dashboard

The admin API returns `503` when `DATABASE_URL` is missing or the pool cannot connect.

1. Check `DATABASE_URL` is set in the runtime environment.
2. Check DB reachability: `docker compose ps db` (or equivalent).
3. Restart the database and then the app.

---

## 9. Key Source Files

| File | Purpose |
|---|---|
| `app/lib/rate-limit.ts` | Shared login / generate-endpoint limiter |
| `app/lib/admin/auth.ts` | Admin API failed-auth throttle + token authorization |
| `app/lib/admin/admin-session.ts` | HMAC-signed session cookie sign/verify |
| `app/lib/admin/credentials.ts` | scrypt credential verification |
| `app/app/api/admin/auth/login/route.ts` | Login endpoint |
| `app/app/api/admin/auth/logout/route.ts` | Logout endpoint |
| `app/scripts/create-admin-password.ts` | CLI to generate credential hash entries |
| `app/.env.example` | All documented env vars with defaults |
