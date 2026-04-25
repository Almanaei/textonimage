# Workflow: Build and Release

## Objective
Describe the default end-to-end operating workflow for delivering the Arabic Name Image Generator.

## Phase 1: Intake and Scoping
**Lead:** Orchestrator Agent
**Worker:** Product Agent

### Steps
1. capture business goal
2. normalize constraints
3. produce scope brief
4. write PRD
5. pass scope gate

### Output
- PRD
- risk log
- open questions register

## Phase 2: Architecture
**Lead:** Orchestrator Agent
**Worker:** Solution Architect Agent

### Steps
1. read PRD
2. select API pattern
3. select rendering strategy
4. define storage and persistence options
5. define project structure
6. pass architecture gate

### Output
- architecture specification
- ADRs
- component responsibilities

## Phase 3: Build Planning
**Lead:** Orchestrator Agent
**Workers:** Frontend, Backend, Image Rendering, QA

### Steps
1. split work by domain
2. attach contracts to each domain
3. define acceptance criteria
4. pass build readiness gate

### Output
- build plan
- interface contracts
- rendering contract
- test plan

## Phase 4: Domain Execution
### Frontend Agent
- build form UX
- implement preview flow
- implement download state and error states

### Backend Agent
- implement request handling
- implement validation
- define response contract

### Image Rendering Agent
- implement template render strategy
- implement Arabic layout policy
- implement bounding-box fit behavior

### QA Agent
- define test suite
- validate cases and edge conditions

## Phase 5: Integration
**Lead:** Orchestrator Agent

### Steps
1. reconcile UI and API semantics
2. verify output payload shape
3. verify preview/download flow
4. confirm rendering output contract
5. pass integration gate

## Phase 6: Validation
**Lead:** QA Agent
**Support:** Observability, DevOps

### Steps
1. run functional suite
2. run Arabic rendering suite
3. run mobile compatibility suite
4. verify logging and metrics
5. pass validation gate

## Phase 7: Release
**Lead:** DevOps Agent
**Support:** Observability Agent

### Steps
1. finalize deployment checklist
2. verify rollback path
3. verify alerts and dashboards
4. pass release gate
5. deploy
6. monitor
