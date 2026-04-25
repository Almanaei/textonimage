/**
 * lib/read-body.ts — Stream-level request body size enforcement.
 *
 * Reads the request body up to a specified byte limit, enforcing the cap
 * at the stream level even when Content-Length header is absent or omitted
 * by the client.
 */

import { NextRequest } from "next/server";

/**
 * Sentinel returned when the request has no body at all (reader unavailable).
 * Callers distinguish this from `null` (body exceeded the size limit) so they
 * can return 400 for an empty body rather than the misleading 413.
 */
export const EMPTY_BODY = "" as const;

/**
 * Reads the request body up to `limit` bytes, returning the decoded string.
 * Returns `EMPTY_BODY` ("")  when no body is present (no reader available).
 * Returns `null`            when the body exceeds `limit` bytes.
 * Returns the decoded text  on success.
 *
 * Enforces the cap at the stream level even when Content-Length is absent.
 */
export async function readBodyWithLimit(req: NextRequest, limit: number): Promise<string | null> {
  const reader = req.body?.getReader();
  // No body stream — treat as empty, not as oversized.
  if (!reader) return EMPTY_BODY;

  let bytes = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel();
      return null;
    }

    chunks.push(value);
  }

  // Concatenate all chunks into a single buffer
  const total = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    total.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(total);
}
