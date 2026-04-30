"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminApiError,
  exportAdminReport,
  fetchAdminGenerations,
  fetchAdminLocations,
  fetchAdminOverview,
  fetchAdminReport,
  fetchAdminSessions,
  fetchAdminUsers,
  resetAdminData,
} from "../_lib/api-client";
import {
  AdminDateFilter,
  AdminExportFormat,
  AdminGenerationPage,
  AdminLocationSummary,
  AdminOverview,
  AdminReportPayload,
  AdminReportType,
  AdminSessionsPage,
  AdminUsersSummary,
} from "../_lib/contracts";

interface DashboardQuery {
  filters: AdminDateFilter;
  generationPage: number;
  generationPageSize: number;
  generationSortOrder: "asc" | "desc";
  generationSuccess: "all" | "true" | "false";
  generationErrorType: string;
  usersPage: number;
  usersPageSize: number;
  usersSortOrder: "asc" | "desc";
  sessionsPage: number;
  sessionsPageSize: number;
  sessionsSortOrder: "asc" | "desc";
  sessionsSortBy: "created_at" | "last_seen_at";
}

const DEFAULT_QUERY: DashboardQuery = {
  filters: {},
  generationPage: 1,
  generationPageSize: 25,
  generationSortOrder: "desc",
  generationSuccess: "all",
  generationErrorType: "",
  usersPage: 1,
  usersPageSize: 25,
  usersSortOrder: "desc",
  sessionsPage: 1,
  sessionsPageSize: 25,
  sessionsSortOrder: "desc",
  sessionsSortBy: "last_seen_at",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function statusTone(status: "healthy" | "degraded" | "down"): string {
  if (status === "healthy") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
  if (status === "degraded") return "bg-amber-500/20 text-amber-300 border-amber-500/50";
  return "bg-red-500/20 text-red-300 border-red-500/50";
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_40px_-20px_rgba(0,0,0,0.65)]">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${accent}`}>{value}</p>
    </article>
  );
}

