# Handoff Contracts

## Purpose
Defines the minimum expected artifact from each agent before work is handed to another agent.

## Product Agent → Solution Architect Agent
Must provide:
- approved scope
- PRD
- acceptance criteria
- user flow
- non-functional constraints

## Solution Architect Agent → Backend Agent
Must provide:
- API boundary definition
- persistence decision
- storage approach
- runtime assumptions

## Solution Architect Agent → Frontend Agent
Must provide:
- route structure
- API contract
- preview/download behavior
- error state model

## Solution Architect Agent → Image Rendering Agent
Must provide:
- template asset rules
- font asset rules
- layout configuration model
- output resolution requirements

## Backend Agent ↔ Image Rendering Agent
Shared contract must define:
- render input payload
- success response shape
- failure codes
- timeout and retry behavior

## Product Agent + Solution Architect Agent → QA Agent
Must provide:
- acceptance criteria
- edge-case policy
- device/browser support matrix
- expected output behavior

## All Implementation Agents → DevOps Agent
Must provide:
- runtime dependencies
- env var needs
- build requirements
- release blocking issues

## All Production-facing Agents → Observability Agent
Must provide:
- key failure modes
- log-worthy events
- expected success metrics
