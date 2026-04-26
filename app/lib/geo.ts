/**
 * lib/geo.ts — Extracts visitor geo-location from Cloudflare request headers.
 *
 * Cloudflare automatically injects these on every proxied request:
 *   cf-ipcountry — ISO 3166-1 alpha-2 country code  (e.g. "BH", "US")
 *   cf-ipcity    — City name                         (e.g. "Manama")
 *
 * Special Cloudflare sentinel values that indicate "unknown":
 *   "XX" — IP is in a country Cloudflare doesn't know
 *   "T1" — IP is via the Tor network
 *
 * When running locally or without Cloudflare the headers are absent and
 * both fields return null — callers must treat null as "unknown".
 */

import { NextRequest } from "next/server";

export interface GeoLocation {
  countryCode: string | null;
  city: string | null;
}

const UNKNOWN_SENTINELS = new Set(["XX", "T1", ""]);

export function getGeoLocation(req: NextRequest): GeoLocation {
  const raw = req.headers.get("cf-ipcountry");
  const countryCode = raw && !UNKNOWN_SENTINELS.has(raw) ? raw.toUpperCase() : null;

  const rawCity = req.headers.get("cf-ipcity");
  const city = rawCity?.trim() || null;

  return { countryCode, city };
}
