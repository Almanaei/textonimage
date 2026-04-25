---
name: planning-skill
description: Force structured extraction of delivery plans from PRDs, milestone docs, task lists, or meeting notes. Use when Codex must output milestones, tasks, dependencies, acceptance criteria, risks, and execution order in a complete and implementation-ready format.
---

# Planning Skill

## Objective

Produce a complete execution plan from source documents with six mandatory sections:

1. Milestones
2. Tasks
3. Dependencies
4. Acceptance Criteria
5. Risks
6. Execution Order

## Operating Rules

- Treat these six sections as required output; never skip one.
- Preserve source IDs when they exist (for example `M1`, `T-021`).
- If IDs are missing, generate stable IDs and mark them as `generated`.
- If data is unavailable, write `MISSING` explicitly instead of guessing.
- Keep acceptance criteria testable and observable.
- Keep risks actionable with mitigation and owner.

## Extraction Method

1. Parse source artifacts and list all milestone-like and task-like items.
2. Normalize tasks into atomic units with a single outcome each.
3. Map each task to a milestone.
4. Extract explicit dependencies; infer only when necessary and label as `inferred`.
5. Extract or rewrite acceptance criteria into verifiable statements.
6. Build risk register from blockers, uncertainty, sequencing conflicts, and external constraints.
7. Compute execution order using dependency-first sequencing:
   - Respect hard dependencies first.
   - Group independent tasks as parallel batches.
   - Highlight critical path tasks.
8. Run completeness checks before finalizing:
   - All six required sections exist.
   - Every task has milestone and status (`ready` or `blocked`).
   - All dependencies reference valid task IDs.
   - Every risk has mitigation and owner.

## Output Contract

Use this structure exactly.

```markdown
## Milestones
| Milestone ID | Name | Goal | Exit Criteria |
|---|---|---|---|

## Tasks
| Task ID | Milestone ID | Task | Owner | Status |
|---|---|---|---|---|

## Dependencies
| Task ID | Depends On | Type (hard/soft) | Source (explicit/inferred) |
|---|---|---|---|

## Acceptance Criteria
| Task ID | Criteria |
|---|---|

## Risks
| Risk ID | Related Task/Milestone | Description | Impact | Mitigation | Owner |
|---|---|---|---|---|---|

## Execution Order
1. Wave 1: <parallel-safe task IDs>
2. Wave 2: <parallel-safe task IDs>
3. Wave N: <critical path completion>
```

## Quality Bar

- No mandatory section is omitted.
- No dependency points to an unknown task.
- No task is left without acceptance criteria.
- Execution order is dependency-valid and clearly staged.
- Risks cover technical, delivery, and operational failure modes.
