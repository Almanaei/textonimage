/**
 * T-010 — Custom error classes for the image generation pipeline.
 */

export class NameTooLongError extends Error {
  constructor(message = "الاسم طويل جداً ولا يمكن احتواؤه في المساحة المتاحة") {
    super(message);
    this.name = "NameTooLongError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
