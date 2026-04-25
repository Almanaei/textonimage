# Agent & Skill Assignment Map
**Product:** Arabic Name Image Generator
**Last Updated:** April 2026

---

## Overview

| Agent | Milestone(s) | Epics Owned |
|---|---|---|
| Orchestrator Agent | M1 → M4 (coordination) | All |
| Solution Architect Agent | M1 (complete) | Architecture & blueprint |
| Image Rendering Agent | M1 (E2) · M2 (E3, E4) | E2 · E3 · E4 |
| Backend Agent | M3 | E5 |
| Frontend Agent | M3 | E6 |
| QA Agent | M4 | E7 |
| DevOps Agent | M4 | E8 (deployment, headers, env) |
| Observability Agent | M4 | E8 (logging) |

---

## M1 — Foundation

### Orchestrator Agent
**Role:** Drives planning, breaks down PRD into workstreams, coordinates all agents.
**Skills consumed:**
- `requirements-analysis-skill` → analyzed PRD, produced implementation plan, milestones, tasks
- `prd-authoring-skill` → validated PRD completeness before engineering started

### Solution Architect Agent ✅ Complete
**Role:** Produced `docs/blueprint.md` — all architecture decisions are done.
**Skills consumed:**
- `nextjs-app-router-skill` → chose App Router + Route Handler pattern
- `api-route-design-skill` → defined `POST /api/generate` contract and response shape
- `storage-strategy-skill` → decided no storage in MVP, direct PNG binary response

### Image Rendering Agent (partial — E2)
**Role:** Inspects template assets to determine dimensions and name placement coordinates.
**Tasks:** T-005, T-006
**Skills consumed:**
- `image-compositing-skill` → measure bounding box via ImageSorcery MCP, confirm template file


---

## M2 — Working Image Engine

### Image Rendering Agent
**Role:** Owns the entire image generation engine — text fitting, compositing, PNG output.
**Epics:** E3 (Arabic Text Layout), E4 (Sharp Pipeline)

| Task | Description | Skills |
|---|---|---|
| T-010 | Create `NameTooLongError` class | `arabic-text-layout-skill` |
| T-011 | Implement text width measurement | `arabic-text-layout-skill` · `image-compositing-skill` |
| T-012 | Implement font-shrink loop | `arabic-text-layout-skill` |
| T-013 | Implement line-break logic | `arabic-text-layout-skill` |
| T-014 | Export main layout function | `arabic-text-layout-skill` |
| T-015 | Implement SVG text layer builder | `image-compositing-skill` |
| T-016 | Implement Sharp composite function | `image-compositing-skill` |
| T-017 | Implement generate-image orchestrator | `arabic-text-layout-skill` · `image-compositing-skill` |
| T-011 | Input normalization (trim/normalize) | `validation-and-sanitization-skill` |
| T-018 | Write local test render script | `testing-strategy-skill` |

**Quality bar (from skills):**
- Visual correctness for Arabic users — no overlap with surrounding artwork
- Consistent output across repeated renders
- Test cases must cover: short name, long name, 2-line split, overflow rejection

---

## M3 — Shippable MVP

### Backend Agent
**Role:** Implements the validated HTTP endpoint that accepts user input and returns PNG.
**Epic:** E5 (API Route)

| Task | Description | Skills |
|---|---|---|
| T-019 | Create Zod validation schema | `validation-and-sanitization-skill` |
| T-020 | Implement rate limiter utility | `api-route-design-skill` |
| T-021 | Implement `POST /api/generate` route handler | `api-route-design-skill` · `validation-and-sanitization-skill` |

**Quality bar (from skills):**
- Validate early — Zod runs before any image work
- Consistent response envelopes: `400` validation, `422` business rule, `500` server error, `429` rate limited
- Body size capped at 1KB; method guard returns `405`

### Frontend Agent
**Role:** Builds the mobile-first Arabic RTL UI — form, preview, download, error states.
**Epic:** E6 (Frontend UI)

| Task | Description | Skills |
|---|---|---|
| T-022 | Build `NameEmailForm` component | `nextjs-app-router-skill` · `validation-and-sanitization-skill` · `mobile-preview-ux-skill` |
| T-023 | Build `PreviewCard` component | `mobile-preview-ux-skill` |
| T-024 | Build `DownloadButton` component | `mobile-preview-ux-skill` |
| T-025 | Build `ErrorNotice` component | `nextjs-app-router-skill` · `mobile-preview-ux-skill` |
| T-026 | Build page shell (`app/page.tsx`, `layout.tsx`) | `nextjs-app-router-skill` · `mobile-preview-ux-skill` |

**Quality bar (from skills):**
- Form is short and focused; primary actions are thumb-friendly (min 48px)
- Loading state shown clearly during generation
- Download button is obvious after preview loads
- Server rendering logic stays in Server Components; interactivity in `"use client"` only


---

## M4 — Production Ready

### QA Agent
**Role:** Validates functional correctness, visual output, edge cases, and mobile compatibility.
**Epic:** E7 (Edge Cases & Robustness)

