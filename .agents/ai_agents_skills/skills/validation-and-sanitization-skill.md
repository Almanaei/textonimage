# Skill: Validation and Sanitization

## Purpose
Protects the system from malformed input and ensures predictable business behavior.

## When to Use
- form submission handling
- API request intake
- persistence input control

## Inputs
- raw user input
- validation rules
- security constraints

## Outputs
- validated payload
- normalized payload
- structured validation errors

## Method
1. Trim and normalize strings
2. Validate required fields
3. Validate email format
4. Apply name length and character policies
5. Reject unsupported or dangerous payloads

## Quality Bar
- User-friendly errors
- Security-conscious defaults
- Consistent validation logic across UI and API
