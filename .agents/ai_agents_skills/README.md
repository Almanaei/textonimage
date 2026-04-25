# AI Agents & Skills Package

This package defines the agent architecture and reusable skills required to build the **Arabic Name Image Generator** system.

## Scope
The system allows users to submit:
- Arabic name
- email address

The platform then:
- validates input
- generates a high-resolution PNG by placing the Arabic name into a fixed area on a predefined design template
- returns a preview and downloadable asset optimized for mobile users

## Package Structure

```text
ai_agents_skills/
├─ README.md
├─ agents/
│  ├─ orchestrator-agent.md
│  ├─ product-agent.md
│  ├─ solution-architect-agent.md
│  ├─ frontend-agent.md
│  ├─ backend-agent.md
│  ├─ image-rendering-agent.md
│  ├─ qa-agent.md
│  ├─ devops-agent.md
│  └─ observability-agent.md
├─ skills/
│  ├─ requirements-analysis-skill.md
│  ├─ prd-authoring-skill.md
│  ├─ nextjs-app-router-skill.md
│  ├─ api-route-design-skill.md
│  ├─ arabic-text-layout-skill.md
│  ├─ image-compositing-skill.md
│  ├─ validation-and-sanitization-skill.md
│  ├─ storage-strategy-skill.md
│  ├─ postgresql-schema-design-skill.md
│  ├─ mobile-preview-ux-skill.md
│  ├─ testing-strategy-skill.md
│  ├─ deployment-skill.md
│  └─ logging-monitoring-skill.md
└─ orchestration/
   ├─ multi-agent-workflow.md
   └─ handoff-contracts.md
```

## Recommended Core Agents
1. **Orchestrator Agent**
2. **Product Agent**
3. **Solution Architect Agent**
4. **Frontend Agent**
5. **Backend Agent**
6. **Image Rendering Agent**
7. **QA Agent**
8. **DevOps Agent**
9. **Observability Agent**

## Recommended Core Skills
1. Requirements Analysis
2. PRD Authoring
3. Next.js App Router Implementation
4. API Route Design
5. Arabic Text Layout
6. Image Compositing
7. Validation and Sanitization
8. Storage Strategy
9. PostgreSQL Schema Design
10. Mobile Preview UX
11. Testing Strategy
12. Deployment
13. Logging and Monitoring

## Operating Principle
Each agent owns a bounded problem space. Each skill is reusable and may be attached to one or more agents. The orchestrator routes tasks, enforces output contracts, and validates cross-agent dependencies.
