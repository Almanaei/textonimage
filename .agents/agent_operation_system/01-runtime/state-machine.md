# Workflow State Machine

## States
1. `INTAKE`
2. `SCOPING`
3. `ARCHITECTURE_APPROVED`
4. `IMPLEMENTATION_READY`
5. `IN_BUILD`
6. `IN_INTEGRATION`
7. `IN_VALIDATION`
8. `RELEASE_READY`
9. `RELEASED`
10. `MONITORING`
11. `BLOCKED`
12. `REWORK`

## State Definitions
### INTAKE
Raw business context is captured.

### SCOPING
Requirements are clarified, bounded, and translated into testable outcomes.

### ARCHITECTURE_APPROVED
System shape, stack decisions, contracts, and rendering strategy are approved.

### IMPLEMENTATION_READY
Implementation tasks are decomposed and assigned.

### IN_BUILD
Specialist build agents are producing implementation artifacts.

### IN_INTEGRATION
Outputs from multiple build agents are aligned and reconciled.

### IN_VALIDATION
Functional, rendering, UX, and operational checks are executed.

### RELEASE_READY
System passes all defined readiness gates.

### RELEASED
System is deployed to target environment.

### MONITORING
The system is under post-release observation.

### BLOCKED
A decision or dependency prevents progress.

### REWORK
One or more gates failed and corrective work is in progress.

## Allowed Transitions
- INTAKE -> SCOPING
- SCOPING -> ARCHITECTURE_APPROVED
- ARCHITECTURE_APPROVED -> IMPLEMENTATION_READY
- IMPLEMENTATION_READY -> IN_BUILD
- IN_BUILD -> IN_INTEGRATION
- IN_INTEGRATION -> IN_VALIDATION
- IN_VALIDATION -> RELEASE_READY
- RELEASE_READY -> RELEASED
- RELEASED -> MONITORING
- any state -> BLOCKED
- any review state -> REWORK
- REWORK -> prior valid state
