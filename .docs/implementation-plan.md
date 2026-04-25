# Implementation Plan: Arabic Name Image Generator

## TL;DR
Build a Next.js 14 App Router web app that accepts an Arabic name + email, composites the name onto a static certificate template using Sharp + SVG, and returns a downloadable high-res PNG. Mobile-first, RTL, no DB in MVP.

---

## Phase 1 — Project Scaffold & Asset Setup
*Foundation. All other phases depend on this.*

1. Run `npx create-next-app@latest` inside workspace root with TypeScript, App Router, Tailwind CSS, no src/ dir → output: `web/`
2. Install: `sharp`, `zod` (validation), custom rate limiter
3. Create folder structure:
   - `app/`, `app/api/generate/`, `app/components/`
   - `lib/image/`, `lib/validation/`
   - `public/assets/templates/`, `public/assets/fonts/`
4. **Inspect template images** using ImageSorcery MCP:
   - Get exact pixel dimensions of `page_1_c.png` and `generated_image.jpg`
   - Measure name bounding box coordinates by comparing before/after images
   - Identify which template file to use as `main-template.png`
5. Copy chosen template → `public/assets/templates/main-template.png`
6. Source Arabic font (Noto Naskh Arabic TTF or confirm from taayoush.com) → `public/assets/fonts/arabic-font.ttf`
7. Create `lib/image/template-config.ts` with hardcoded nameArea x/y/maxWidth/maxHeight derived from step 4 measurements

**Verification:** `npm run dev` starts without errors; template + font files exist in `public/`


---

## Phase 2 — Image Generation Engine
*Depends on Phase 1. Core business logic.*

8. **`lib/image/text-layout.ts`** — Arabic text fitting algorithm:
   - Input: `{ text, fontPath, baseSize, minSize, maxWidth, maxLines }`
   - Normalize/trim whitespace
   - Measure text width at baseSize using Sharp SVG test render
   - Reduce size by 2px steps until fits maxWidth
   - If still overflows at minSize → split into ≤2 lines (split at word boundary)
   - If 2 lines still overflow → throw `NameTooLongError`
   - Output: `{ lines: string[], fontSize: number }`

9. **`lib/image/render-with-sharp.ts`** — Sharp compositing pipeline:
   - Load template via `sharp(templatePath)`
   - Build SVG string with: RTL direction, center-align, chosen font-family, computed fontSize, line(s) of text, correct x/y position
   - Call `sharp().composite([{ input: Buffer.from(svgString), top: 0, left: 0 }])`
   - Output `png()` buffer

10. **`lib/image/generate-image.ts`** — orchestrator:
    - Import `templateConfig`, `textLayout`, `renderWithSharp`
    - Run layout → run render → return PNG buffer
    - Catch `NameTooLongError` → rethrow as business error

**Verification:** Write a local test script `scripts/test-render.ts` that generates an image with a known Arabic name and saves to disk for visual inspection.


---

## Phase 3 — API Route
*Depends on Phase 2.*

11. **`lib/validation/submission.ts`** — Zod schema:
    - `name`: string, trim, non-empty, max 60 chars
    - `email`: string, trim, valid email format
    - Export `SubmissionSchema` and `SubmissionInput` type

12. **`app/api/generate/route.ts`** — Route Handler:
    - Accept `POST` only (405 for others)
    - Parse JSON body, run Zod validation → 400 with field errors on failure
    - Call `generateImage(name)` → 422 on `NameTooLongError`, 500 on unexpected errors
    - On success: return PNG binary response with headers:
      - `Content-Type: image/png`
      - `Content-Disposition: attachment; filename="certificate.png"`
      - `Cache-Control: no-store`
    - Rate limiting: max 10 req/min per IP using `X-Forwarded-For`
    - Request body size limit: 1KB max

**Verification:** `curl -X POST /api/generate -d '{"name":"محمد","email":"test@test.com"}'` returns PNG bytes; invalid inputs return correct status codes.

---

