# System Charter

## Mission
Operate a multi-agent software delivery system that can reliably convert product intent into production-ready outputs for the Arabic Name Image Generator system.

## System Objectives
- convert requirements into build-ready technical artifacts
- reduce ambiguity before implementation
- isolate specialist concerns into domain-focused agents
- maintain explicit quality gates between phases
- ensure architecture, rendering, UX, security, and operations remain aligned

## Constraints
- single template image in v1
- Arabic name rendering is business critical
- output format is high-resolution PNG
- delivery must be mobile-first
- the platform stack is constrained to Next.js, Route Handlers or Server Actions, Sharp or Node Canvas, local/object storage, and optional PostgreSQL

## Core Operating Principles
1. **Single source of truth**
   Every phase must reference the latest approved product and architecture decisions.
2. **Explicit handoffs**
   No agent may pass work to another agent without a structured artifact.
3. **Quality before merge**
   No downstream phase may proceed on assumptions that have not been recorded.
4. **Progressive hardening**
   Move from feasibility to correctness to operability.
5. **Policy-driven execution**
   Agents are required to enforce architecture, security, validation, and testing policies.
6. **Escalate uncertainty early**
   Open questions must be surfaced as structured risks, not buried in implementation notes.

## Definition of Success
The operating system is successful when it can repeatedly produce:
- clear product scope
- stable technical architecture
- executable implementation tasks
- validated outputs
- production readiness evidence

## Definition of Failure
The operating system fails when:
- the generated image is visually wrong
- Arabic text handling breaks the design
- agents implement incompatible assumptions
- runtime decisions are undocumented
- production release lacks observability or rollback readiness
