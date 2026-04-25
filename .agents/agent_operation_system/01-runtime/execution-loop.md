# Execution Loop

## Loop Objective
Ensure every work cycle is grounded, scoped, validated, and measurable.

## Standard Loop
1. Read the current workflow state
2. Load the active objective
3. Read all approved upstream artifacts
4. Select the responsible agent
5. Load relevant skills
6. Execute scoped work
7. Apply policy checks
8. Emit artifact
9. Route to next gate or specialist
10. record risks, assumptions, and open issues

## Loop Guardrails
- Never skip upstream artifact review
- Never route implementation before architecture approval
- Never mark validation complete without evidence
- Never mark release-ready without rollback and monitoring readiness

## Minimum Artifact Metadata
Every artifact must include:
- artifact name
- version
- owner agent
- upstream dependencies
- assumptions
- risks
- acceptance status
