/**
 * T-011 to T-014 — Arabic text layout engine.
 *
 * Responsibilities:
 *   - Normalize and validate the name string (T-011)
 *   - Measure approximate text width at a given font size (T-011)
 *   - Shrink font size until the text fits the box width (T-012)
 *   - Split into two lines when a single line is too long (T-013)
 *   - Export a single `computeLayout` function (T-014)
 *
 * Layout zone (below baked-in fixed text — template.png 1015×1801):
 *   Image:    1015 × 1801 px
 *   Fixed text ends at ~y=1490; name zone starts at y=1520
 *   Box:      x1=50  x2=965  y1=1520  y2=1720
 *   Box size: 915 × 200 px
 *   Center:   x=507, y=1620
 */

import { NameTooLongError } from "./errors";
import { templateConfig } from "./template-config";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Re-export as TEXT_BOX for backward compatibility with any external consumers. */
export const TEXT_BOX = templateConfig.nameArea;

const BASE_FONT_SIZE = templateConfig.font.baseSize;
const MIN_FONT_SIZE = templateConfig.font.minSize;
const MAX_LINES = templateConfig.nameArea.maxLines;

/**
 * Approximate character width ratio for Arabic script at a given font size.
 * Arabic characters are roughly 0.55× the font size wide on average.
 * This is a heuristic sufficient for layout decisions; the SVG renderer
 * handles the actual glyph metrics.
 */
const CHAR_WIDTH_RATIO = 0.55;

/**
 * Arabic combining diacritics (tashkeel, shadda, etc.) — zero advance width.
 * Ranges: U+0610–U+061A (extended Arabic), U+064B–U+065F (tashkeel),
 *         U+0670 (superscript alef), U+06D6–U+06DC (Quranic annotation marks).
 */
const ZERO_WIDTH_ARABIC = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC]/g;

// ─── T-011: Input normalisation & width measurement ───────────────────────────

/**
 * Normalise an Arabic name string:
 *   - trim leading/trailing whitespace
 *   - collapse internal runs of whitespace to a single space
 */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Estimate the pixel width of `text` rendered at `fontSize` px.
 * Arabic diacritics (tashkeel) have near-zero advance width and are excluded
 * from the measurement to avoid unnecessarily small font sizes for voweled names.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  const measurable = text.replace(ZERO_WIDTH_ARABIC, "");
  return measurable.length * fontSize * CHAR_WIDTH_RATIO;
}

// ─── T-012: Font-shrink loop ──────────────────────────────────────────────────

/**
 * Find the largest font size ≥ MIN_FONT_SIZE at which `text` fits within
 * `maxWidth` pixels when rendered on a single line.
 * Returns `null` when even MIN_FONT_SIZE is too large.
 */
export function findFittingFontSize(
  text: string,
  maxWidth: number,
): number | null {
  for (let size = BASE_FONT_SIZE; size >= MIN_FONT_SIZE; size -= 2) {
    if (estimateTextWidth(text, size) <= maxWidth) {
      return size;
    }
  }
  return null;
}

// ─── T-013: Line-break logic ──────────────────────────────────────────────────

/**
 * Split an Arabic name into at most two lines by word boundary.
 * Prefer a balanced split near the middle of the word list.
 * If a two-line split still does not fit, returns null.
 */
export function splitIntoLines(
  name: string,
  maxWidth: number,
): { lines: string[]; fontSize: number } | null {
  const words = name.split(/\s+/);
  if (words.length < 2) return null;

  // Try every split point and pick the one that allows the largest font size
  let bestResult: { lines: string[]; fontSize: number } | null = null;

  for (let splitAt = 1; splitAt < words.length; splitAt++) {
    const line1 = words.slice(0, splitAt).join(" ");
    const line2 = words.slice(splitAt).join(" ");

    const longerLine = line1.length > line2.length ? line1 : line2;
    const size = findFittingFontSize(longerLine, maxWidth);
    if (size === null) continue;

    if (bestResult === null || size > bestResult.fontSize) {
      bestResult = { lines: [line1, line2], fontSize: size };
    }
  }

  return bestResult;
}

// ─── T-014: Main layout function ──────────────────────────────────────────────

export interface TextLayout {
  lines: string[];
  fontSize: number;
  /** Vertical baseline positions for each line, in image coordinates */
  lineYPositions: number[];
  centerX: number;
}

/**
 * Compute the final text layout for an Arabic name within TEXT_BOX.
 * Throws `NameTooLongError` when the name cannot fit under any strategy.
 */
export function computeLayout(rawName: string): TextLayout {
  const name = normalizeName(rawName);
  const { width, centerX, centerY } = TEXT_BOX;

  // Try single line first
  const singleSize = findFittingFontSize(name, width);
  if (singleSize !== null) {
    return {
      lines: [name],
      fontSize: singleSize,
      lineYPositions: [centerY],
      centerX,
    };
  }

  // Try two-line split
  const splitResult = splitIntoLines(name, width);
  if (splitResult !== null && MAX_LINES >= 2) {
    const lineSpacing = Math.round(splitResult.fontSize * 1.25);
    const totalHeight = lineSpacing;
    const topLine = centerY - Math.round(totalHeight / 2);
    return {
      lines: splitResult.lines,
      fontSize: splitResult.fontSize,
      lineYPositions: [topLine, topLine + lineSpacing],
      centerX,
    };
  }

  throw new NameTooLongError();
}
