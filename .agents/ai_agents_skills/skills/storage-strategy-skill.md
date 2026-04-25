# Skill: Storage Strategy

## Purpose
Determines how templates, fonts, and generated images are stored across development and production environments.

## When to Use
- MVP asset handling
- generated file retention decisions
- object storage adoption

## Inputs
- file types
- retention policy
- scale expectations
- deployment model

## Outputs
- storage decision matrix
- path conventions
- retention rules
- migration strategy

## Best Practices
- Keep static template/font assets versioned
- Use local project storage only for early-stage simplicity
- Move generated assets to object storage when persistence or scale requires it
- Avoid unnecessary permanent storage when direct download is enough

## Quality Bar
- Clear asset ownership
- low operational friction
- easy migration path
