/**
 * scripts/create-admin-password.ts
 *
 * CLI helper that generates a hashed password entry for ADMIN_CREDENTIALS.
 *
 * ⚠️  Run from the `app/` directory (or use the npm script below), NOT from
 *     the workspace root.  tsx must find app/tsconfig.json to resolve path
 *     aliases (@/...).
 *
 * Usage (recommended — from the app/ directory):
 *   cd app
 *   npx tsx scripts/create-admin-password.ts <username> <password> <role>
 *
 * Usage (npm script shortcut — also from app/):
 *   cd app
 *   npm run admin:create-password -- <username> <password> <role>
 *
 * Valid roles: viewer, analyst, operator, admin
 *
 * Example:
 *   cd app
 *   npx tsx scripts/create-admin-password.ts alice mysecretpassword admin
 *
 * Copy the printed entry into your .env.local file:
 *   ADMIN_CREDENTIALS=alice:scrypt:16384:8:1:<saltHex>:<hashHex>:admin
 *
 * For multiple admins, separate entries with a comma:
 *   ADMIN_CREDENTIALS=alice:...:admin,bob:...:viewer
 */

import { hashAdminPassword, SCRYPT_PARAMS } from "../lib/admin/credentials";

const VALID_ROLES = new Set(["viewer", "analyst", "operator", "admin"]);

async function main() {
  const [, , username, password, role] = process.argv;

  if (!username || !password || !role) {
    console.error("Usage: npx tsx scripts/create-admin-password.ts <username> <password> <role>");
    console.error("Roles:  viewer | analyst | operator | admin");
    process.exit(1);
  }

  if (!VALID_ROLES.has(role)) {
    console.error(`Error: unknown role "${role}". Valid roles: viewer, analyst, operator, admin`);
    process.exit(1);
  }

  if (password.length < 12) {
    console.warn("Warning: password is shorter than 12 characters. Consider using a stronger password.");
  }

  console.log("Hashing password (this takes ~1 second)…");
  const { saltHex, hashHex } = await hashAdminPassword(password);

  const entry = `${username}:scrypt:${SCRYPT_PARAMS.N}:${SCRYPT_PARAMS.r}:${SCRYPT_PARAMS.p}:${saltHex}:${hashHex}:${role}`;

  console.log("\nAdd this entry to your ADMIN_CREDENTIALS env var:\n");
  console.log(entry);
  console.log("\nFull env line (single user):");
  console.log(`ADMIN_CREDENTIALS=${entry}`);
  console.log("\nAppend to existing (multiple users):");
  console.log(`ADMIN_CREDENTIALS=<existing_entry>,${entry}`);
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
