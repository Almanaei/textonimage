/**
 * T-017 — Generate-image orchestrator.
 *
 * Single entry point that coordinates:
 *   1. Input sanitisation
 *   2. Layout computation
 *   3. SVG text layer construction
 *   4. Sharp compositing
 *
 * Input validation (email format, Arabic regex, min/max length) is enforced
 * upstream by GenerateSchema (Zod) in the route handler before this function
 * is called. Only sanitisation (trim/collapse whitespace) is repeated here
 * to guarantee clean input regardless of call site (e.g. test scripts).
 *
 * Returns the final PNG as a Node.js Buffer.
 */

import { computeLayout } from "./layout";
import { buildCanvasTextLayer } from "./canvas-layer";
import { compositeImage } from "./composite";
import type { GenerateInput } from "./schema";

export type { GenerateInput };

// ─── LRU image cache ──────────────────────────────────────────────────────────

/**
 * Bounded in-memory cache for generated certificate PNGs.
 * Key: normalized display text (same text → identical image).
 * Eviction: LRU — Map insertion order is preserved in V8; delete+re-insert
 * moves an entry to the tail so the head is always the least recently used.
 */
const CACHE_MAX = 200;
const _imageCache = new Map<string, Buffer>();

function getCached(key: string): Buffer | undefined {
  const hit = _imageCache.get(key);
  if (hit !== undefined) {
    _imageCache.delete(key);
    _imageCache.set(key, hit);
  }
  return hit;
}

function putCache(key: string, buf: Buffer): void {
  if (_imageCache.size >= CACHE_MAX) {
    _imageCache.delete(_imageCache.keys().next().value!);
  }
  _imageCache.set(key, buf);
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Sanitise and render a certificate for the given Arabic name.
 * Results are cached in-process so repeated requests for the same name
 * are served from memory without re-rendering.
 * @throws {NameTooLongError} when the name cannot fit in the layout zone
 */
export async function generateCertificate(
  input: GenerateInput,
): Promise<Buffer> {
  const { name } = sanitize(input);

  const displayText = name;

  const cached = getCached(displayText);
  if (cached) return cached;

  const layout = computeLayout(displayText);
  const textLayer = buildCanvasTextLayer(layout);
  const pngBuffer = await compositeImage(textLayer);

  putCache(displayText, pngBuffer);
  return pngBuffer;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sanitize(input: GenerateInput): GenerateInput {
  return {
    name: input.name.trim().replace(/\s+/g, " "),
    email: input.email.trim().toLowerCase(),
  };
}
