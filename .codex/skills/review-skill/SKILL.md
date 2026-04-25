---
name: review-skill
description: Enforce phase-end review gates after each implementation stage. Use when Codex must perform quality review, security verification, plan deviation detection, and blocker extraction before proceeding.
---

# Review Skill

## Objective

Force a structured review after every phase before moving to the next one.

Mandatory checks per phase:

1. Quality Review
2. Security Verification
3. Plan Deviation Check
4. Blocker Extraction

## Mandatory Phase Gate

At the end of each phase, do not continue directly.
Run all four checks, produce a gate result, then decide:

- `PASS`: continue to next phase
- `PASS_WITH_RISKS`: continue with tracked risks
- `BLOCKED`: stop and resolve blockers first

## Check 1: Quality Review

- Verify output against acceptance criteria.
- Verify correctness with tests or concrete validation.
- Check regressions in touched areas.
- Rate quality status as `green`, `yellow`, or `red`.

## Check 2: Security Verification

- Check auth/authz impact in changed flows.
- Check input validation and sanitization paths.
- Check sensitive data exposure in logs/responses/errors.
- Check rate-limit, abuse, and misuse surfaces where relevant.
- Classify findings by severity: `low`, `medium`, `high`, `critical`.

## Check 3: Plan Deviation Check

- Compare actual work to milestone/task plan.
- Detect skipped tasks, scope creep, and order violations.
- Mark each deviation as `approved` or `unapproved`.
- Define correction action for every unapproved deviation.

## Check 4: Blocker Extraction

- Extract active blockers from code, infra, dependencies, approvals, or unclear requirements.
- For each blocker, include:
  - impact
  - owner
  - unblock action
  - ETA
- Separate `hard blockers` from `soft blockers`.

## Output Contract

Use this structure exactly after each phase:

```markdown
## Phase Review
- Phase: <name/id>
- Gate Result: PASS | PASS_WITH_RISKS | BLOCKED

## Quality Review
- Status: green | yellow | red
- Findings:
- Evidence (tests/checks):

## Security Verification
- Findings by severity:
- Affected areas:
- Required remediations:

## Plan Deviation Check
- Deviations found:
- Approval status:
- Correction actions:

## Blockers
- Hard blockers:
- Soft blockers:
- Owners and ETAs:

## Next Decision
- Proceed to next phase: yes/no
- Preconditions:
```

## Quality Bar

- All four checks are present every phase.
- Security findings are severity-labeled and actionable.
- Deviations are explicit and reconciled to plan.
- Blockers are owner-assigned with unblock actions and ETA.
- No phase transition occurs without gate result.
