"use client";

import { useState, useId, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface FieldError {
  username?: string;
  password?: string;
  form?: string;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const usernameId = useId();
  const passwordId = useId();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const fieldErrors: FieldError = {};
    if (!username.trim()) fieldErrors.username = "Username is required.";
    if (!password) fieldErrors.password = "Password is required.";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/f30/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = (await res.json()) as { success: boolean; message?: string; field?: string | null };

      if (data.success) {
        router.push("/f30");
        return;
      }

      if (res.status === 401) {
        setErrors({ form: "Invalid username or password." });
      } else if (res.status === 429) {
        setErrors({ form: "Too many login attempts. Please try again later." });
      } else if (res.status === 400 && data.field) {
        setErrors({ [data.field]: data.message ?? "Invalid value." });
      } else {
        setErrors({ form: data.message ?? "An unexpected error occurred. Please try again." });
      }
    } catch {
      setErrors({ form: "Network error. Please check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 mb-4">
          <svg
            className="w-6 h-6 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in to continue</p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-6 shadow-xl shadow-black/30 space-y-4"
      >
        {/* Form-level error */}
        {errors.form && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {errors.form}
          </div>
        )}

        {/* Username field */}
        <div>
          <label htmlFor={usernameId} className="block mb-1.5 text-sm font-medium text-slate-300">
            Username
          </label>
          <input
            id={usernameId}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-describedby={errors.username ? `${usernameId}-error` : undefined}
            aria-invalid={!!errors.username}
            disabled={loading}
            className={`
              w-full rounded-lg border px-3 py-2.5 text-sm
              bg-slate-800/70 text-slate-100 placeholder-slate-500
              focus:outline-none focus:ring-2 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                errors.username
                  ? "border-red-500/60 focus:ring-red-500/40"
                  : "border-slate-600/50 focus:ring-blue-500/40 focus:border-blue-500/50"
              }
            `}
            placeholder="Enter username"
          />
          {errors.username && (
            <p id={`${usernameId}-error`} className="mt-1.5 text-xs text-red-400">
              {errors.username}
            </p>
          )}
        </div>

        {/* Password field */}
        <div>
          <label htmlFor={passwordId} className="block mb-1.5 text-sm font-medium text-slate-300">
            Password
          </label>
          <input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={errors.password ? `${passwordId}-error` : undefined}
            aria-invalid={!!errors.password}
            disabled={loading}
            className={`
              w-full rounded-lg border px-3 py-2.5 text-sm
              bg-slate-800/70 text-slate-100 placeholder-slate-500
              focus:outline-none focus:ring-2 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                errors.password
                  ? "border-red-500/60 focus:ring-red-500/40"
                  : "border-slate-600/50 focus:ring-blue-500/40 focus:border-blue-500/50"
              }
            `}
            placeholder="Enter password"
          />
          {errors.password && (
            <p id={`${passwordId}-error`} className="mt-1.5 text-xs text-red-400">
              {errors.password}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full rounded-lg px-4 py-2.5 text-sm font-semibold
            bg-blue-600 hover:bg-blue-500 active:bg-blue-700
            text-white transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1 focus:ring-offset-slate-900
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </div>
  );
}
