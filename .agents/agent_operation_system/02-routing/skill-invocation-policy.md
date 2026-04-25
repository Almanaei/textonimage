# Skill Invocation Policy

## Purpose
Standardize when an agent should invoke a skill versus solve directly.

## Invocation Rule
An agent must invoke a skill when:
- the task matches a reusable specialist capability
- the task affects a governed surface such as API design, rendering, validation, deployment, or monitoring
- consistency across outputs matters

## Mapping
### Product Agent
- requirements-analysis-skill
- prd-authoring-skill

### Solution Architect Agent
- nextjs-app-router-skill
- storage-strategy-skill
- postgresql-schema-design-skill

### Frontend Agent
- mobile-preview-ux-skill
- validation-and-sanitization-skill

### Backend Agent
- api-route-design-skill
- validation-and-sanitization-skill

### Image Rendering Agent
- arabic-text-layout-skill
- image-compositing-skill

### QA Agent
- testing-strategy-skill

### DevOps Agent
- deployment-skill
- storage-strategy-skill

### Observability Agent
- logging-monitoring-skill

## Skill Invocation Output Format
Every skill call must produce:
- selected skill
- reason for invocation
- inputs used
- output summary
- downstream artifact impact
