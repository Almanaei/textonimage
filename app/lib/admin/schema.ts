/**
 * lib/admin/schema.ts — Validation schemas for admin API filters and exports.
 */

import { z } from "zod";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toDateStart(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDateEnd(date: string): Date {
  return new Date(`${date}T23:59:59.999Z`);
}

const DateStringSchema = z
  .string()
  .regex(DATE_ONLY_REGEX, "Date must use YYYY-MM-DD format.");

const DateRangeSchema = z
  .object({
    startDate: DateStringSchema.optional(),
    endDate: DateStringSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.startDate || !value.endDate) {
      return;
    }

    const start = toDateStart(value.startDate);
    const end = toDateEnd(value.endDate);
    if (start.getTime() > end.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startDate must be before or equal to endDate.",
        path: ["startDate"],
      });
    }
  });

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const AdminOverviewQuerySchema = DateRangeSchema;

export const AdminGenerationsQuerySchema = DateRangeSchema.extend({
  success: z.enum(["true", "false"]).optional(),
  errorType: z.string().trim().min(1).max(64).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).merge(PaginationSchema);

export const AdminUsersQuerySchema = DateRangeSchema.extend({
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).merge(PaginationSchema);

export const AdminSessionsQuerySchema = DateRangeSchema.extend({
  sortBy: z.enum(["created_at", "last_seen_at"]).default("last_seen_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).merge(PaginationSchema);

export const AdminReportsQuerySchema = DateRangeSchema.extend({
  includeTrends: z.enum(["true", "false"]).default("true"),
});

export const AdminExportBodySchema = z.object({
  reportType: z.enum(["overview", "generations", "users", "sessions", "full"]),
  format: z.enum(["json", "csv"]),
  filters: DateRangeSchema.extend({
    success: z.enum(["true", "false"]).optional(),
    errorType: z.string().trim().min(1).max(64).optional(),
  }).default({}),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
});

export interface AdminDateRange {
  startAt?: Date;
  endAt?: Date;
}

interface RawQuery {
  [key: string]: string | undefined;
}

function fromSearchParams(searchParams: URLSearchParams): RawQuery {
  return {
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortOrder: searchParams.get("sortOrder") ?? undefined,
    success: searchParams.get("success") ?? undefined,
    errorType: searchParams.get("errorType") ?? undefined,
    includeTrends: searchParams.get("includeTrends") ?? undefined,
  };
}

export function parseOverviewQuery(searchParams: URLSearchParams): z.infer<typeof AdminOverviewQuerySchema> {
  return AdminOverviewQuerySchema.parse(fromSearchParams(searchParams));
}

export function parseGenerationsQuery(
  searchParams: URLSearchParams,
): z.infer<typeof AdminGenerationsQuerySchema> {
  return AdminGenerationsQuerySchema.parse(fromSearchParams(searchParams));
}

export function parseUsersQuery(searchParams: URLSearchParams): z.infer<typeof AdminUsersQuerySchema> {
  return AdminUsersQuerySchema.parse(fromSearchParams(searchParams));
}

export function parseSessionsQuery(
  searchParams: URLSearchParams,
): z.infer<typeof AdminSessionsQuerySchema> {
  return AdminSessionsQuerySchema.parse(fromSearchParams(searchParams));
}

export function parseReportsQuery(searchParams: URLSearchParams): z.infer<typeof AdminReportsQuerySchema> {
  return AdminReportsQuerySchema.parse(fromSearchParams(searchParams));
}

export function toAdminDateRange(input: { startDate?: string; endDate?: string }): AdminDateRange {
  return {
    startAt: input.startDate ? toDateStart(input.startDate) : undefined,
    endAt: input.endDate ? toDateEnd(input.endDate) : undefined,
  };
}

