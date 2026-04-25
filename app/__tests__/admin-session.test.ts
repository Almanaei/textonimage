import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { signAdminSession, verifyAdminSession } from "@/lib/admin/admin-session";

const TEST_SECRET = "test-secret-that-is-long-enough-for-hmac";

describe("signAdminSession / verifyAdminSession", () => {
  beforeAll(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", TEST_SECRET);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  const payload = { username: "alice", role: "admin" as const, iat: 1700000000000 };

  it("produces a token containing two dot-separated parts", async () => {
    const token = await signAdminSession(payload);
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it("round-trips a payload correctly", async () => {
    const token = await signAdminSession(payload);
    const result = await verifyAdminSession(token);
    expect(result).toEqual(payload);
  });

  it("returns null for a tampered payload", async () => {
    const token = await signAdminSession(payload);
    const dotIndex = token.lastIndexOf(".");
    const encodedPayload = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    // Flip the last char of the encoded payload
    const tampered = encodedPayload.slice(0, -1) + (encodedPayload.endsWith("a") ? "b" : "a");
    const result = await verifyAdminSession(`${tampered}.${sig}`);
    expect(result).toBeNull();
  });

  it("returns null for a tampered signature", async () => {
    const token = await signAdminSession(payload);
    const dotIndex = token.lastIndexOf(".");
    const encodedPayload = token.slice(0, dotIndex);
    const result = await verifyAdminSession(`${encodedPayload}.invalidsignature`);
    expect(result).toBeNull();
  });

  it("returns null for an undefined token", async () => {
    expect(await verifyAdminSession(undefined)).toBeNull();
  });

  it("returns null for an empty string token", async () => {
    expect(await verifyAdminSession("")).toBeNull();
  });

  it("returns null for a token without a dot separator", async () => {
    expect(await verifyAdminSession("nodothere")).toBeNull();
  });

  it("returns null when ADMIN_SESSION_SECRET is not set", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    const result = await verifyAdminSession("any.token");
    expect(result).toBeNull();
    vi.stubEnv("ADMIN_SESSION_SECRET", TEST_SECRET);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signAdminSession(payload);
    vi.stubEnv("ADMIN_SESSION_SECRET", "completely-different-secret-value-here");
    const result = await verifyAdminSession(token);
    expect(result).toBeNull();
    vi.stubEnv("ADMIN_SESSION_SECRET", TEST_SECRET);
  });
});
