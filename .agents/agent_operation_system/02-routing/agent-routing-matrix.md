# Agent Routing Matrix

| Workflow Need | Primary Agent | Supporting Agents | Core Skills | Output |
|---|---|---|---|---|
| Convert business need into scoped requirements | Product Agent | Orchestrator Agent | requirements-analysis, prd-authoring | PRD / scope brief |
| Define system architecture | Solution Architect Agent | Backend, Frontend, Image Rendering | nextjs-app-router, storage-strategy, postgresql-schema-design | architecture spec |
| Build UI and submission flow | Frontend Agent | Product, QA | mobile-preview-ux, validation-and-sanitization | frontend implementation plan |
| Define API contract and service behavior | Backend Agent | Architect, QA | api-route-design, validation-and-sanitization | API spec |
| Build rendering pipeline | Image Rendering Agent | Architect, QA | arabic-text-layout, image-compositing | rendering spec |
| Define test strategy and acceptance suite | QA Agent | Product, Frontend, Backend, Rendering | testing-strategy | test plan |
| Prepare deployment model | DevOps Agent | Architect, Observability | deployment-skill, storage-strategy | deployment plan |
| Define metrics, logs, and alerts | Observability Agent | DevOps, Backend | logging-monitoring-skill | observability spec |
| Sequence work and enforce gates | Orchestrator Agent | All | all required by phase | integrated delivery plan |

## Routing Rule
The orchestrator must always choose the **narrowest competent agent** for a given problem before escalating to a broader agent.
