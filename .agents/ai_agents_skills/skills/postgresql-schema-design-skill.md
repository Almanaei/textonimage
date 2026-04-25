# Skill: PostgreSQL Schema Design

## Purpose
Designs a clean relational schema for optional submission persistence, analytics, and operational auditability.

## When to Use
- persistent submissions
- reporting requirements
- operational traceability

## Inputs
- data retention goals
- reporting needs
- entity relationships

## Outputs
- schema proposal
- table definitions
- indexing strategy
- migration guidance

## Best Practices
- Store only the data required by business needs
- Separate operational logs from transactional entities when scale grows
- Add timestamps and status fields consistently
- Index lookup and reporting paths intentionally

## Quality Bar
- minimal schema complexity
- scalable enough for expected traffic
- easy integration with backend services
