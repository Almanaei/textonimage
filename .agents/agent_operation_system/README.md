# Agent Operating System (AOS)

## Purpose
This package transforms the previously defined **agents** and **skills** into an executable operating model for a multi-agent delivery system that can design, build, validate, and release the **Arabic Name Image Generator** platform.

It is intended to be used by:
- AI agent platform designers
- Prompt engineers
- technical program managers
- product and engineering leads
- implementation teams building agentic delivery workflows

## Scope
This operating system defines:
- agent runtime roles
- agent invocation rules
- workflow states
- handoff contracts
- execution policies
- quality gates
- artifact templates
- evaluation metrics

It does **not** replace the existing agent/skill library. Instead, it operationalizes it.

## Relationship to the previous package
- `ai_agents_skills/agents/*` = who the agents are
- `ai_agents_skills/skills/*` = what capabilities they have
- `agent_os/*` = how they run, collaborate, escalate, validate, and produce delivery artifacts

## Directory Structure
- `00-governance/` — system charter, operating principles, escalation rules
- `01-runtime/` — runtime model, lifecycle, state machine, execution loop
- `02-routing/` — routing matrix and skill invocation rules
- `03-workflows/` — end-to-end workflows for delivery and change management
- `04-prompts/` — executable prompt specifications for agents
- `05-contracts/` — handoff contracts and artifact IO schemas
- `06-templates/` — reusable markdown templates for outputs
- `07-policies/` — quality, security, architecture, and release policies
- `08-metrics/` — evaluation, KPIs, observability, review scorecards

## Canonical Agent Set
1. Orchestrator Agent
2. Product Agent
3. Solution Architect Agent
4. Frontend Agent
5. Backend Agent
6. Image Rendering Agent
7. QA Agent
8. DevOps Agent
9. Observability Agent

## Canonical Execution Sequence
1. Intake
2. Requirements decomposition
3. Architecture definition
4. Build planning
5. Parallel implementation
6. Integration review
7. Testing and hardening
8. Release readiness
9. Production monitoring

## Primary Design Principle
The system must optimize for **delivery correctness**, then **artifact quality**, then **speed**.

## How to Use This Package
1. Read `00-governance/system-charter.md`
2. Read `01-runtime/runtime-model.md`
3. Start from `03-workflows/workflow-build-release.md`
4. Use `04-prompts/` to instantiate agent prompts
5. Use `05-contracts/` for agent-to-agent handoffs
6. Enforce `07-policies/` at every gate
7. Review outcomes with `08-metrics/`
