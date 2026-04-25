# Agent Dispatch

- Generated: 2026-04-23T20:29:10.259Z
- Selected agent: backend-agent
- Agent file: ../agents/ai_agents_skills/agents/backend-agent.md
- Reason: backend-agent: task mentions "api"; backend-agent: task mentions "db"; backend-agent: changed path "app/api/stats/route.ts"; backend-agent: changed path "app/scripts/migrate.ts"
- Workflow: orchestrator-agent -> backend-agent -> qa-agent -> devops-agent -> observability-agent
- Required skills: api-route-design-skill, validation-and-sanitization-skill, postgresql-schema-design-skill, storage-strategy-skill, testing-strategy-skill
- Missing skills: (none)

## Task

harden admin analytics api and db

## Changed Files

- app/api/stats/route.ts
- app/scripts/migrate.ts
