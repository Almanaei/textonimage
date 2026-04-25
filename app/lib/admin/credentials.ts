/**
 * lib/admin/credentials.ts — Username/password verification for admin login.
 *
 * Credentials are stored in the ADMIN_CREDENTIALS environment variable:
 *   ADMIN_CREDENTIALS=alice:scrypt:16384:8:1:<saltHex>:<hashHex>:admin,bob:...:viewer
 *
 * Each entry format: username:scrypt:N:r:p:saltHex:hashHex:role
 *
 * Generate entries with: npx tsx scripts/create-admin-password.ts <user> <pass> <role>
 *
 * Passwords are verified with Node's built-in crypto.scrypt — no extra dependency.
 */

import { scrypt, timingSafeEqual } from "crypto";
import type { AdminRole } from "@/lib/admin/auth";

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/** Scrypt parameters used when generating hashes. */
export const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

interface StoredCredential {
  username: string;
  saltHex: string;
  hashHex: string;
  N: number;
  r: number;
  p: number;
  role: AdminRole;
}

const VALID_ROLES = new Set<AdminRole>(["viewer", "analyst", "operator", "admin"]);

export function parseAdminCredentials(raw: string): StoredCredential[] {
  if (!raw.trim()) return [];

  const result: StoredCredential[] = [];
  for (const chunk of raw.split(",")) {
    const entry = chunk.trim();
    if (!entry) continue;

    // Format: username:scrypt:N:r:p:saltHex:hashHex:role
    const parts = entry.split(":");
    if (parts.length !== 8) {
      throw new Error(
        `ADMIN_CREDENTIALS entry "${entry.slice(0, 20)}..." must have 8 colon-separated fields (username:scrypt:N:r:p:saltHex:hashHex:role).`,
      );
    }

    const [username, algo, N, r, p, saltHex, hashHex, maybeRole] = parts;

    if (algo !== "scrypt") {
      throw new Error(`ADMIN_CREDENTIALS: unsupported algorithm "${algo}" for user "${username}".`);
    }
    if (!username) throw new Error("ADMIN_CREDENTIALS: empty username.");
    if (!saltHex || !hashHex) throw new Error(`ADMIN_CREDENTIALS: missing salt or hash for user "${username}".`);
    if (!VALID_ROLES.has(maybeRole as AdminRole)) {
      throw new Error(`ADMIN_CREDENTIALS: unknown role "${maybeRole}" for user "${username}".`);
    }

    result.push({
      username,
      saltHex,
      hashHex,
      N: Number(N),
      r: Number(r),
      p: Number(p),
      role: maybeRole as AdminRole,
    });
  }

  return result;
}

// Parse once at module load. Will throw at startup if the format is wrong.
const ADMIN_CREDENTIALS = parseAdminCredentials(process.env.ADMIN_CREDENTIALS ?? "");

if (ADMIN_CREDENTIALS.length === 0) {
  console.warn("[admin] ADMIN_CREDENTIALS is empty. Admin login will reject all attempts.");
}

/**
 * Verify a username/password pair against the configured credentials.
 * Always runs scrypt even for unknown usernames to prevent timing-based
 * username enumeration.
 *
 * Returns the user's role on success, or { ok: false } on failure.
 */
export async function verifyAdminCredentials(
  username: string,
  password: string,
  credentials: StoredCredential[] = ADMIN_CREDENTIALS,
): Promise<{ ok: true; role: AdminRole } | { ok: false }> {
  const cred = credentials.find((c) => c.username.toLowerCase() === username.toLowerCase());

  // Always run a scrypt derivation even when no match is found so the response
  // time is indistinguishable between "unknown username" and "wrong password".
  const salt = Buffer.from(cred?.saltHex ?? "0".repeat(32), "hex");
  const N = cred?.N ?? SCRYPT_PARAMS.N;
  const r = cred?.r ?? SCRYPT_PARAMS.r;
  const p = cred?.p ?? SCRYPT_PARAMS.p;

  const derived = (await scryptAsync(password, salt, SCRYPT_PARAMS.keylen, { N, r, p })) as Buffer;

  if (!cred) return { ok: false };

  const stored = Buffer.from(cred.hashHex, "hex");
  if (derived.length !== stored.length) return { ok: false };

  const match = timingSafeEqual(derived, stored);
  return match ? { ok: true, role: cred.role } : { ok: false };
}

/**
 * Hash a plain-text password for storage in ADMIN_CREDENTIALS.
 * Used by the create-admin-password.ts script.
 */
export async function hashAdminPassword(password: string): Promise<{ saltHex: string; hashHex: string }> {
  const { randomBytes } = await import("crypto");
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  })) as Buffer;
  return { saltHex: salt.toString("hex"), hashHex: hash.toString("hex") };
}
