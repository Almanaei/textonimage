import { describe, it, expect } from "vitest";
import { NameTooLongError, ValidationError } from "@/lib/errors";

describe("NameTooLongError", () => {
  it("has default Arabic message", () => {
    const err = new NameTooLongError();
    expect(err.message).toBe(
      "الاسم طويل جداً ولا يمكن احتواؤه في المساحة المتاحة",
    );
  });

  it("accepts custom message", () => {
    const err = new NameTooLongError("custom");
    expect(err.message).toBe("custom");
  });

  it('has name "NameTooLongError"', () => {
    const err = new NameTooLongError();
    expect(err.name).toBe("NameTooLongError");
  });

  it("is instanceof Error", () => {
    expect(new NameTooLongError()).toBeInstanceOf(Error);
  });
});

describe("ValidationError", () => {
  it("stores message and field", () => {
    const err = new ValidationError("bad input", "name");
    expect(err.message).toBe("bad input");
    expect(err.field).toBe("name");
  });

  it('has name "ValidationError"', () => {
    const err = new ValidationError("x", "y");
    expect(err.name).toBe("ValidationError");
  });

  it("is instanceof Error", () => {
    expect(new ValidationError("x", "y")).toBeInstanceOf(Error);
  });
});
