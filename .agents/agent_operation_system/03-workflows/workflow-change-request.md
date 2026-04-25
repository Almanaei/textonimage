# Workflow: Change Request Handling

## Purpose
Handle post-approval changes without destabilizing the delivery system.

## Example Changes
- switch from Sharp to Node Canvas
- add persistence to PostgreSQL
- support a second template
- change long-name behavior from rejection to truncation

## Flow
1. Intake change request
2. classify change type
3. determine impacted artifacts
4. reopen affected gate only
5. reroute to owning agent(s)
6. issue revised artifacts
7. rerun affected validation subset

## Change Classification
### Product change
Owned by Product Agent
Examples:
- input fields change
- output format changes
- acceptance criteria change

### Architecture change
Owned by Solution Architect Agent
Examples:
- renderer swap
- storage model change
- persistence model change

### Implementation change
Owned by Frontend/Backend/Rendering Agents
Examples:
- endpoint shape refinement
- preview interaction changes
- performance improvements

### Operational change
Owned by DevOps/Observability Agents
Examples:
- hosting target change
- alert thresholds
- logging structure