function PaginationControls({
  page,
  pageSize,
  total,
  onPrev,
  onNext,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange: (next: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span>
          Page {page} / {totalPages}
        </span>
        <span>{formatNumber(total)} rows</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs uppercase tracking-[0.12em] text-slate-400">Rows</label>
        <select
          className="h-10 rounded-xl border border-white/15 bg-slate-950 px-2 text-slate-100 outline-none focus:border-cyan-400"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="h-10 min-w-20 rounded-xl border border-white/15 bg-white/5 px-4 font-medium text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="h-10 min-w-20 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 font-medium text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboardApp() {
  const router = useRouter();

  const [query, setQuery] = useState<DashboardQuery>(DEFAULT_QUERY);
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [draftSuccess, setDraftSuccess] = useState<DashboardQuery["generationSuccess"]>("all");
  const [draftErrorType, setDraftErrorType] = useState("");

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [generations, setGenerations] = useState<AdminGenerationPage | null>(null);
  const [users, setUsers] = useState<AdminUsersSummary | null>(null);
  const [sessions, setSessions] = useState<AdminSessionsPage | null>(null);
  const [report, setReport] = useState<AdminReportPayload | null>(null);
  const [locations, setLocations] = useState<AdminLocationSummary | null>(null);

  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [exportType, setExportType] = useState<AdminReportType>("full");
  const [exportFormat, setExportFormat] = useState<AdminExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const syncErrorTone = loadError ? "degraded" : "healthy";

  const clearDashboardData = useCallback(() => {
    setOverview(null);
    setGenerations(null);
    setUsers(null);
    setSessions(null);
    setReport(null);
    setLocations(null);
    setLastSyncedAt(null);
  }, []);

  const loadDashboard = useCallback(
    async (nextQuery: DashboardQuery) => {
      setIsLoading(true);
      setLoadError("");

      const successFilter = nextQuery.generationSuccess === "all" ? undefined : nextQuery.generationSuccess;
      const errorType = nextQuery.generationErrorType.trim() || undefined;

      try {
        const [overviewData, generationData, usersData, sessionsData, reportData, locationsData] = await Promise.all([
          fetchAdminOverview(nextQuery.filters),
          fetchAdminGenerations({
            ...nextQuery.filters,
            page: nextQuery.generationPage,
            pageSize: nextQuery.generationPageSize,
            sortOrder: nextQuery.generationSortOrder,
            success: successFilter,
            errorType,
          }),
          fetchAdminUsers({
            ...nextQuery.filters,
            page: nextQuery.usersPage,
            pageSize: nextQuery.usersPageSize,
            sortOrder: nextQuery.usersSortOrder,
          }),
          fetchAdminSessions({
            ...nextQuery.filters,
            page: nextQuery.sessionsPage,
            pageSize: nextQuery.sessionsPageSize,
            sortOrder: nextQuery.sessionsSortOrder,
            sortBy: nextQuery.sessionsSortBy,
          }),
          fetchAdminReport(nextQuery.filters),
          fetchAdminLocations(nextQuery.filters),
        ]);

        setOverview(overviewData);
        setGenerations(generationData);
        setUsers(usersData);
        setSessions(sessionsData);
        setReport(reportData);
        setLocations(locationsData);
        setLastSyncedAt(new Date().toISOString());
      } catch (error) {
        if (error instanceof AdminApiError && (error.status === 401 || error.status === 403)) {
          // Session expired or invalid — redirect to login.
          router.push("/f30/login");
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Failed to load admin data.");
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  // Load data on mount — session cookie is sent automatically.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard(DEFAULT_QUERY);
  }, [loadDashboard]);

  const totals = overview?.totals;
  const generationRows = generations?.rows ?? [];
  const sessionRows = sessions?.rows ?? [];
  const usersTrend = users?.trend ?? [];
  const reportErrors = report?.generations.errors ?? [];

  const healthStatus = useMemo(() => {
    if (isLoading) return "degraded" as const;
    if (loadError) return "degraded" as const;
    return "healthy" as const;
  }, [isLoading, loadError]);

  async function logout() {
    try {
      await fetch("/api/f30/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Best-effort — redirect to login regardless.
    }
    clearDashboardData();
    router.push("/f30/login");
  }

  function applyFilters() {
    const nextQuery: DashboardQuery = {
      ...query,
      filters: {
        startDate: draftStartDate || undefined,
        endDate: draftEndDate || undefined,
      },
      generationSuccess: draftSuccess,
      generationErrorType: draftErrorType,
      generationPage: 1,
      usersPage: 1,
      sessionsPage: 1,
    };
    setQuery(nextQuery);
    void loadDashboard(nextQuery);
  }

  function updateQuery(partial: Partial<DashboardQuery>) {
    const nextQuery: DashboardQuery = { ...query, ...partial };
    setQuery(nextQuery);
    void loadDashboard(nextQuery);
  }

  async function handleExport() {
    setIsExporting(true);
    setExportMessage("");

    try {
      const artifact = await exportAdminReport({
        reportType: exportType,
        format: exportFormat,
        filters: {
          ...query.filters,
          success: query.generationSuccess === "all" ? undefined : query.generationSuccess,
          errorType: query.generationErrorType || undefined,
        },
        page: 1,
        pageSize: 500,
      });

      const url = URL.createObjectURL(artifact.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = artifact.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setExportMessage(`Export completed: ${artifact.filename}`);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("Are you sure you want to permanently delete ALL submission data? This cannot be undone.")) return;
    setIsResetting(true);
    setResetMessage("");
    try {
      const result = await resetAdminData();
      setResetMessage(`✓ Reset complete — ${result.deletedSessions} sessions deleted.`);
      clearDashboardData();
      void loadDashboard(query);
    } catch (error) {
      setResetMessage(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
      <header className="rounded-3xl border border-white/10 bg-black/30 px-5 py-6 shadow-[0_15px_45px_-25px_rgba(0,0,0,0.85)] backdrop-blur md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Operations</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100 md:text-4xl">Admin Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
              Monitor generation activity, user/session metrics, reporting trends, and export operational data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDashboard(query)}
              disabled={isLoading}
              className="h-12 min-w-28 rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={isResetting}
              className="h-12 min-w-28 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResetting ? "Resetting..." : "Reset Data"}
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="h-12 min-w-28 rounded-2xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Sign Out
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
          <span className={`rounded-full border px-3 py-1 ${statusTone(healthStatus)}`}>
            API Health: {healthStatus}
          </span>
          <span className={`rounded-full border px-3 py-1 ${statusTone(syncErrorTone)}`}>
            Sync: {lastSyncedAt ? formatDate(lastSyncedAt) : "Not synced yet"}
          </span>
        </div>
      </header>

      {resetMessage ? (
        <section className={`mt-4 rounded-2xl border p-4 text-sm ${resetMessage.startsWith("✓") ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"}`}>
          {resetMessage}
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-black/35 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-slate-300">Start date</span>
            <input
              type="date"
              value={draftStartDate}
              onChange={(event) => setDraftStartDate(event.target.value)}
              className="h-12 rounded-2xl border border-white/15 bg-slate-950/80 px-3 text-slate-100 outline-none focus:border-cyan-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-slate-300">End date</span>
            <input
              type="date"
              value={draftEndDate}
              onChange={(event) => setDraftEndDate(event.target.value)}
              className="h-12 rounded-2xl border border-white/15 bg-slate-950/80 px-3 text-slate-100 outline-none focus:border-cyan-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-slate-300">Generation status</span>
            <select
              value={draftSuccess}
              onChange={(event) => setDraftSuccess(event.target.value as DashboardQuery["generationSuccess"])}
              className="h-12 rounded-2xl border border-white/15 bg-slate-950/80 px-3 text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value="all">All</option>
              <option value="true">Successful only</option>
              <option value="false">Failed only</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-slate-300">Error type filter</span>
            <input
              type="text"
              placeholder="e.g. server"
              value={draftErrorType}
              onChange={(event) => setDraftErrorType(event.target.value)}
              className="h-12 rounded-2xl border border-white/15 bg-slate-950/80 px-3 text-slate-100 outline-none focus:border-cyan-400"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyFilters}
            disabled={isLoading}
            className="h-12 min-w-36 rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftStartDate("");
              setDraftEndDate("");
              setDraftSuccess("all");
              setDraftErrorType("");
              setQuery(DEFAULT_QUERY);
              void loadDashboard(DEFAULT_QUERY);
            }}
            className="h-12 min-w-36 rounded-2xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Reset Filters
          </button>
        </div>
      </section>

      {loadError ? (
        <section className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {loadError}
        </section>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Visitors" value={formatNumber(totals?.visitors ?? 0)} accent="text-cyan-300" />
        <KpiCard label="Sessions" value={formatNumber(totals?.sessions ?? 0)} accent="text-blue-300" />
        <KpiCard
          label="Returning Users"
          value={formatNumber(users?.summary.returningUsers ?? 0)}
          accent="text-indigo-300"
        />
        <KpiCard
          label="Successful Generations"
          value={formatNumber(totals?.successfulGenerations ?? 0)}
          accent="text-emerald-300"
        />
        <KpiCard
          label="Failed Generations"
          value={formatNumber(totals?.failedGenerations ?? 0)}
          accent="text-rose-300"
        />
        <KpiCard
          label="Total Generations"
          value={formatNumber(totals?.generations ?? 0)}
          accent="text-violet-300"
        />
        <KpiCard
          label="Conversion Rate"
          value={`${formatNumber(totals?.conversionRate ?? 0)}%`}
          accent="text-amber-300"
        />
        <KpiCard
          label="Avg Generation Time"
          value={`${formatNumber(totals?.avgGenerationTimeMs ?? 0)} ms`}
          accent="text-teal-300"
        />
        <KpiCard
          label="Download Clicks"
          value={formatNumber(users?.summary.downloadClicks ?? 0)}
          accent="text-pink-300"
        />
        <KpiCard
          label="Rate-Limited Requests"
          value={formatNumber(totals?.rateLimitedRequests ?? 0)}
          accent="text-orange-300"
        />
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-black/35 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur md:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-100">Generation Activity</h2>
          <span className="text-sm text-slate-300">{isLoading ? "Loading..." : "Live dataset"}</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/15 text-slate-300">
                <th className="px-3 py-3 font-medium">Created At</th>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Location</th>
                <th className="px-3 py-3 font-medium">Session</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Duration</th>
                <th className="px-3 py-3 font-medium">Error Type</th>
              </tr>
            </thead>
            <tbody>
              {generationRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                    {isLoading ? "Loading data…" : "No generation records for the selected filters."}
                  </td>
                </tr>
              ) : (
                generationRows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 text-slate-100">
                    <td className="px-3 py-3">{formatDate(row.createdAt)}</td>
                    <td className="px-3 py-3 font-medium" dir="rtl">{row.name ?? <span className="text-slate-500">—</span>}</td>
                    <td className="px-3 py-3 text-slate-300">{row.email ?? <span className="text-slate-500">—</span>}</td>
                    <td className="px-3 py-3 text-slate-300 whitespace-nowrap">
                      {row.countryCode ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono text-xs border border-white/15 rounded px-1.5 py-0.5 bg-white/5">{row.countryCode}</span>
                          {row.city ? <span className="text-xs">{row.city}</span> : null}
                        </span>
                      ) : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-300">{row.sessionId.slice(0, 8)}...</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${
                          row.success
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                            : "border-rose-500/40 bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {row.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="px-3 py-3">{formatNumber(row.durationMs)} ms</td>
                    <td className="px-3 py-3 text-slate-300">{row.errorType ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={query.generationPage}
          pageSize={query.generationPageSize}
          total={generations?.total ?? 0}
          onPrev={() => updateQuery({ generationPage: Math.max(1, query.generationPage - 1) })}
          onNext={() => updateQuery({ generationPage: query.generationPage + 1 })}
          onPageSizeChange={(size) => updateQuery({ generationPage: 1, generationPageSize: size })}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-black/35 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur md:p-6">
          <h2 className="text-xl font-semibold text-slate-100">Users Overview</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <KpiCard label="New Users" value={formatNumber(users?.summary.newUsers ?? 0)} accent="text-cyan-300" />
            <KpiCard
              label="Active Users"
              value={formatNumber(users?.summary.activeUsers ?? 0)}
              accent="text-emerald-300"
            />
            <KpiCard
              label="Returning Users"
              value={formatNumber(users?.summary.returningUsers ?? 0)}
              accent="text-amber-300"
            />
            <KpiCard
              label="Download Clicks"
              value={formatNumber(users?.summary.downloadClicks ?? 0)}
              accent="text-violet-300"
            />
          </div>
          <div className="mt-4 max-h-72 overflow-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-300">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">New Users</th>
                  <th className="px-3 py-2 font-medium">Active Users</th>
                </tr>
              </thead>
              <tbody>
                {usersTrend.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                      No user trend data for selected range.
                    </td>
                  </tr>
                ) : (
                  usersTrend.map((row) => (
                    <tr key={row.date} className="border-b border-white/5 text-slate-100">
                      <td className="px-3 py-2">{formatDateOnly(row.date)}</td>
                      <td className="px-3 py-2">{formatNumber(row.newUsers)}</td>
                      <td className="px-3 py-2">{formatNumber(row.activeUsers)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={query.usersPage}
            pageSize={query.usersPageSize}
            total={users?.totalDays ?? 0}
            onPrev={() => updateQuery({ usersPage: Math.max(1, query.usersPage - 1) })}
            onNext={() => updateQuery({ usersPage: query.usersPage + 1 })}
            onPageSizeChange={(size) => updateQuery({ usersPage: 1, usersPageSize: size })}
          />
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/35 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-100">Sessions</h2>
            <div className="flex items-center gap-2">
              <select
                value={query.sessionsSortBy}
                onChange={(event) =>
                  updateQuery({
                    sessionsPage: 1,
                    sessionsSortBy: event.target.value as DashboardQuery["sessionsSortBy"],
                  })
                }
                className="h-10 rounded-xl border border-white/15 bg-slate-950 px-3 text-xs text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="last_seen_at">Sort by last seen</option>
                <option value="created_at">Sort by created at</option>
              </select>
            </div>
          </div>
          <div className="mt-4 max-h-80 overflow-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-300">
                  <th className="px-3 py-2 font-medium">Session ID</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Last Seen</th>
                  <th className="px-3 py-2 font-medium">Events</th>
                  <th className="px-3 py-2 font-medium">Generations</th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      No sessions found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  sessionRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 text-slate-100">
                      <td className="px-3 py-2 font-mono text-xs text-slate-300">{row.id.slice(0, 10)}...</td>
                      <td className="px-3 py-2">{formatDate(row.createdAt)}</td>
                      <td className="px-3 py-2">{formatDate(row.lastSeenAt)}</td>
                      <td className="px-3 py-2">{formatNumber(row.eventCount)}</td>
                      <td className="px-3 py-2">
                        {formatNumber(row.successfulGenerationCount)}/{formatNumber(row.generationCount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={query.sessionsPage}
            pageSize={query.sessionsPageSize}
            total={sessions?.total ?? 0}
            onPrev={() => updateQuery({ sessionsPage: Math.max(1, query.sessionsPage - 1) })}
            onNext={() => updateQuery({ sessionsPage: query.sessionsPage + 1 })}
            onPageSizeChange={(size) => updateQuery({ sessionsPage: 1, sessionsPageSize: size })}
          />
        </article>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-3xl border border-white/10 bg-black/35 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur md:p-6">
          <h2 className="text-xl font-semibold text-slate-100">Reports and Export</h2>
          <p className="mt-2 text-sm text-slate-300">
            Export dashboard data with active filters. Use CSV for spreadsheet workflows and JSON for pipeline automation.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-slate-300">Report type</span>
              <select
                value={exportType}
                onChange={(event) => setExportType(event.target.value as AdminReportType)}
                className="h-12 rounded-2xl border border-white/15 bg-slate-950/80 px-3 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="full">Full</option>
                <option value="overview">Overview</option>
                <option value="generations">Generations</option>
                <option value="users">Users</option>
                <option value="sessions">Sessions</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-slate-300">Format</span>
              <select
                value={exportFormat}
                onChange={(event) => setExportFormat(event.target.value as AdminExportFormat)}
                className="h-12 rounded-2xl border border-white/15 bg-slate-950/80 px-3 text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={isExporting}
                className="h-12 w-full rounded-2xl border border-emerald-400/45 bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExporting ? "Exporting..." : "Export Report"}
              </button>
            </div>
          </div>

          {exportMessage ? <p className="mt-3 text-sm text-slate-200">{exportMessage}</p> : null}

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <h3 className="text-sm font-semibold text-slate-100">Top Error Types</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {reportErrors.length === 0 ? (
                  <li>No generation errors recorded.</li>
                ) : (
                  reportErrors.slice(0, 5).map((item, index) => (
                    <li key={`${item.errorType ?? "none"}-${index}`} className="flex justify-between gap-3">
                      <span>{item.errorType ?? "unspecified"}</span>
                      <span>{formatNumber(item.count)}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <h3 className="text-sm font-semibold text-slate-100">Daily Sessions Trend</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {(report?.users.dailySessions ?? []).length === 0 ? (
                  <li>No session trend data.</li>
                ) : (
                  report?.users.dailySessions.slice(-5).map((item) => (
                    <li key={item.date} className="flex justify-between gap-3">
                      <span>{formatDateOnly(item.date)}</span>
                      <span>{formatNumber(item.sessions)}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <h3 className="text-sm font-semibold text-slate-100">🌍 Top Countries</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {(locations?.topCountries ?? []).length === 0 ? (
                  <li>No location data yet.</li>
                ) : (
                  (locations?.topCountries ?? []).slice(0, 8).map((item) => (
                    <li key={item.countryCode} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs border border-white/15 rounded px-1.5 py-0.5 bg-white/5">{item.countryCode}</span>
                      </span>
                      <span className="font-medium text-slate-100">{formatNumber(item.submissions)}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/35 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur md:p-6">
          <h2 className="text-xl font-semibold text-slate-100">System Health</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-3">
              <p className="text-slate-400">Admin API authorization</p>
              <p className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs ${statusTone(healthStatus)}`}>
                {healthStatus}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-3">
              <p className="text-slate-400">Last successful sync</p>
              <p className="mt-1 text-slate-100">{lastSyncedAt ? formatDate(lastSyncedAt) : "No sync yet"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-3">
              <p className="text-slate-400">Export pipeline</p>
              <p className="mt-1 text-slate-100">{isExporting ? "Running export task..." : "Idle"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-3">
              <p className="text-slate-400">Report timestamp</p>
              <p className="mt-1 text-slate-100">
                {report?.generatedAt ? formatDate(report.generatedAt) : "Unavailable"}
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
