/**
 * T-016 — Sharp composite function.
 *
 * Loads the static certificate template (template.png, 1015×1801) and
 * composites the transparent PNG text layer on top, returning the final
 * PNG as a Buffer.
 *
 * Latency optimisations (zero quality loss):
 *  1. Template is flatten+resized ONCE at module load into raw RGBA pixels.
 *     Every subsequent request skips PNG decode, flatten, and Lanczos3 resize.
 *  2. PNG encoding uses compressionLevel 6 — ~3× faster than 9 with only
 *     ~5-10% larger output.  Palette/quantisation removed (was lossy).
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

const TEMPLATE_PATH = path.join(process.cwd(), "public", "assets", "template.png");

type PreparedTemplate = {
  data: Buffer;
  width: number;
  height: number;
  channels: 1 | 2 | 3 | 4;
};

let _prepared: PreparedTemplate | null = null;
let _buildPromise: Promise<PreparedTemplate> | null = null;

async function buildPreparedTemplate(): Promise<PreparedTemplate> {
  try {
    const raw = await fs.readFile(TEMPLATE_PATH);
    const { data, info } = await sharp(raw)
      .flatten({ background: "#8B7355" }) // fill transparent areas with gold-brown
      .resize(2400, null, { kernel: sharp.kernel.lanczos3 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    return {
      data,
      width: info.width,
      height: info.height,
      channels: info.channels as 1 | 2 | 3 | 4,
    };
  } catch (err) {
    console.error("[composite] Failed to prepare template", {
      path: TEMPLATE_PATH,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** Returns the cached prepared template, building it on first call. */
function getPreparedTemplate(): Promise<PreparedTemplate> {
  if (_prepared) return Promise.resolve(_prepared);
  if (!_buildPromise) {
    _buildPromise = buildPreparedTemplate().then((t) => {
      _prepared = t;
      return t;
    });
  }
  return _buildPromise;
}

// Warm up at module load — the first real request pays no resize penalty.
getPreparedTemplate().catch((err) =>
  console.warn("[composite] Template warm-up failed:", err instanceof Error ? err.message : err),
);

/**
 * Composite a pre-built PNG text layer Buffer onto the certificate template.
 * @param textLayer - Transparent PNG Buffer produced by `buildCanvasTextLayer`
 * @returns PNG Buffer of the final composed image
 */
export async function compositeImage(textLayer: Buffer): Promise<Buffer> {
  const tmpl = await getPreparedTemplate();

  return sharp(tmpl.data, {
    raw: { width: tmpl.width, height: tmpl.height, channels: tmpl.channels },
  })
    .composite([{ input: textLayer, top: 0, left: 0, blend: "over" }])
    .png({ compressionLevel: 6 })
    .toBuffer();
}
