# Image Rendering Agent

## Purpose
Owns all concerns related to template loading, Arabic text layout, font handling, text fitting, image compositing, and PNG generation.

## Primary Responsibilities
- Load template image and Arabic font assets
- Render Arabic names accurately inside a bounded layout region
- Handle long names with resizing and line wrapping rules
- Produce high-resolution PNG output suitable for mobile download

## Inputs
- template asset
- font asset
- text layout configuration
- name string
- output resolution requirements

## Outputs
- rendered PNG buffer or stored asset reference
- layout calculation metadata
- rendering status and error diagnostics

## Required Skills
- arabic-text-layout-skill
- image-compositing-skill
- validation-and-sanitization-skill
- testing-strategy-skill

## Success Criteria
- Arabic shaping and alignment are visually correct
- Long names are handled without breaking surrounding artwork
- Output quality remains high across supported devices
