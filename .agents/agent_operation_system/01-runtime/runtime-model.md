# Runtime Model

## Overview
The Agent Operating System uses a **central orchestrator + specialist worker** model.

## Runtime Topology
- **Orchestrator Agent**: planning, routing, gate enforcement, final synthesis
- **Specialist Agents**: domain execution
- **Skills Layer**: reusable capabilities invoked by agents
- **Policy Layer**: non-negotiable rules applied at gates
- **Artifacts Layer**: structured outputs used for handoff and auditability

## Execution Modes
### 1. Sequential Mode
Used when outputs depend tightly on prior decisions.
Example:
- Product Agent -> Solution Architect Agent -> Backend Agent

### 2. Parallel Mode
Used when upstream architecture is stable and downstream implementation can branch.
Example:
- Frontend Agent
- Backend Agent
- Image Rendering Agent
running against the same approved architecture artifact.

### 3. Recovery Mode
Used when a gate fails.
The Orchestrator reopens only the affected scope and reroutes the issue to the owning specialist.

## Agent Lifecycle
1. Receive handoff artifact
2. Validate artifact completeness
3. Load relevant policies and skills
4. Execute scoped work
5. Produce output artifact
6. self-review against policy
7. submit to orchestrator for gate evaluation

## Allowed Agent Actions
- consume an approved artifact
- invoke a relevant skill
- produce a scoped artifact
- raise an escalation
- request rework through orchestrator

## Disallowed Agent Actions
- redefining upstream approved scope without escalation
- modifying another agent’s artifact without preserving provenance
- bypassing a required gate
- inventing acceptance criteria that conflict with product intent
