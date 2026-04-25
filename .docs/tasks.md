# Implementation Tasks
**Product:** Arabic Name Image Generator
**Last Updated:** April 2026
**Format:** Each task has an ID, epic, file(s) to create/edit, what to do, and done criteria.

---

## M1 — Foundation

---

### E1 — Project Scaffold

#### T-001 · Scaffold Next.js App
- **Epic:** E1
- **File(s):** `web/` (new)
- **Action:**
  ```bash
  cd c:\Users\Almannai\Desktop\textonimage
  npx create-next-app@latest web --typescript --app --tailwind --no-src-dir --import-alias "@/*"
  ```
- **Done when:** `web/` exists, `npm run dev` starts on `localhost:3000`, no TypeScript errors.

#### T-002 · Install Core Dependencies
- **Epic:** E1
- **File(s):** `web/package.json`
- **Action:**
  ```bash
  cd web
  npm install sharp zod
  npm install --save-dev @types/node tsx
  ```
- **Done when:** `sharp` and `zod` appear in `dependencies`; `tsx` in `devDependencies`.

#### T-003 · Create Project Folder Structure
- **Epic:** E1
- **File(s):** directories only
- **Action:** Create the following empty directories (with `.gitkeep` if needed):
  ```
  web/lib/image/
  web/lib/validation/
  web/public/assets/templates/
  web/public/assets/fonts/
  web/scripts/
  ```
- **Done when:** All directories exist in the repo.

#### T-004 · Clean Next.js Boilerplate
- **Epic:** E1
- **File(s):** `web/app/page.tsx`, `web/app/globals.css`
- **Action:** Strip default Next.js boilerplate from `page.tsx` to a blank shell. Keep Tailwind base styles in `globals.css`.
- **Done when:** `npm run dev` shows a blank white page with no errors.


---

### E2 — Asset Identification & Configuration

#### T-005 · Inspect Template Dimensions with ImageSorcery
- **Epic:** E2
- **File(s):** `References/images/before_Submission/page_1_c.png`
- **Action:** Use ImageSorcery `get_metainfo` tool on `page_1_c.png`, `page_2_c.png`, `page_3_c.png`, and `generated_image.jpg` to get exact width × height of each.
- **Done when:** We know the exact pixel dimensions of the blank template and the generated output.

#### T-006 · Measure Name Bounding Box Coordinates
- **Epic:** E2
- **File(s):** `References/images/before_Submission/page_1_c.png`, `References/images/After_Submission/generated_image.jpg`
- **Action:** Use ImageSorcery `detect` or `find` tool to identify where the user name appears in `generated_image.jpg`. Compare to the blank template to determine: `x`, `y`, `maxWidth`, `maxHeight` of the name zone.
- **Done when:** We have confirmed numeric values for the name bounding box.

#### T-007 · Copy Template to Public Assets
- **Epic:** E2
- **File(s):** `web/public/assets/templates/main-template.png`
- **Action:** Copy the confirmed blank template (`page_1_c.png` or whichever matches) into `web/public/assets/templates/main-template.png`.
- **Done when:** File exists at that path.

#### T-008 · Source and Place Arabic Font
- **Epic:** E2
- **File(s):** `web/public/assets/fonts/arabic-font.ttf`
- **Action:** Check taayoush.com network requests (via Playwright) to identify the font used. If not extractable, download Noto Naskh Arabic TTF from Google Fonts. Place at `web/public/assets/fonts/arabic-font.ttf`.
- **Done when:** A valid `.ttf` file is at that path and renders Arabic correctly.

#### T-009 · Create Template Config File
- **Epic:** E2
- **File(s):** `web/lib/image/template-config.ts` (new)
- **Action:** Create the config file with values from T-005 and T-006:
  ```ts
  export const templateConfig = {
    template: {
      path: "public/assets/templates/main-template.png",
      width: <from T-005>,
      height: <from T-005>,
    },
    nameArea: {
      x: <from T-006>,
      y: <from T-006>,
      maxWidth: <from T-006>,
      maxHeight: <from T-006>,
      align: "center" as const,
      direction: "rtl" as const,
      maxLines: 2,
    },
    font: {
      path: "public/assets/fonts/arabic-font.ttf",
      color: "#1F1F1F",
      baseSize: 72,
      minSize: 40,
      lineHeight: 1.25,
    },
  } as const;
  ```
