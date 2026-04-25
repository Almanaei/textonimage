/**
 * T-015 — Canvas text layer builder.
 *
 * Produces a transparent PNG Buffer (matching the template dimensions) with
 * the Arabic name rendered using the bundled Arabic font via @napi-rs/canvas
 * (Skia + HarfBuzz). This approach works on Windows where librsvg/Sharp
 * cannot load custom @font-face fonts at runtime.
 *
 * Note: despite the original file name "svg-layer", this module uses a rasterised
 * canvas pipeline — NOT an SVG overlay — and emits a PNG buffer.
 */

import path from "path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import type { TextLayout } from "./layout";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Native template dimensions */
const NATIVE_WIDTH = 1015;
const NATIVE_HEIGHT = 1801;
/** Final output width (PRD §4.5 — print-ready ~2400px) */
const OUTPUT_WIDTH = 2400;
/** Scale factor so text is rasterised at output resolution, not upscaled */
const SCALE = OUTPUT_WIDTH / NATIVE_WIDTH; // ≈ 2.364
const OUTPUT_HEIGHT = Math.round(NATIVE_HEIGHT * SCALE);
/** White text matching the reference output */
const TEXT_COLOR = "#FFFFFF";
const FONT_FAMILY = "ArabicCert";
const FONT_PATH = path.join(process.cwd(), "public", "assets", "Arabic.ttf");

// Register the font once per process (path keyed so hot-reload picks up changes)
let _registeredFontPath = "";
function ensureFontRegistered(): void {
  if (_registeredFontPath !== FONT_PATH) {
    GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
    _registeredFontPath = FONT_PATH;
  }
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Build a transparent PNG Buffer at OUTPUT_WIDTH × OUTPUT_HEIGHT.
 * All layout coordinates (fontSize, centerX, lineYPositions) come from
 * the 1015-px layout engine and are scaled up by SCALE so text is
 * rasterised at full output resolution — never upscaled.
 */
export function buildCanvasTextLayer(layout: TextLayout): Buffer {
  ensureFontRegistered();

  const canvas = createCanvas(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";

  const scaledFontSize = layout.fontSize * SCALE;
  const scaledCenterX = layout.centerX * SCALE;

  for (let i = 0; i < layout.lines.length; i++) {
    const line = layout.lines[i];
    const scaledY = layout.lineYPositions[i] * SCALE;
    ctx.font = `bold ${scaledFontSize}px "${FONT_FAMILY}"`;
    ctx.fillText(line, scaledCenterX, scaledY);
  }

  return canvas.toBuffer("image/png");
}
