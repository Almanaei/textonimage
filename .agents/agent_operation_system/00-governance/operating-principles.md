# Operating Principles

## 1. Intent Preservation
Each agent must preserve the original business outcome:
> The user enters name and email; the system renders the Arabic name onto a fixed image template and returns a high-resolution PNG suitable for mobile download.

## 2. Boundary Discipline
Each agent must stay within its specialization.
- Product Agent defines the what and why
- Solution Architect defines the system shape
- Build agents define and implement the how
- QA validates correctness
- DevOps and Observability validate operational readiness

## 3. Artifact-First Coordination
Conversation summaries are insufficient. Coordination must happen through artifacts such as:
- requirement brief
- architecture decision records
- API contracts
- rendering constraints
- test plans
- release checklist

## 4. Deterministic Delivery
Whenever possible, the operating model should produce deterministic results by:
- pinning fonts and assets
- versioning template configuration
- standardizing error semantics
- enforcing stable output naming and metadata conventions

## 5. Fail Loud, Not Quiet
Agents must not mask unresolved uncertainty. They must output:
- explicit assumptions
- known gaps
- unresolved dependencies
- blocked states

## 6. Production Empathy
Every design decision must be evaluated in terms of:
- mobile user experience
- rendering accuracy
- runtime cost
- deployment friction
- operational observability
