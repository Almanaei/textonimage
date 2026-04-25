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

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Sanitise and render a certificate for the given Arabic name.
 * @throws {NameTooLongError} when the name cannot fit in the layout zone
 */
export async function generateCertificate(
  input: GenerateInput,
): Promise<Buffer> {
  const { name } = sanitize(input);

  // Prepend fixed prefix so the layout engine sizes and wraps the full phrase
  const displayText = `مع تحيّات ${name}`;
  const layout = computeLayout(displayText);
  const svgLayer = buildCanvasTextLayer(layout);
  const pngBuffer = await compositeImage(svgLayer);

  return pngBuffer;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sanitize(input: GenerateInput): GenerateInput {
  return {
    name: input.name.trim().replace(/\s+/g, " "),
    email: input.email.trim().toLowerCase(),
  };
}
