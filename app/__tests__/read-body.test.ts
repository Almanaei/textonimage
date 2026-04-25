import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { readBodyWithLimit, EMPTY_BODY } from "@/lib/read-body";

function makeRequestWithBody(body: string | null): NextRequest {
  if (body === null) {
    // Request with no body (GET-style, body is null).
    return new NextRequest(
      new Request("http://localhost/api/generate", { method: "POST" }),
    );
  }
  return new NextRequest(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
}

describe("readBodyWithLimit", () => {
  it("returns EMPTY_BODY ('') for a request with no body", async () => {
    const req = makeRequestWithBody(null);
    const result = await readBodyWithLimit(req, 1024);
    expect(result).toBe(EMPTY_BODY);
    expect(result).toBe("");
  });

  it("returns the body string when within the limit", async () => {
    const payload = JSON.stringify({ name: "سالم", email: "test@example.com" });
    const req = makeRequestWithBody(payload);
    const result = await readBodyWithLimit(req, 1024);
    expect(result).toBe(payload);
  });

  it("returns null when body exceeds the limit", async () => {
    const largeBody = "x".repeat(2048);
    const req = makeRequestWithBody(largeBody);
    const result = await readBodyWithLimit(req, 1024);
    expect(result).toBeNull();
  });

  it("accepts a body exactly at the limit", async () => {
    const exactBody = "a".repeat(1024);
    const req = makeRequestWithBody(exactBody);
    const result = await readBodyWithLimit(req, 1024);
    expect(result).toBe(exactBody);
  });

  it("returns null for a body one byte over the limit", async () => {
    const overBody = "a".repeat(1025);
    const req = makeRequestWithBody(overBody);
    const result = await readBodyWithLimit(req, 1024);
    expect(result).toBeNull();
  });
});
