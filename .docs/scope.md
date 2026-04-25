# Backend Scope Document (T-PM-001)

## Project

Arabic Name Image Generator ("شهادة الولاء") — Backend scope definition.

## In Scope

### API Endpoints
- `POST /api/generate` — Certificate image generation with input validation, rate limiting, and PNG binary response
- `POST /api/track` — Client-side analytics event recording via HttpOnly session cookie
- `GET /api/stats` — Aggregated KPIs protected by bearer token authentication

### Image Generation Engine
- Text layout engine (`lib/layout.ts`) — Arabic text measurement, dynamic font sizing (80px → 36px), max 2-line splits
- Canvas text rendering (`lib/canvas-layer.ts`) — @napi-rs/canvas with HarfBuzz for Arabic shaping at 2400px output resolution
- Image compositing (`lib/composite.ts`) — Sharp composites text layer onto certificate template with template caching
- Orchestrator (`lib/generate-image.ts`) — Sanitize, prefix "مع تحيّات", compute layout, render, composite

### Analytics Pipeline
- Session management via HttpOnly cookie in middleware
- Event recording (page_view, generation_requested/success/error, download_clicked, rate_limited)
- Generation logging with timing and error classification — no PII stored
- KPI aggregation: success rate, avg duration, 7-day trend, error breakdown

### Security
- Input validation with Zod schemas (Arabic name 2–60 chars, valid email)
- In-memory sliding-window rate limiter (10 req/60s per IP, configurable)
- Security headers: CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- Constant-time token comparison for /api/stats auth
- Body size enforcement (1KB cap on /api/generate)

### Infrastructure
- Docker deployment (Dockerfile + docker-compose.yml with PostgreSQL)
- Environment variable configuration (DATABASE_URL, STATS_SECRET, rate limit overrides)
- PostgreSQL migration script (idempotent, sessions + events + generation_logs tables)

## Out of Scope

- Frontend UI changes or new screens
- Additional certificate templates or template customization
- External file/object storage (S3, GCS, etc.)
- Multi-instance scaling (Redis-backed rate limiter, shared state)
- User authentication or account system
- Email delivery or notification service
- CDN or image optimization beyond server-side generation
- Webhook or third-party integrations
- Admin dashboard UI

## Technical Dependencies

| Dependency | Purpose |
|---|---|
| Next.js 16 (App Router) | API routes, middleware |
| Sharp | Image compositing and resizing |
| @napi-rs/canvas | Arabic text rendering with HarfBuzz |
| PostgreSQL (optional) | Analytics storage |
| Zod | Request/response validation |
| pg | PostgreSQL driver with connection pooling |

## Constraints

- Template and font are local files in `public/assets/` — no external storage
- PostgreSQL is optional — app runs without it (analytics silently disabled)
- Rate limiter is in-memory (single-process only)
- No PII (name, email) is logged or stored in analytics tables
- Image generation must respond in under 3 seconds
- Text always rendered at 2400px output width (2.364× scale factor)
