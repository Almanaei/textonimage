# Architecture Policy

## Stack Constraints
- frontend framework: Next.js
- API layer: Route Handler or Server Action
- image rendering: Sharp or Node Canvas
- storage: local project assets or object storage
- persistence: optional PostgreSQL

## Architectural Requirements
- rendering must happen server-side
- UI and API contracts must remain decoupled through explicit interfaces
- template configuration must be externalized from rendering logic
- persistence must be optional, not hard-coupled to rendering

## Decision Recording
Any material architecture decision must be documented as an ADR or equivalent architecture artifact.