## Phase 4 — Frontend UI
*Depends on Phase 3. Can be built in parallel once API contract is stable.*

13. **`app/components/NameEmailForm.tsx`** (Client Component):
    - Two fields: Arabic name (`dir="rtl"`, `lang="ar"`) + email
    - Client-side validation mirrors Zod rules (empty check, email regex, max length)
    - Submit → `fetch POST /api/generate` → handle loading/error/success states
    - On success: store PNG blob URL in state


14. **`app/components/PreviewCard.tsx`** (Client Component):
    - Receives `imageUrl: string | null`
    - Renders `<img>` with responsive scaling (`max-w-full h-auto`)
    - Hidden until imageUrl is set

15. **`app/components/DownloadButton.tsx`** (Client Component):
    - Receives `imageUrl: string | null`
    - Programmatic download via `<a download="certificate.png" href={imageUrl}>`
    - Thumb-friendly size (min 48px height), visible only after preview loads

16. **`app/components/ErrorNotice.tsx`** — Arabic error messages:
    - Maps API error codes to Arabic strings (empty name, invalid email, name too long, server error)

17. **`app/page.tsx`** — Server Component shell:
    - Renders Arabic RTL page (`dir="rtl"`, `lang="ar"`)
    - Composes: `<NameEmailForm>` + `<PreviewCard>` + `<DownloadButton>` + `<ErrorNotice>`
    - Mobile-first layout via Tailwind (single column, full-width form, centered)

**Verification:** Chrome mobile emulator — fill form → loading spinner → image preview → tap download → PNG saves to device.

---

## Phase 5 — Hardening & Polish
*Depends on Phase 4. Can be done incrementally.*

18. Add `headers()` in `next.config.js`: `X-Content-Type-Options`, `X-Frame-Options`
19. Lighthouse mobile audit: target ≥ 90 performance + usability score
20. Test edge cases: very long name, single character, multiple spaces, Arabic diacritics (tashkeel)
21. Add `console.error` server-side logging for generation failures (no PII in logs)
22. Add `.env.example` with documented env vars

---

## Relevant Files

| File | Role |
|---|---|
| `References/images/before_Submission/page_1_c.png` | Blank template source |
| `References/images/After_Submission/generated_image.jpg` | Visual target for name placement |
| `docs/PRD.md` | Acceptance criteria, text rendering rules, resolution targets |
| `docs/blueprint.md` | Architecture decisions, templateConfig schema (section 13) |
| **New:** `web/lib/image/template-config.ts` | Coordinates derived from image inspection |
| **New:** `web/lib/image/text-layout.ts` | Arabic fitting algorithm |
| **New:** `web/lib/image/render-with-sharp.ts` | Sharp compositing pipeline |
| **New:** `web/app/api/generate/route.ts` | API endpoint |
| **New:** `web/app/page.tsx` + `web/app/components/` | Frontend |


---

## Verification Checklist

1. `scripts/test-render.ts` — generates local PNG for "محمد أحمد" and "سالم المناعي", visually correct
2. `curl` tests: valid request → PNG, empty name → 400, invalid email → 400, name too long → 422
3. Rate limiter: 11th request in 1 min returns 429
4. Chrome DevTools mobile emulator: form renders RTL, preview scales correctly, download works
5. Lighthouse mobile audit ≥ 90
6. Visual diff: generated output matches `After_Submission/generated_image.jpg` name placement

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Database | None in MVP | Stateless generate-and-return is sufficient |
| Response format | Direct PNG binary stream | No temp file management needed |
| Image renderer | Sharp (primary) | No native deps, simpler deployment vs node-canvas |
| Validation library | Zod | Consistent schema across API + client |
| Project root | `web/` inside workspace | Keeps Next.js app alongside existing docs/agents/ |
| Template file | `page_1_c.png` (to confirm) | To be verified via ImageSorcery inspection |
| Arabic font | Noto Naskh Arabic (to confirm) | May be overridden after inspecting taayoush.com font |
