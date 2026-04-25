# Rendering Contract

## Purpose
Define the stable interface between architecture, backend, frontend, QA, and the image rendering subsystem.

## Inputs
- name: Arabic string
- email: string, validated but not rendered
- template version
- font version
- layout configuration version

## Rendering Rules
- render only the name
- place text inside predefined bounding box
- preserve template integrity
- output PNG at configured target resolution
- enforce configured font, color, alignment, and max lines

## Error Conditions
- invalid input
- name exceeds configured policy
- template asset unavailable
- font unavailable
- rendering failure

## Output Contract
- preview-capable PNG
- downloadable PNG
- predictable error code mapping