- **Done when:** File compiles with no TypeScript errors; values match measurements.


---

## M2 — Working Image Engine

---

### E3 — Arabic Text Layout Engine

#### T-010 · Create NameTooLongError Class
- **Epic:** E3
- **File(s):** `web/lib/image/errors.ts` (new)
- **Action:**
  ```ts
  export class NameTooLongError extends Error {
    constructor() {
      super("Name exceeds maximum layout bounds");
      this.name = "NameTooLongError";
    }
  }
  ```
- **Done when:** Class is exported and importable from other modules.

#### T-011 · Implement Text Width Measurement
- **Epic:** E3
- **File(s):** `web/lib/image/text-layout.ts` (new)
- **Action:** Implement a function `measureTextWidth(text, fontPath, fontSize): Promise<number>` that:
  1. Builds a minimal SVG string with the given text and font size
  2. Renders it via `sharp` to a small buffer
  3. Returns the measured width in pixels using Sharp metadata
- **Done when:** Function returns a number; test with "محمد" at 72px returns a positive integer.

#### T-012 · Implement Font-Shrink Loop
- **Epic:** E3
- **File(s):** `web/lib/image/text-layout.ts`
- **Action:** Add `fitSingleLine(text, config): Promise<number | null>` that:
  1. Starts at `baseSize`
  2. Measures width; if `≤ maxWidth`, returns that fontSize
  3. Decrements by 2px and retries
  4. If reaches `minSize` and still overflows, returns `null`
- **Done when:** Returns correct font size for short names; returns `null` for names that don't fit.

#### T-013 · Implement Line-Break Logic
- **Epic:** E3
- **File(s):** `web/lib/image/text-layout.ts`
- **Action:** Add `splitIntoLines(text, config): Promise<{ lines: string[], fontSize: number }>` that:
  1. Calls `fitSingleLine` — if it fits, return single line
  2. If not, split text at word boundaries into 2 segments
  3. Try `fitSingleLine` on the longer segment
  4. If still doesn't fit → throw `NameTooLongError`
  5. Return `{ lines, fontSize }`
- **Done when:** Long two-word name splits correctly; single very long word throws `NameTooLongError`.

#### T-014 · Export Main Layout Function
- **Epic:** E3
- **File(s):** `web/lib/image/text-layout.ts`
- **Action:** Export `computeTextLayout(text: string, config: typeof templateConfig): Promise<{ lines: string[], fontSize: number }>` that:
  1. Trims and normalizes whitespace from input
  2. Delegates to `splitIntoLines`
- **Done when:** Single exported function callable by the orchestrator.


---

### E4 — Sharp Compositing Pipeline

#### T-015 · Implement SVG Text Layer Builder
- **Epic:** E4
- **File(s):** `web/lib/image/render-with-sharp.ts` (new)
- **Action:** Implement `buildSvgLayer(lines, fontSize, config): string` that returns an SVG string:
  - Same dimensions as the template (width × height)
  - Transparent background
  - Text element(s) with: `direction="rtl"`, `text-anchor="middle"`, `font-family` from config, `font-size`, `fill` color
  - Centered at `nameArea.x`, starting at `nameArea.y`
  - If 2 lines: second line offset by `fontSize * lineHeight`
- **Done when:** SVG string is valid XML; renders correctly when opened in browser.

#### T-016 · Implement Sharp Composite Function
- **Epic:** E4
- **File(s):** `web/lib/image/render-with-sharp.ts`
- **Action:** Implement `renderImage(lines, fontSize, config): Promise<Buffer>` that:
  1. Loads template via `sharp(config.template.path)`
  2. Converts SVG string to `Buffer`
  3. Calls `.composite([{ input: svgBuffer, top: 0, left: 0 }])`
  4. Returns `.png().toBuffer()`
- **Done when:** Returns a PNG `Buffer` without throwing.

