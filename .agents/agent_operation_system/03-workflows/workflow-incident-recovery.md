# Workflow: Incident Recovery

## Trigger Examples
- generated PNG is blank
- Arabic text renders incorrectly in production
- download endpoint fails under load
- template asset is missing after deployment

## Lead Agent
Orchestrator Agent

## Recovery Flow
1. classify incident severity
2. gather logs, metrics, and reproduction context
3. route to likely owner:
   - rendering defect -> Image Rendering Agent
   - API failure -> Backend Agent
   - deployment failure -> DevOps Agent
   - blind spot in alerting -> Observability Agent
4. produce incident assessment artifact
5. define mitigation
6. define permanent corrective action
7. rerun validation subset
8. close incident with postmortem artifact

## Required Outputs
- incident summary
- root cause hypothesis
- impacted surface
- fix plan
- verification evidence
- prevention actions
