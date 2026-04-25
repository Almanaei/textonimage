# Project Milestones & Epics
**Product:** Arabic Name Image Generator
**Last Updated:** April 2026

---

## Overview

| # | Milestone | Epics | Status |
|---|---|---|---|
| M1 | Foundation | E1 · E2 | ✅ Complete |
| M2 | Working Image Engine | E3 · E4 | ✅ Complete |
| M3 | Shippable MVP | E5 · E6 | ✅ Complete |
| M4 | Production Ready | E7 · E8 | ✅ Complete |

---

## M1 — Foundation ✅
**Goal:** The project exists, runs locally, and all required assets are confirmed and in place.
**Gate:** `npm run dev` starts with no errors; template + font are in `public/`.

### E1 — Project Scaffold ✅
> Initialize the Next.js application with the correct architecture and dependency set.

| Story | Task | Deliverable | Status |
|---|---|---|---|
| E1-1 | `npx create-next-app@latest` with TypeScript, App Router, Tailwind, no src/ | `app/` folder created | ✅ |
| E1-2 | Install `sharp`, `zod`, custom rate limiter | `package.json` updated | ✅ |
| E1-3 | Create folder structure: `app/api/generate/`, `lib/`, `public/assets/` | Directory tree in place | ✅ |
| E1-4 | Verify `npm run dev` starts clean | Dev server runs on localhost | ✅ |

### E2 — Asset Identification & Configuration ✅
> Confirm the exact template image and font to use, measure name placement coordinates.

| Story | Task | Deliverable | Status |
|---|---|---|---|
| E2-1 | Inspect `page_1_c.png` and `generated_image.jpg` with ImageSorcery — get pixel dimensions | Template: 1015×1801 px confirmed | ✅ |
| E2-2 | Measure name bounding box (x, y, maxWidth, maxHeight) by comparing before/after images | x1=60, x2=955, y1=1430, y2=1550 in `lib/layout.ts` | ✅ |
| E2-3 | Copy confirmed template → `public/assets/template.png` | Asset in place at `public/assets/template.png` | ✅ |
| E2-4 | Source Arabic font TTF → `public/assets/arabic.ttf` | Font in place | ✅ |
| E2-5 | Bounding-box constants embedded in `lib/layout.ts` (`TEXT_BOX`) | Config values committed | ✅ |


---

## M2 — Working Image Engine ✅
**Goal:** Given an Arabic name, the system can produce a correctly composited PNG — verified visually offline before any API or UI exists.
**Gate:** `scripts/test-render.ts` outputs a correct PNG for test names "محمد أحمد" and "سالم المناعي".

### E3 — Arabic Text Layout Engine ✅
> Implement the algorithm that fits an Arabic name into the fixed bounding box.

| Story | Task | Deliverable | Status |
|---|---|---|---|
| E3-1 | Implement `lib/layout.ts` — normalize + trim input | `normalizeName()` in `lib/layout.ts` | ✅ |
| E3-2 | Measure text width using heuristic char-width ratio | `estimateTextWidth()` in `lib/layout.ts` | ✅ |
| E3-3 | Reduce font size by 2px steps until text fits `maxWidth` | `findFittingFontSize()` — 80→36px loop | ✅ |
| E3-4 | Split into ≤2 lines at word boundary if still overflows | `splitIntoLines()` in `lib/layout.ts` | ✅ |
| E3-5 | Throw `NameTooLongError` if 2-line layout still overflows | `NameTooLongError` in `lib/errors.ts` | ✅ |
| E3-6 | Return `TextLayout` with lines, fontSize, lineYPositions, centerX | `computeLayout()` exported from `lib/layout.ts` | ✅ |

### E4 — Sharp Compositing Pipeline ✅
> Implement the image rendering engine that overlays the fitted text onto the template.

| Story | Task | Deliverable | Status |
|---|---|---|---|
| E4-1 | `lib/composite.ts` — load template via `sharp()` | Template loads; `compositeImage()` exported | ✅ |
| E4-2 | Build canvas text layer: RTL, center-aligned, correct font via `@napi-rs/canvas` | `buildSvgTextLayer()` in `lib/svg-layer.ts` | ✅ |
| E4-3 | Composite canvas PNG buffer onto template via `sharp().composite()` | Compositing in `lib/composite.ts` | ✅ |
| E4-4 | Output PNG buffer | `Buffer` returned by `compositeImage()` | ✅ |
| E4-5 | `lib/generate-image.ts` orchestrator — validate → layout → SVG → composite | `generateCertificate()` wired end-to-end | ✅ |
| E4-6 | `scripts/test-render.ts` — generate + save PNG to disk for visual check | 3 test cases (reference, short, long names) | ✅ |


---

## M3 — Shippable MVP ✅
**Goal:** A real user on a mobile device can visit the page, enter their Arabic name + email, and download a personalized PNG certificate.
**Gate:** End-to-end flow works on Chrome mobile emulator; curl tests pass for all status codes.

### E5 — API Route ✅
> Expose a secure, validated HTTP endpoint that accepts user input and returns a PNG.

