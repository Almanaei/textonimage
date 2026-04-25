import { describe, it, expect } from "vitest";
import {
  AdminExportBodySchema,
  parseGenerationsQuery,
  parseOverviewQuery,
  parseSessionsQuery,
  toAdminDateRange,
} from "@/lib/admin/schema";

describe("admin query schemas", () => {
  it("parses overview date range", () => {
    const query = parseOverviewQuery(
      new URLSearchParams({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      }),
    );
    const range = toAdminDateRange(query);
    expect(range.startAt?.toISOString()).toContain("2026-01-01");
    expect(range.endAt?.toISOString()).toContain("2026-01-31");
  });

  it("rejects invalid date format", () => {
    expect(() =>
      parseOverviewQuery(new URLSearchParams({ startDate: "01-01-2026" })),
    ).toThrow(/YYYY-MM-DD/i);
  });

  it("rejects invalid date range ordering", () => {
    expect(() =>
      parseOverviewQuery(
        new URLSearchParams({
          startDate: "2026-02-01",
          endDate: "2026-01-01",
        }),
      ),
    ).toThrow(/before or equal/i);
  });

  it("parses generation query defaults", () => {
    const query = parseGenerationsQuery(new URLSearchParams());
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(25);
    expect(query.sortOrder).toBe("desc");
  });

  it("rejects unsupported sessions sort field", () => {
    expect(() =>
      parseSessionsQuery(new URLSearchParams({ sortBy: "unknown_field" })),
    ).toThrow();
  });
});

describe("AdminExportBodySchema", () => {
  it("accepts valid export body", () => {
    const parsed = AdminExportBodySchema.parse({
      reportType: "overview",
      format: "json",
      filters: {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      },
      page: 1,
      pageSize: 100,
    });

    expect(parsed.reportType).toBe("overview");
    expect(parsed.format).toBe("json");
  });

  it("rejects excessive export page size", () => {
    expect(() =>
      AdminExportBodySchema.parse({
        reportType: "generations",
        format: "csv",
        filters: {},
        page: 1,
        pageSize: 5000,
      }),
    ).toThrow();
  });
});