#### T-017 · Implement Generate Image Orchestrator
- **Epic:** E4
- **File(s):** `web/lib/image/generate-image.ts` (new)
- **Action:** Implement and export `generateImage(name: string): Promise<Buffer>` that:
  1. Imports `templateConfig`
  2. Calls `computeTextLayout(name, templateConfig)`
  3. Calls `renderImage(lines, fontSize, templateConfig)`
  4. Returns the PNG buffer
  5. Lets `NameTooLongError` propagate up uncaught
- **Done when:** End-to-end generates a PNG buffer from a string input.

#### T-018 · Write Local Test Render Script
- **Epic:** E4
- **File(s):** `web/scripts/test-render.ts` (new)
- **Action:** Script that:
  1. Calls `generateImage("محمد أحمد")` and saves to `scripts/output/test-short.png`
  2. Calls `generateImage("سالم عبدالله المناعي")` and saves to `scripts/output/test-long.png`
  3. Attempts `generateImage("اسم طويل جداً لا يمكن احتواؤه بأي حال من الأحوال")` and expects `NameTooLongError`
  - Run with: `npx tsx scripts/test-render.ts`
- **Done when:** Both PNG files saved; visual inspection confirms correct name placement and RTL layout.


---

## M3 — Shippable MVP

---

### E5 — API Route

#### T-019 · Create Zod Validation Schema
- **Epic:** E5
- **File(s):** `web/lib/validation/submission.ts` (new)
- **Action:**
  ```ts
  import { z } from "zod";

  export const SubmissionSchema = z.object({
    name: z.string().trim().min(1, "الاسم مطلوب").max(60, "الاسم طويل جداً"),
    email: z.string().trim().email("البريد الإلكتروني غير صحيح"),
  });

  export type SubmissionInput = z.infer<typeof SubmissionSchema>;
  ```
- **Done when:** Schema parses valid input correctly; returns structured errors for invalid input.

#### T-020 · Implement Rate Limiter Utility
- **Epic:** E5
- **File(s):** `web/lib/rate-limit.ts` (new)
- **Action:** Implement a simple in-memory rate limiter:
  - `checkRateLimit(ip: string): boolean`
  - Max 10 requests per 60-second window per IP
  - Uses a `Map<string, { count: number, resetAt: number }>`
  - Returns `false` (blocked) if limit exceeded
- **Done when:** 11th call within 60s returns `false`; resets after window expires.

#### T-021 · Implement API Route Handler
- **Epic:** E5
- **File(s):** `web/app/api/generate/route.ts` (new)
- **Action:** Implement `POST` handler:
  1. Extract IP from `X-Forwarded-For` header
  2. Check rate limit → return `429` if exceeded
  3. Read body; reject if `Content-Length > 1024` → `413`
  4. Parse JSON → `SubmissionSchema.safeParse()` → return `400` with errors on failure
  5. Call `generateImage(name)` → catch `NameTooLongError` → return `422`
  6. On success: return `new Response(buffer, { headers: { "Content-Type": "image/png", "Content-Disposition": 'attachment; filename="certificate.png"', "Cache-Control": "no-store" } })`
  7. Catch all other errors → `console.error` (no PII) → return `500`
- **Done when:** All curl tests pass (see verification checklist).


---

### E6 — Frontend UI

#### T-022 · Build NameEmailForm Component
- **Epic:** E6
- **File(s):** `web/app/components/NameEmailForm.tsx` (new)
- **Action:** `"use client"` component with:
  - State: `name`, `email`, `loading`, `error`, `imageUrl`
  - Arabic name field: `<input dir="rtl" lang="ar" />`
  - Email field: `<input type="email" />`
  - `handleSubmit`: validate client-side → `fetch("/api/generate", { method: "POST", body: JSON.stringify({ name, email }) })` → on success: `URL.createObjectURL(blob)` → set `imageUrl`
  - Props: `onSuccess(imageUrl: string)`, `onError(message: string)`
- **Done when:** Form submits, loading state shows, success/error states handled.

