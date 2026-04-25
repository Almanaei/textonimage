import { describe, it, expect, beforeAll } from "vitest";
import {
  hashAdminPassword,
  parseAdminCredentials,
  verifyAdminCredentials,
  SCRYPT_PARAMS,
} from "@/lib/admin/credentials";

describe("parseAdminCredentials", () => {
  it("returns empty array for empty string", () => {
    expect(parseAdminCredentials("")).toEqual([]);
  });

  it("parses a valid single entry", async () => {
    const { saltHex, hashHex } = await hashAdminPassword("secret");
    const raw = `alice:scrypt:${SCRYPT_PARAMS.N}:${SCRYPT_PARAMS.r}:${SCRYPT_PARAMS.p}:${saltHex}:${hashHex}:admin`;
    const creds = parseAdminCredentials(raw);
    expect(creds).toHaveLength(1);
    expect(creds[0]).toMatchObject({ username: "alice", role: "admin" });
  });

  it("throws on wrong number of fields", () => {
    expect(() => parseAdminCredentials("alice:scrypt:bad")).toThrow(/8 colon-separated/);
  });

  it("throws on unknown role", async () => {
    const { saltHex, hashHex } = await hashAdminPassword("pw");
    const raw = `alice:scrypt:16384:8:1:${saltHex}:${hashHex}:superadmin`;
    expect(() => parseAdminCredentials(raw)).toThrow(/unknown role/i);
  });

  it("throws on unsupported algorithm", async () => {
    const { saltHex, hashHex } = await hashAdminPassword("pw");
    const raw = `alice:bcrypt:16384:8:1:${saltHex}:${hashHex}:admin`;
    expect(() => parseAdminCredentials(raw)).toThrow(/unsupported algorithm/i);
  });
});

describe("verifyAdminCredentials", () => {
  let credentials: ReturnType<typeof parseAdminCredentials>;

  beforeAll(async () => {
    const { saltHex, hashHex } = await hashAdminPassword("correct-password");
    const raw = `alice:scrypt:${SCRYPT_PARAMS.N}:${SCRYPT_PARAMS.r}:${SCRYPT_PARAMS.p}:${saltHex}:${hashHex}:operator`;
    credentials = parseAdminCredentials(raw);
  });

  it("returns ok:true with correct credentials", async () => {
    const result = await verifyAdminCredentials("alice", "correct-password", credentials);
    expect(result).toEqual({ ok: true, role: "operator" });
  });

  it("returns ok:false for wrong password", async () => {
    const result = await verifyAdminCredentials("alice", "wrong-password", credentials);
    expect(result).toEqual({ ok: false });
  });

  it("returns ok:false for unknown username", async () => {
    const result = await verifyAdminCredentials("bob", "correct-password", credentials);
    expect(result).toEqual({ ok: false });
  });

  it("returns ok:false for empty credentials list", async () => {
    const result = await verifyAdminCredentials("alice", "correct-password", []);
    expect(result).toEqual({ ok: false });
  });
});
