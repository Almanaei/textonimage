import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip";

function makeRequest(headers: Record<string, string>): NextRequest {
  const req = new NextRequest("http://localhost/api/generate", { method: "POST" });
  for (const [key, value] of Object.entries(headers)) {
    // NextRequest headers are read-only after construction; build via URL trick.
    Object.defineProperty(req.headers, "get", {
      writable: true,
    });
  }
  // Build a request with the desired headers by using a standard Request.
  return new NextRequest(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers,
    }),
  );
}

describe("getClientIp", () => {
  it("prefers x-real-ip over x-forwarded-for", () => {
    const req = makeRequest({
      "x-real-ip": "1.2.3.4",
      "x-forwarded-for": "9.9.9.9, 10.0.0.1",
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to first hop of x-forwarded-for when x-real-ip absent", () => {
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4, 10.0.0.1, 172.16.0.1",
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace from x-real-ip", () => {
    const req = makeRequest({ "x-real-ip": "  5.6.7.8  " });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("trims whitespace from x-forwarded-for first hop", () => {
    const req = makeRequest({ "x-forwarded-for": "  5.6.7.8  , 10.0.0.1" });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("returns null when no IP headers are present", () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBeNull();
  });

  it("returns null for a single-value x-forwarded-for when it is empty", () => {
    const req = makeRequest({ "x-forwarded-for": "" });
    expect(getClientIp(req)).toBeNull();
  });
});