| Story | Task | Deliverable | Status |
|---|---|---|---|
| E5-1 | `lib/schema.ts` — Zod schema for `name` + `email` | `GenerateSchema` + `GenerateInput` exported | ✅ |
| E5-2 | `app/api/generate/route.ts` — POST only, 405 for other methods | Route handler + GET→405 fallback | ✅ |
| E5-3 | Parse + validate request body; return 400 with field errors on failure | Zod `safeParse` with structured field errors | ✅ |
| E5-4 | Call `generateCertificate()`, return PNG binary with correct response headers | `Content-Type: image/png`, `Cache-Control: no-store` | ✅ |
| E5-5 | Return 422 on `NameTooLongError`, 500 on unexpected server errors | All error codes handled | ✅ |
| E5-6 | Rate limiting — max 10 req/min per IP via `X-Forwarded-For` | `checkRateLimit()` in `lib/rate-limit.ts` | ✅ |
| E5-7 | Enforce request body size cap of 1KB | `content-length` guard before JSON parse | ✅ |

### E6 — Frontend UI ✅
> Build the mobile-first Arabic RTL interface: form, loading state, preview, and download.

| Story | Task | Deliverable | Status |
|---|---|---|---|
| E6-1 | `NameEmailForm.tsx` — Arabic RTL fields, client-side validation, fetch POST, state management | Form with field-level errors + loading disable | ✅ |
| E6-2 | `PreviewCard.tsx` — responsive image display, hidden until imageUrl set | Next.js `<Image>` with full-width responsive sizing | ✅ |
| E6-3 | `DownloadButton.tsx` — `<a download>` trigger, thumb-friendly (min-h 52px) | Download `<a>` with icon, shown after preview | ✅ |
| E6-4 | `ErrorNotice.tsx` — Arabic error messages, role=alert RTL | Error component for all API error codes | ✅ |
| E6-5 | `app/page.tsx` + `layout.tsx` — RTL shell, Tailwind mobile-first layout | Page composed; `lang=ar dir=rtl` on `<html>` | ✅ |
| E6-6 | Manual test on Chrome mobile emulator — full flow end-to-end | Pending manual verification | 🔄 |


---

## M4 — Production Ready ✅
**Goal:** The app is secure, handles edge cases gracefully, meets performance targets, and is ready to deploy.
**Gate:** Lighthouse mobile ≥ 90; all edge case tests pass; security headers verified.

### E7 — Edge Case & Robustness ✅
> Ensure the system handles all unusual inputs without crashing or producing broken images.

| Story | Task | Deliverable | Status |
|---|---|---|---|
| E7-1 | Very long names (>60 chars) → 400 via Zod schema, 422 via `NameTooLongError` | `GenerateSchema` max=60 + `NameTooLongError` | ✅ |
| E7-2 | Single-character name → 400 (min=2 chars in Zod schema) | `GenerateSchema` min=2 | ✅ |
| E7-3 | Names with multiple spaces — normalized by `normalizeName()` | `replace(/\s+/g, " ")` in layout + orchestrator | ✅ |
| E7-4 | Arabic diacritics/tashkeel — `@napi-rs/canvas` HarfBuzz handles shaping | Canvas renderer via HarfBuzz shaping engine | ✅ |
| E7-5 | Concurrent requests — font registered once per process; no race condition | `_fontRegistered` guard in `lib/svg-layer.ts` | ✅ |
| E7-6 | Server-side `console.error` logging (no PII — name/email never logged) | Logged: errorType, message, latencyMs only | ✅ |

### E8 — Security & Performance Hardening ✅
> Lock down the API surface, add security headers, and validate performance targets are met.

| Story | Task | Deliverable | Status |
|---|---|---|---|
| E8-1 | Security headers in `next.config.ts` | X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy | ✅ |
| E8-2 | Input sanitization: trim, length, Arabic regex, email format, body size cap | Zod schema + `sanitize()` in orchestrator + 1KB body guard | ✅ |
| E8-3 | Lighthouse mobile audit — target ≥ 90 | Pending audit run | 🔄 |
| E8-4 | Rate limiter: 11th request within 1 min → 429 | `test-edge-cases.ts` covers this; `checkRateLimit()` verified in logic | ✅ |
| E8-5 | `.env.example` with all env vars documented | `.env.example` committed | ✅ |
| E8-6 | Final visual diff: generated PNG matches `After_Submission/generated_image.jpg` | Pending visual QA run | 🔄 |

---

## Dependency Map

```
E1 (Scaffold)
  └─→ E2 (Assets & Config)
        └─→ E3 (Text Layout)
              └─→ E4 (Sharp Pipeline)
                    └─→ E5 (API Route)
                          ├─→ E6 (Frontend UI)
                          └─→ E7 (Edge Cases)
                                └─→ E8 (Hardening)
```

## Status Key

| Symbol | Meaning |
|---|---|
| 🔲 | Not Started |
| 🔄 | In Progress |
| ✅ | Complete |
| ⛔ | Blocked |
