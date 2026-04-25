# Escalation Rules

## Purpose
This document defines when an agent must escalate to the Orchestrator Agent instead of continuing autonomously.

## Mandatory Escalation Conditions
An agent must escalate when any of the following applies:

### Product ambiguity
- acceptance criteria are contradictory
- long-name behavior is undefined
- rejection versus truncation policy is unresolved
- preview versus direct-download behavior is unclear

### Architecture ambiguity
- Sharp versus Node Canvas cannot be decided from available constraints
- storage model is unclear and affects API contract
- database persistence is conditionally required but business rules are undefined

### Quality ambiguity
- Arabic rendering accuracy cannot be guaranteed
- template bounding box is undefined or untested
- there is no measurable acceptance criterion for visual correctness

### Delivery risk
- a downstream team depends on an unstable artifact
- release is requested without test evidence
- production rollout is requested without monitoring, rollback, or rate-limit coverage

## Escalation Format
All escalations must include:
- issue summary
- affected workflow stage
- blocking impact
- options considered
- recommended decision
- owner required for resolution
