/**
 * lib/admin/admin-session.ts — HMAC-signed browser session cookie for the admin dashboard.
 *
 * Uses the Web Crypto API (crypto.subtle) so this module works in both the
 * Next.js Edge Runtime (proxy.ts) and the Node.js runtime (route handlers).
 *
 * Cookie name : admin_session
 * Cookie flags: HttpOnly, SameSite=Strict, Secure (production only), no Max-Age (browser session)
 *
 * Token format: <base64url(JSON payload)>.<base64url(HMAC-SHA256 signature)>
 *
 * Payload: { username, role, iat }
 *
 * Signing key: ADMIN_SESSION_SECRET env var (must be ≥ 32 chars in production).
 */

import type { AdminRole } from "@/lib/admin/auth";

export const ADMIN_SESSION_COOKIE = "admin_session";

export interface AdminSessionPayload {
  username: string;
  role: AdminRole;
  iat: number; // issued-at unix ms
}

// ── Base64URL helpers ─────────────────────────────────────────────────────────

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const padded2 = pad ? padded + "=".repeat(4 - pad) : padded;
  return Buffer.from(padded2, "base64").toString("utf8");
}

function base64UrlToArrayBuffer(input: string): ArrayBuffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const padded2 = pad ? padded + "=".repeat(4 - pad) : padded;
  const binary = atob(padded2);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buf;
}

// ── Web Crypto key import ─────────────────────────────────────────────────────

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", keyMaterial, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

// ── Key validation ─────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (!secret) {
    console.warn("[admin] ADMIN_SESSION_SECRET is not set. Admin session signing will fail.");
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters in production.");
  }
  return secret;
}

// ── Sign / Verify ─────────────────────────────────────────────────────────────

/**
 * Sign a payload and return a token string suitable for storing in a cookie.
 */
export async function signAdminSession(payload: AdminSessionPayload): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured.");

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const key = await importHmacKey(secret);
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload)),
  );
  const signature = uint8ToBase64Url(sigBytes);
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify a cookie token string.
 * Returns the payload on success, or null if the token is missing, malformed,
 * or has an invalid signature.
 */
export async function verifyAdminSession(token: string | undefined): Promise<AdminSessionPayload | null> {
  if (!token) return null;

  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (!secret) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encodedPayload = token.slice(0, dotIndex);
  const providedSig = token.slice(dotIndex + 1);

  try {
    const key = await importHmacKey(secret);
    const sigBuf = base64UrlToArrayBuffer(providedSig);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuf,
      new TextEncoder().encode(encodedPayload),
    );
    if (!isValid) return null;

    const payload = JSON.parse(fromBase64Url(encodedPayload)) as AdminSessionPayload;
    if (!payload.username || !payload.role || !payload.iat) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Cookie attribute helpers ──────────────────────────────────────────────────

/**
 * Returns cookie attributes for setting the admin session cookie.
 * No Max-Age → cookie expires when the browser session ends.
 */
export function adminSessionCookieOptions(): {
  httpOnly: boolean;
  sameSite: "strict";
  secure: boolean;
  path: string;
} {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
