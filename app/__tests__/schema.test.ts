import { describe, it, expect } from "vitest";
import { GenerateSchema, TrackEventSchema } from "@/lib/schema";

describe("GenerateSchema", () => {
  it("accepts valid Arabic name and email", () => {
    const result = GenerateSchema.safeParse({
      name: "سالم المناعي",
      email: "salem@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = GenerateSchema.safeParse({
      name: "س",
      email: "test@example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameErr = result.error.issues.find((i) => i.path[0] === "name");
      expect(nameErr).toBeDefined();
      expect(nameErr!.message).toContain("حرفين");
    }
  });

  it("rejects name longer than 60 chars", () => {
    const longName = "س".repeat(61);
    const result = GenerateSchema.safeParse({
      name: longName,
      email: "test@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-Arabic characters in name", () => {
    const result = GenerateSchema.safeParse({
      name: "John Smith",
      email: "test@example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameErr = result.error.issues.find((i) => i.path[0] === "name");
      expect(nameErr!.message).toContain("العربية");
    }
  });

  it("rejects invalid email", () => {
    const result = GenerateSchema.safeParse({
      name: "سالم المناعي",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailErr = result.error.issues.find((i) => i.path[0] === "email");
      expect(emailErr).toBeDefined();
    }
  });

  it("normalizes email to lowercase and trims", () => {
    const result = GenerateSchema.parse({
      name: "سالم المناعي",
      email: "  Test@Example.COM  ",
    });
    expect(result.email).toBe("test@example.com");
  });

  it("trims name whitespace", () => {
    const result = GenerateSchema.parse({
      name: "  سالم  ",
      email: "test@example.com",
    });
    expect(result.name).toBe("سالم");
  });
});

describe("TrackEventSchema", () => {
  const validTypes = [
    "page_view",
    "generation_requested",
    "generation_success",
    "generation_error",
    "download_clicked",
    "rate_limited",
  ];

  it.each(validTypes)("accepts event type: %s", (eventType) => {
    const result = TrackEventSchema.safeParse({ eventType });
    expect(result.success).toBe(true);
  });

  it("rejects unknown event type", () => {
    const result = TrackEventSchema.safeParse({ eventType: "unknown_event" });
    expect(result.success).toBe(false);
  });

  it("accepts optional metadata", () => {
    const result = TrackEventSchema.safeParse({
      eventType: "generation_success",
      metadata: { duration: 1234 },
    });
    expect(result.success).toBe(true);
  });

  it("works without metadata", () => {
    const result = TrackEventSchema.safeParse({
      eventType: "page_view",
    });
    expect(result.success).toBe(true);
  });
});
