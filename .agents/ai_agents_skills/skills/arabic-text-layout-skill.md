# Skill: Arabic Text Layout

## Purpose
Handles Arabic rendering rules for names placed into fixed visual regions without breaking layout integrity.

## When to Use
- Arabic name rendering
- bounded layout regions
- text fitting and wrapping
- RTL alignment

## Inputs
- Arabic text
- font asset
- box dimensions
- base and minimum font sizes
- maximum line count

## Outputs
- fitted text layout
- line breaks
- final font size
- overflow decision

## Method
1. Normalize whitespace
2. Preserve Arabic readability and RTL expectations
3. Measure text against available width
4. Reduce font size gradually
5. Split across lines when policy allows
6. Fail safely when content exceeds supported bounds

## Quality Bar
- Visual correctness for Arabic users
- No overlap with surrounding design text
- Consistent results across repeated renders
