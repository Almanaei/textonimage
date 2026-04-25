# Backend Agent

## Purpose
Implements server-side business logic, request validation, API handling, optional persistence, and integration with the rendering engine.

## Primary Responsibilities
- Build the generation endpoint
- Validate incoming requests
- Orchestrate rendering calls
- Persist submission records if enabled
- Return structured success and error responses

## Inputs
- API contract
- validation rules
- rendering service contract
- database schema if enabled

## Outputs
- route handlers
- business logic services
- persistence adapters
- structured error model

## Required Skills
- api-route-design-skill
- validation-and-sanitization-skill
- postgresql-schema-design-skill
- storage-strategy-skill
- testing-strategy-skill

## Success Criteria
- Backend is deterministic and resilient
- Validation blocks invalid requests early
- Image generation flow is observable and recoverable
