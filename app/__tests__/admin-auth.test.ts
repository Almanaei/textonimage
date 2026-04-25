import { describe, it, expect } from "vitest";
import {
  _resetAdminAuthStore,
  authorizeAdminToken,
  checkAdminAuthRateLimit,
  parseAdminApiKeys,
} from "@/lib/admin/auth";

describe("parseAdminApiKeys", () => {
  it("parses role-token pairs", () => {
    const principals = parseAdminApiKeys("viewer:token-a,operator:token-b");
    expect(principals).toHaveLength(2);
    expect(principals[0]).toMatchObject({ role: "viewer" });
    expect(principals[1]).toMatchObject({ role: "operator" });
  });

  it("rejects malformed entries", () => {
    expect(() => parseAdminApiKeys("viewer-only")).toThrow(/role:token/i);
  });
});

describe("authorizeAdminToken", () => {
  const principals = parseAdminApiKeys(
    "viewer:viewer-secret-token-1234567890123456,operator:operator-secret-token-12345678901234",
  );

  it("returns 401 when auth header is missing", () => {
    const result = authorizeAdminToken(null, "admin:read", principals);
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("allows read access for viewer", () => {
    const result = authorizeAdminToken(
      "Bearer viewer-secret-token-1234567890123456",
      "admin:read",
      principals,
    );
    expect(result).toEqual({ ok: true, context: { role: "viewer" } });
  });

  it("returns 403 when role lacks permission", () => {
    const result = authorizeAdminToken(
      "Bearer viewer-secret-token-1234567890123456",
      "admin:export",
      principals,
    );
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it("returns 401 for unknown token", () => {
    const result = authorizeAdminToken(
      "Bearer not-configured-token",
      "admin:read",
      principals,
    );
    expect(result).toEqual({ ok: false, status: 401 });
  });
});

describe("checkAdminAuthRateLimit", () => {
  it("allows attempts under the threshold", () => {
    _resetAdminAuthStore();
    expect(checkAdminAuthRateLimit("client:test")).toBe(true);
    expect(checkAdminAuthRateLimit("client:test")).toBe(true);
  });

  it("blocks after threshold is exceeded", () => {
    _resetAdminAuthStore();
    for (let i = 0; i < 30; i++) {
      expect(checkAdminAuthRateLimit("client:test")).toBe(true);
    }
    expect(checkAdminAuthRateLimit("client:test")).toBe(false);
  });
});

describe("authorizeAdminToken — timing-safe comparison", () => {
  const principals = parseAdminApiKeys(
    "viewer:viewer-secret-token-1234567890123456",
  );

  it("accepts the exact matching token", () => {
    const result = authorizeAdminToken(
      "Bearer viewer-secret-token-1234567890123456",
      "admin:read",
      principals,
    );
    expect(result).toEqual({ ok: true, context: { role: "viewer" } });
  });

  it("rejects a token that is a prefix of the correct token", () => {
    const result = authorizeAdminToken(
      "Bearer viewer-secret-token-123456789",
      "admin:read",
      principals,
    );
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("rejects a token that is the correct token with extra chars appended", () => {
    const result = authorizeAdminToken(
      "Bearer viewer-secret-token-1234567890123456EXTRA",
      "admin:read",
      principals,
    );
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("rejects an empty string token", () => {
    const result = authorizeAdminToken("Bearer ", "admin:read", principals);
    expect(result).toEqual({ ok: false, status: 401 });
  });
});
