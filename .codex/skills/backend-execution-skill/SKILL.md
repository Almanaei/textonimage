---
name: backend-execution-skill
description: Execute backend changes safely in existing codebases with strict reuse-first and minimal-diff behavior. Use when Codex must inspect current code first, reuse existing modules, implement incremental changes, and avoid modifying the public frontend.
---

# Backend Execution Skill

## Objective

Deliver backend changes with low risk by enforcing:

1. Code inspection first
2. Reuse of existing modules
3. Incremental changes only
4. No modification of public frontend

## Mandatory Protocol

1. Inspect existing backend code before writing any code.
2. Identify reusable modules, utilities, schemas, and error helpers.
3. Propose the smallest viable backend change set.
4. Apply changes in incremental steps with small diffs.
5. Validate with targeted tests/checks after each step.
6. Report exactly what changed and why.

Do not skip step 1.

## Reuse-First Rules

- Prefer existing helpers over new files.
- Extend existing modules before creating new modules.
- Reuse current validation, error, logging, and rate-limit patterns.
- If new code is unavoidable, keep it minimal and colocated with related backend code.

## Incremental Change Rules

- Avoid broad refactors during feature/bug tasks.
- Keep each edit independently reviewable.
- Preserve existing API contracts unless the request explicitly changes them.
- If contract changes are required, document impact and migration notes.

## Frontend Protection Rules

Treat public frontend as protected by default.

- Do not edit UI pages/components/styles/public assets.
- Do not alter user-facing behavior unless explicitly requested.

For this repository, backend-allowed paths are:

- `app/app/api/**`
- `app/lib/**` (server/backend logic only)
- `app/scripts/**` (backend support scripts)
- `app/__tests__/**` (backend tests)

Frontend-protected paths include:

- `app/app/page.tsx`
- `app/app/layout.tsx`
- `app/app/globals.css`
- `app/components/**`
- `app/public/**`

If a requested change requires touching protected frontend files, stop and ask for explicit approval.

## Execution Checklist

Before editing:

- Locate entrypoint and adjacent backend modules.
- Map current data flow and error flow.
- List reuse candidates.

During editing:

- Change one backend concern at a time.
- Keep naming and style consistent with existing code.

After editing:

- Run relevant tests/checks.
- Confirm no protected frontend files were modified.

## Output Contract

Return results in this order:

1. `Inspection Summary`
2. `Reuse Decisions`
3. `Incremental Changes Applied`
4. `Validation Performed`
5. `Frontend Safety Check`

## Quality Bar

- Existing backend patterns are reused.
- Diff is minimal and scoped.
- Public frontend remains untouched.
- Validation confirms no regression in changed backend behavior.