| Task | Description | Skills |
|---|---|---|
| T-027 | Test very long name (>60 chars) | `testing-strategy-skill` · `validation-and-sanitization-skill` |
| T-028 | Test single-character name | `testing-strategy-skill` · `arabic-text-layout-skill` |
| T-029 | Test names with extra whitespace | `testing-strategy-skill` · `arabic-text-layout-skill` |
| T-030 | Test Arabic diacritics / tashkeel | `testing-strategy-skill` · `arabic-text-layout-skill` |
| T-033 | Run Lighthouse mobile audit | `mobile-preview-ux-skill` · `testing-strategy-skill` |
| T-036 | Final visual QA against reference image | `image-compositing-skill` · `testing-strategy-skill` |

**Quality bar (from skills):**
- Representative Arabic name dataset used for rendering tests
- Critical issues identified before production release
- Lighthouse mobile score ≥ 90

### DevOps Agent
**Role:** Security headers, environment config, deployment readiness, rate limit verification.
**Epic:** E8 (Security & Performance Hardening — deployment tasks)

| Task | Description | Skills |
|---|---|---|
| T-032 | Add security headers in `next.config.js` | `deployment-skill` |
| T-034 | Verify rate limiter under load | `deployment-skill` |
| T-035 | Create `.env.example` | `deployment-skill` |

**Quality bar (from skills):**
- Application deploys reproducibly
- Runtime supports Sharp without native dependency issues
- Rollback and incident recovery steps defined

### Observability Agent
**Role:** Structured error logging for the generation pipeline.
**Epic:** E8 (Security & Performance Hardening — logging tasks)

| Task | Description | Skills |
|---|---|---|
| T-031 | Add server-side error logging (no PII) | `logging-monitoring-skill` |

**Quality bar (from skills):**
- Errors are diagnosable from logs alone
- No PII (name, email) ever written to logs
- Generation latency and failure rate are observable

---

## Skills Not Used in MVP

| Skill | Reason Deferred |
|---|---|
| `postgresql-schema-design-skill` | No DB in MVP — deferred to Phase 3 (post-launch) |
| `storage-strategy-skill` | No file storage in MVP — PNG returned as direct binary stream |
| `prd-authoring-skill` | Already fully consumed — PRD is complete and locked |

---

## Execution Protocol

Before writing any code for a task, the following pattern applies:

```
1. Identify which agent owns the task (this file)
2. Load that agent's required skill files (read_file on SKILL.md)
3. Implement following the skill's method + quality bar
4. Verify against the skill's success criteria before marking task done
```

**Skill files location:** `agents/ai_agents_skills/skills/`
**Agent files location:** `agents/ai_agents_skills/agents/`

---

## M4 — Production Ready

### QA Agent
**Role:** Validates functional correctness, visual output, edge cases, and mobile compatibility.
**Epic:** E7 (Edge Cases & Robustness)

| Task | Description | Skills |
|---|---|---|
| T-027 | Test very long name (>60 chars) | `testing-strategy-skill` · `validation-and-sanitization-skill` |
| T-028 | Test single-character name | `testing-strategy-skill` · `arabic-text-layout-skill` |
| T-029 | Test names with extra whitespace | `testing-strategy-skill` · `arabic-text-layout-skill` |
| T-030 | Test Arabic diacritics / tashkeel | `testing-strategy-skill` · `arabic-text-layout-skill` |
| T-033 | Run Lighthouse mobile audit | `mobile-preview-ux-skill` · `testing-strategy-skill` |
| T-036 | Final visual QA against reference image | `image-compositing-skill` · `testing-strategy-skill` |

**Quality bar (from skills):**
- Representative Arabic name dataset used for rendering tests
- Critical issues identified before production release
- Lighthouse mobile score ≥ 90

### DevOps Agent
**Role:** Security headers, environment config, deployment readiness, rate limit verification.
**Epic:** E8 (Security & Performance Hardening — deployment tasks)

| Task | Description | Skills |
|---|---|---|
| T-032 | Add security headers in `next.config.js` | `deployment-skill` |
| T-034 | Verify rate limiter under load | `deployment-skill` |
| T-035 | Create `.env.example` | `deployment-skill` |

**Quality bar (from skills):**
- Application deploys reproducibly
- Runtime supports Sharp without native dependency issues
- Rollback and incident recovery steps defined

### Observability Agent
**Role:** Structured error logging for the generation pipeline.
**Epic:** E8 (Security & Performance Hardening — logging tasks)

| Task | Description | Skills |
|---|---|---|
| T-031 | Add server-side error logging (no PII) | `logging-monitoring-skill` |

**Quality bar (from skills):**
- Errors are diagnosable from logs alone
- No PII (name, email) ever written to logs
- Generation latency and failure rate are observable

---

## Skills Not Used in MVP

| Skill | Reason Deferred |
|---|---|
| `postgresql-schema-design-skill` | No DB in MVP — deferred to Phase 3 (post-launch) |
| `storage-strategy-skill` | No file storage in MVP — PNG returned as direct binary stream |
| `prd-authoring-skill` | Already fully consumed — PRD is complete and locked |

---

## Execution Protocol

Before writing any code for a task, the following pattern applies:

```
1. Identify which agent owns the task (this file)
2. Load that agent's required skill files (read_file on SKILL.md)
3. Implement following the skill's method + quality bar
4. Verify against the skill's success criteria before marking task done
```

**Skill files location:** `agents/ai_agents_skills/skills/`
**Agent files location:** `agents/ai_agents_skills/agents/`
