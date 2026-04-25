import { describe, it, expect } from "vitest";
import {
  ARABIC_NAME_PATTERN,
  EMAIL_PATTERN,
  NAME_MAX_LENGTH,
} from "@/lib/client-constants";

describe("ARABIC_NAME_PATTERN", () => {
  it("matches Arabic text", () => {
    expect(ARABIC_NAME_PATTERN.test("سالم المناعي")).toBe(true);
  });

  it("matches Arabic with spaces", () => {
    expect(ARABIC_NAME_PATTERN.test("محمد عبدالله")).toBe(true);
  });

  it("rejects English text", () => {
    expect(ARABIC_NAME_PATTERN.test("John Smith")).toBe(false);
  });

  it("rejects mixed Arabic and English", () => {
    expect(ARABIC_NAME_PATTERN.test("سالم Saleh")).toBe(false);
  });

  it("rejects numbers", () => {
    expect(ARABIC_NAME_PATTERN.test("سالم123")).toBe(false);
  });
});

describe("EMAIL_PATTERN", () => {
  it("matches valid email", () => {
    expect(EMAIL_PATTERN.test("user@example.com")).toBe(true);
  });

  it("rejects missing @", () => {
    expect(EMAIL_PATTERN.test("userexample.com")).toBe(false);
  });

  it("rejects missing domain", () => {
    expect(EMAIL_PATTERN.test("user@")).toBe(false);
  });

  it("rejects spaces", () => {
    expect(EMAIL_PATTERN.test("user @example.com")).toBe(false);
  });
});

describe("NAME_MAX_LENGTH", () => {
  it("equals 60", () => {
    expect(NAME_MAX_LENGTH).toBe(60);
  });
});
