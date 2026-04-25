import { describe, it, expect } from "vitest";
import {
  normalizeName,
  estimateTextWidth,
  findFittingFontSize,
  splitIntoLines,
  computeLayout,
} from "@/lib/layout";
import { NameTooLongError } from "@/lib/errors";

describe("normalizeName", () => {
  it("trims leading/trailing whitespace", () => {
    expect(normalizeName("  سالم  ")).toBe("سالم");
  });

  it("collapses multiple internal spaces", () => {
    expect(normalizeName("سالم   أحمد")).toBe("سالم أحمد");
  });

  it("replaces tabs and newlines with single space", () => {
    expect(normalizeName("سالم\tأحمد\nالمناعي")).toBe("سالم أحمد المناعي");
  });

  it("leaves already-clean text unchanged", () => {
    expect(normalizeName("سالم المناعي")).toBe("سالم المناعي");
  });
});

describe("estimateTextWidth", () => {
  it("returns a positive number for normal text", () => {
    const width = estimateTextWidth("سالم", 80);
    expect(width).toBeGreaterThan(0);
  });

  it("excludes Arabic diacritics (tashkeel) from width", () => {
    // سَالِم has diacritics on some chars — width should equal "سالم" width
    const withDiacritics = estimateTextWidth("سَالِم", 80);
    const withoutDiacritics = estimateTextWidth("سالم", 80);
    expect(withDiacritics).toBe(withoutDiacritics);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTextWidth("", 80)).toBe(0);
  });

  it("scales linearly with font size", () => {
    const w1 = estimateTextWidth("سالم", 40);
    const w2 = estimateTextWidth("سالم", 80);
    expect(w2).toBeCloseTo(w1 * 2, 5);
  });
});

describe("findFittingFontSize", () => {
  it("returns base size for short text", () => {
    // A single short Arabic word should fit at base size (80)
    const result = findFittingFontSize("فاطمة", 915);
    expect(result).toBe(80);
  });

  it("returns smaller size for longer text", () => {
    const result = findFittingFontSize("عبدالرحمن محمد عبدالله الخالدي", 915);
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(80);
  });

  it("returns null when text cannot fit even at min size", () => {
    // Extremely long text that won't fit at 36px
    const veryLong = "عبدالرحمن ".repeat(50).trim();
    const result = findFittingFontSize(veryLong, 915);
    expect(result).toBeNull();
  });

  it("returns a size >= minSize (36) or null", () => {
    const result = findFittingFontSize("سالم", 915);
    if (result !== null) {
      expect(result).toBeGreaterThanOrEqual(36);
      expect(result).toBeLessThanOrEqual(80);
    }
  });
});

describe("splitIntoLines", () => {
  it("returns null for a single word", () => {
    expect(splitIntoLines("سالم", 915)).toBeNull();
  });

  it("splits two words into two lines", () => {
    const result = splitIntoLines("سالم أحمد", 915);
    expect(result).not.toBeNull();
    expect(result!.lines).toEqual(["سالم", "أحمد"]);
    expect(result!.fontSize).toBeGreaterThanOrEqual(36);
  });

  it("finds best split point for three words", () => {
    const result = splitIntoLines("سالم أحمد المناعي", 915);
    expect(result).not.toBeNull();
    expect(result!.lines).toHaveLength(2);
    // Should split into two parts that cover all words
    expect(result!.lines.join(" ")).toBe("سالم أحمد المناعي");
  });

  it("returns null when no split fits", () => {
    const veryLong = "عبدالرحمن ".repeat(50).trim();
    expect(splitIntoLines(veryLong, 915)).toBeNull();
  });
});

describe("computeLayout", () => {
  it("returns single-line layout for a short name", () => {
    const layout = computeLayout("فاطمة");
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0]).toBe("فاطمة");
    expect(layout.fontSize).toBe(80);
    expect(layout.centerX).toBe(508);
  });

  it("returns two-line layout for a long name", () => {
    // At minSize 36, max ~46 chars fit in 915px. Use 50+ chars to force two lines.
    const longName = "عبدالرحمن محمد عبدالله إبراهيم الخالدي النعيمي الشمري";
    const layout = computeLayout(longName);
    expect(layout.lines).toHaveLength(2);
    expect(layout.lineYPositions).toHaveLength(2);
  });

  it("throws NameTooLongError for unresolvable names", () => {
    const veryLong = "عبدالرحمن ".repeat(50).trim();
    expect(() => computeLayout(veryLong)).toThrow(NameTooLongError);
  });

  it("normalizes whitespace before layout", () => {
    const layout = computeLayout("  سالم   المناعي  ");
    expect(layout.lines[0]).toBe("سالم المناعي");
  });
});