#### T-023 · Build PreviewCard Component
- **Epic:** E6
- **File(s):** `web/app/components/PreviewCard.tsx` (new)
- **Action:** `"use client"` component:
  - Props: `imageUrl: string | null`
  - Renders `null` when `imageUrl` is null
  - When set: `<img src={imageUrl} alt="شهادتك" className="max-w-full h-auto rounded shadow-lg" />`
- **Done when:** Image appears after successful generation; hidden otherwise.

#### T-024 · Build DownloadButton Component
- **Epic:** E6
- **File(s):** `web/app/components/DownloadButton.tsx` (new)
- **Action:** `"use client"` component:
  - Props: `imageUrl: string | null`
  - Renders `null` when `imageUrl` is null
  - When set: `<a href={imageUrl} download="certificate.png">تحميل الشهادة</a>`
  - Tailwind styling: full-width, min height 48px, prominent color
- **Done when:** Tap triggers PNG download on mobile; button hidden before generation.

#### T-025 · Build ErrorNotice Component
- **Epic:** E6
- **File(s):** `web/app/components/ErrorNotice.tsx` (new)
- **Action:** Component that maps error codes → Arabic strings:
  - `VALIDATION_ERROR` → field-level messages from API
  - `NAME_TOO_LONG` → `"الاسم طويل جداً لهذا التصميم"`
  - `RATE_LIMITED` → `"يرجى الانتظار قبل المحاولة مجدداً"`
  - `SERVER_ERROR` → `"حدث خطأ أثناء إنشاء الصورة، حاول مرة أخرى"`
- **Done when:** Correct Arabic message shown for each error type.

#### T-026 · Build Page Shell
- **Epic:** E6
- **File(s):** `web/app/page.tsx`, `web/app/layout.tsx`
- **Action:**
  - `layout.tsx`: set `<html lang="ar" dir="rtl">`, import Tailwind globals
  - `page.tsx`: Server Component that renders:
    - Centered single-column layout (`max-w-md mx-auto px-4 py-8`)
    - Logo/title at top
    - `<NameEmailForm>` → on success: show `<PreviewCard>` + `<DownloadButton>`
    - `<ErrorNotice>` for errors
- **Done when:** Full page renders RTL on mobile viewport, all components connected.


---

## M4 — Production Ready

---

### E7 — Edge Cases & Robustness

#### T-027 · Test Very Long Name (>60 chars)
- **Epic:** E7
- **File(s):** `web/app/api/generate/route.ts`, `web/lib/validation/submission.ts`
- **Action:** Send a name of 61+ characters to the API. Confirm Zod catches it and returns `400` with the Arabic error message before ever hitting the image engine.
- **Done when:** `400` returned with `"الاسم طويل جداً"` message.

#### T-028 · Test Single-Character Name
- **Epic:** E7
- **File(s):** `web/scripts/test-render.ts`
- **Action:** Add test case `generateImage("م")` — confirm it generates a valid PNG with the single character centered.
- **Done when:** PNG output looks correct; no crash.

#### T-029 · Test Names with Extra Spaces
- **Epic:** E7
- **File(s):** `web/lib/image/text-layout.ts`
- **Action:** Test `generateImage("  محمد   أحمد  ")`. Verify whitespace is trimmed and normalized before layout. Name should render the same as `"محمد أحمد"`.
- **Done when:** Output PNG matches clean-name output.

#### T-030 · Test Arabic Diacritics (Tashkeel)
- **Epic:** E7
- **File(s):** `web/scripts/test-render.ts`
- **Action:** Add test case with diacritics e.g. `"مُحَمَّد"`. Confirm font renders tashkeel correctly without layout overflow.
- **Done when:** PNG renders correctly without character clipping.

#### T-031 · Add Server-Side Error Logging
- **Epic:** E7
- **File(s):** `web/app/api/generate/route.ts`
- **Action:** In the `catch` block for unexpected errors, log: `console.error("[generate] Image generation failed:", error.message)`. Do NOT log `name` or `email`.
- **Done when:** Error appears in server logs without PII; no user data logged.

---

### E8 — Security & Performance Hardening

#### T-032 · Add Security Headers
- **Epic:** E8
- **File(s):** `web/next.config.js`
- **Action:** Add `headers()` export:
  ```js
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  }
  ```
