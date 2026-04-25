/**
 * T-009 — Central template configuration.
 *
 * Single source of truth for all layout-affecting constants:
 * template dimensions, name bounding box, and font settings.
 *
 * Values derived from:
 *   - Template dimensions: 1015 × 1801 px
 *   - Fixed text baked in at y≈1350–1490; name zone placed below at y=1490–1620
 *   - QR code occupies bottom-right corner from y≈1630, x≈833–944
 */

export const templateConfig = {
  template: {
    path: "public/assets/template.png",
    width: 1015,
    height: 1801,
  },
  nameArea: {
    // Between baked-in text end (~y=1490) and QR code start (~y=1630)
    x1: 50,
    x2: 965,
    y1: 1490,
    y2: 1620,
    /** Derived: x2 - x1 */
    get width() {
      return this.x2 - this.x1; // 915
    },
    /** Derived: y2 - y1 */
    get height() {
      return this.y2 - this.y1; // 130
    },
    /** Derived: horizontal center */
    get centerX() {
      return Math.round((this.x1 + this.x2) / 2); // 507
    },
    /** Derived: vertical center */
    get centerY() {
      return Math.round((this.y1 + this.y2) / 2); // 1555
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
  /**
   * QR code overlay — sourced from public/assets/qrcode.png (1015×1801).
   * sourceCrop: bounding box of the actual content inside qrcode.png
   *   (6 px padding added around the detected content region y=659–1119, x=246–761)
   * target: where to place the resized QR in native template coordinates (1015×1801)
   *   right-aligned 15 px from edge, starting just below the name area (y=1630)
   */
  qr: {
    path: "public/assets/qrcode.png",
    sourceCrop: { left: 240, top: 653, width: 531, height: 472 },
    target: { left: 885, top: 1650, width: 110, height: 98 },
  },
} as const;

export type TemplateConfig = typeof templateConfig;
