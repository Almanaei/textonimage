/**
 * T-009 — Central template configuration.
 *
 * Single source of truth for all layout-affecting constants:
 * template dimensions, name bounding box, and font settings.
 *
 * Values derived from:
 *   - Template dimensions: 1015 × 1801 px
 *   - Fixed text baked in at y≈1350–1490; name zone placed below at y=1520–1720
 */

export const templateConfig = {
  template: {
    path: "public/assets/template.png",
    width: 1015,
    height: 1801,
  },
  nameArea: {
    // Below the baked-in fixed text (which ends at ~y=1490)
    x1: 50,
    x2: 965,
    y1: 1520,
    y2: 1720,
    /** Derived: x2 - x1 */
    get width() {
      return this.x2 - this.x1; // 915
    },
    /** Derived: y2 - y1 */
    get height() {
      return this.y2 - this.y1; // 200
    },
    /** Derived: horizontal center */
    get centerX() {
      return Math.round((this.x1 + this.x2) / 2); // 507
    },
    /** Derived: vertical center */
    get centerY() {
      return Math.round((this.y1 + this.y2) / 2); // 1620
    },
    align: "center" as const,
    direction: "rtl" as const,
    maxLines: 2,
  },
  font: {
    path: "public/assets/Arabic.ttf",
    /** Text color — white to match the reference output */
    color: "#FFFFFF" as const,
    /** Starting font size before shrink loop */
    baseSize: 80,
    /** Smallest acceptable font size */
    minSize: 36,
    /** Line height multiplier for two-line layouts */
    lineHeight: 1.25,
  },
} as const;

export type TemplateConfig = typeof templateConfig;