- **Done when:** Headers present in all HTTP responses (verify with curl `-I`).

#### T-033 · Run Lighthouse Mobile Audit
- **Epic:** E8
- **File(s):** No code changes — audit only
- **Action:** Run Lighthouse in Chrome DevTools on the production build (`npm run build && npm start`), mobile preset. Fix any issues causing score < 90.
- **Done when:** Performance + Accessibility + Best Practices all ≥ 90.

#### T-034 · Verify Rate Limiter Under Load
- **Epic:** E8
- **File(s):** `web/lib/rate-limit.ts`
- **Action:** Send 11 rapid POST requests from the same IP. Confirm 10 succeed and the 11th returns `429`.
- **Done when:** 429 on 11th request confirmed.

#### T-035 · Create .env.example
- **Epic:** E8
- **File(s):** `web/.env.example` (new)
- **Action:**
  ```env
  # Rate limiting window in seconds (default: 60)
  RATE_LIMIT_WINDOW=60

  # Max requests per window per IP (default: 10)
  RATE_LIMIT_MAX=10

  # Node environment
  NODE_ENV=development
  ```
- **Done when:** File committed; `.env` added to `.gitignore`.

#### T-036 · Final Visual QA
- **Epic:** E8
- **File(s):** No code changes — QA only
- **Action:** Generate a certificate using the live app. Open side-by-side with `References/images/After_Submission/generated_image.jpg`. Confirm:
  - Name zone position matches
  - Font style is consistent
  - No overflow or clipping
  - RTL alignment is correct
- **Done when:** Visual sign-off confirmed.

---

## Task Summary

| ID | Task | Epic | Milestone |
|---|---|---|---|
| T-001 | Scaffold Next.js App | E1 | M1 |
| T-002 | Install Core Dependencies | E1 | M1 |
| T-003 | Create Folder Structure | E1 | M1 |
| T-004 | Clean Boilerplate | E1 | M1 |
| T-005 | Inspect Template Dimensions | E2 | M1 |
| T-006 | Measure Name Bounding Box | E2 | M1 |
| T-007 | Copy Template to Public | E2 | M1 |
| T-008 | Source & Place Arabic Font | E2 | M1 |
| T-009 | Create Template Config | E2 | M1 |
| T-010 | Create NameTooLongError Class | E3 | M2 |
| T-011 | Implement Text Width Measurement | E3 | M2 |
| T-012 | Implement Font-Shrink Loop | E3 | M2 |
| T-013 | Implement Line-Break Logic | E3 | M2 |
| T-014 | Export Main Layout Function | E3 | M2 |
| T-015 | Implement SVG Text Layer Builder | E4 | M2 |
| T-016 | Implement Sharp Composite Function | E4 | M2 |
| T-017 | Implement Generate Image Orchestrator | E4 | M2 |
| T-018 | Write Local Test Render Script | E4 | M2 |
| T-019 | Create Zod Validation Schema | E5 | M3 |
| T-020 | Implement Rate Limiter Utility | E5 | M3 |
| T-021 | Implement API Route Handler | E5 | M3 |
| T-022 | Build NameEmailForm Component | E6 | M3 |
| T-023 | Build PreviewCard Component | E6 | M3 |
| T-024 | Build DownloadButton Component | E6 | M3 |
| T-025 | Build ErrorNotice Component | E6 | M3 |
| T-026 | Build Page Shell | E6 | M3 |
| T-027 | Test Very Long Name | E7 | M4 |
| T-028 | Test Single-Character Name | E7 | M4 |
| T-029 | Test Names with Extra Spaces | E7 | M4 |
| T-030 | Test Arabic Diacritics | E7 | M4 |
| T-031 | Add Server-Side Error Logging | E7 | M4 |
| T-032 | Add Security Headers | E8 | M4 |
| T-033 | Run Lighthouse Mobile Audit | E8 | M4 |
| T-034 | Verify Rate Limiter Under Load | E8 | M4 |
| T-035 | Create .env.example | E8 | M4 |
| T-036 | Final Visual QA | E8 | M4 |
