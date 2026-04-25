"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ARABIC_NAME_PATTERN, EMAIL_PATTERN, NAME_MAX_LENGTH } from "@/lib/client-constants";

type Screen = "welcome" | "form" | "result";

export default function CertificateShell() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Revoke the previous Blob URL when imageUrl changes or component unmounts
  // to prevent PNG buffers accumulating in browser memory.
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // ── Form submit ─────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError("");
    setEmailError("");
    setServerError("");

    const name = nameRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";

    if (!name) { setNameError("الاسم مطلوب"); return; }
    if (name.length > NAME_MAX_LENGTH) { setNameError(`الاسم طويل جداً (الحد ${NAME_MAX_LENGTH} حرفاً)`); return; }
    if (!ARABIC_NAME_PATTERN.test(name)) { setNameError("يرجى إدخال الاسم بالعربية فقط"); return; }
    if (!email) { setEmailError("البريد الإلكتروني مطلوب"); return; }
    if (!EMAIL_PATTERN.test(email)) { setEmailError("صيغة البريد الإلكتروني غير صحيحة"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: "image/png" });
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setScreen("result");
      } else {
        const data = await res.json().catch(() => ({ message: "حدث خطأ غير متوقع." }));
        if (data.field === "name") setNameError(data.message);
        else if (data.field === "email") setEmailError(data.message);
        else setServerError(data.message ?? "حدث خطأ. يرجى المحاولة مرة أخرى.");
      }
    } catch {
      setServerError("لا يمكن الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت.");
    } finally {
      setLoading(false);
    }
  }

  // ── Screen 1: Welcome ───────────────────────────────────────────────────────
  if (screen === "welcome") {
    return (
      <div className="relative w-full max-w-sm mx-auto" style={{ aspectRatio: "1015/1801" }}>
        <Image
          src="/assets/welcome_screen.png"
          alt="مرحباً"
          fill
          className="object-cover rounded-2xl"
          priority
          unoptimized
        />
        {/* Start button — pinned to bottom of image */}
        <div className="absolute bottom-[6%] inset-x-0 flex justify-center px-8">
          <button
            onClick={() => setScreen("form")}
            className="w-full rounded-xl bg-white/90 backdrop-blur-sm py-4 text-lg font-bold text-gray-900 shadow-lg transition active:scale-95 hover:bg-white font-arabic"
            dir="rtl"
          >
            وصّل شكرك الآن
          </button>
        </div>
      </div>
    );
  }

  // ── Screen 2: Form ──────────────────────────────────────────────────────────
  if (screen === "form") {
    return (
      <div className="relative w-full max-w-sm mx-auto" style={{ aspectRatio: "1015/1801" }}>
        <Image
          src="/assets/form.png"
          alt="نموذج الشهادة"
          fill
          className="object-cover rounded-2xl"
          priority
          unoptimized
        />

        {/* Form overlaid below the logo — logo occupies the top ~38% of the image */}
        <form
          onSubmit={handleSubmit}
          noValidate
          dir="rtl"
          className="absolute inset-x-[8%] top-[42%] bottom-[10%] flex flex-col justify-center gap-[4%]"
        >
          {/* Name field */}
          <div className="flex flex-col gap-1">
            <label htmlFor="name-input" className="text-xs font-semibold text-white/90 drop-shadow font-arabic">
              الاسم بالعربي
            </label>
            <input
              id="name-input"
              ref={nameRef}
              type="text"
              autoComplete="name"
              inputMode="text"
              disabled={loading}
              className={`w-full rounded-lg border bg-white/15 backdrop-blur-sm px-3 py-2.5 text-sm text-right text-white outline-none transition focus:ring-2 focus:ring-white/60 disabled:opacity-50 font-arabic ${
                nameError ? "border-red-400" : "border-white/30"
              }`}
            />
            {nameError && (
              <p
                className="text-[11px] text-red-300 drop-shadow font-arabic"
                aria-live="polite"
                role="alert"
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Email field */}
          <div className="flex flex-col gap-1">
            <label htmlFor="email-input" className="text-xs font-semibold text-white/90 drop-shadow font-arabic">
              البريد الإلكتروني
            </label>
            <input
              id="email-input"
              ref={emailRef}
              type="email"
              autoComplete="email"
              inputMode="email"
              disabled={loading}
              className={`w-full rounded-lg border bg-white/15 backdrop-blur-sm px-3 py-2.5 text-sm text-right text-white outline-none transition focus:ring-2 focus:ring-white/60 disabled:opacity-50 font-arabic ${
                emailError ? "border-red-400" : "border-white/30"
              }`}
            />
            {emailError && (
              <p
                className="text-[11px] text-red-300 drop-shadow font-arabic"
                aria-live="polite"
                role="alert"
              >
                {emailError}
              </p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <p
              className="text-[11px] text-red-300 text-center drop-shadow font-arabic"
              aria-live="assertive"
              role="alert"
            >
              {serverError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white py-3 text-sm font-bold text-gray-900 shadow-lg transition active:scale-95 hover:bg-white/90 disabled:opacity-60 flex items-center justify-center gap-2 font-arabic"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                جارٍ الإنشاء…
              </>
            ) : (
              "إنشاء الصورة"
            )}
          </button>
        </form>
      </div>
    );
  }

  // ── Screen 3: Result ────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-4" dir="rtl">
      {/* Certificate preview */}
      <div className="w-full overflow-hidden rounded-2xl shadow-xl">
        <Image
          src={imageUrl}
          alt="شهادتك"
          width={1015}
          height={1801}
          className="w-full h-auto"
          unoptimized
          priority
        />
      </div>

      {/* Download */}
      <button
        onClick={() => {
          const a = document.createElement("a");
          a.href = imageUrl;
          a.download = "shahadah.png";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Fire-and-forget: record download click for analytics
          void fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventType: "download_clicked" }),
          });
        }}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-white py-4 text-base font-bold text-gray-900 shadow-lg transition active:scale-95 hover:bg-white/90 font-arabic"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        تحميل الشهادة
      </button>

      {/* Make another */}
      <button
        onClick={() => { setScreen("welcome"); setImageUrl(""); }}
        className="text-sm text-white/70 underline underline-offset-2 hover:text-white transition font-arabic"
      >
        إنشاء شهادة أخرى
      </button>
    </div>
  );
}
