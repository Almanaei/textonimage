"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ARABIC_NAME_PATTERN, EMAIL_PATTERN, NAME_MAX_LENGTH } from "@/lib/client-constants";

type Screen = "welcome" | "form" | "result";
type ShareStatus = "idle" | "copied";

const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://thanksbahrainccd.com";
const WHATSAPP_TEXT = encodeURIComponent(
  `أنشئ شهادة شكرك لرجال الدفاع المدني البحريني من هنا: ${APP_URL}`,
);

function track(eventType: string) {
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType }),
  });
}

export default function CertificateShell() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");

  // Preload form.png in the background while the welcome screen is visible
  // so the transition to the form screen is instant.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "image";
    link.href = "/assets/form.png";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

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
        setImageBlob(blob);
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

  // ── Share handlers ──────────────────────────────────────────────────────────
  async function handleShare() {
    if (navigator.share) {
      const shareData: ShareData = {
        title: "شهادة شكر وتقدير",
        text: "أنشئ شهادتك الخاصة لرجال الدفاع المدني البحريني",
        url: APP_URL,
      };
      // Attach the image file when the browser supports file-in-share
      if (
        imageBlob &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({
          files: [new File([imageBlob], "shahadah.png", { type: "image/png" })],
        })
      ) {
        shareData.files = [new File([imageBlob], "shahadah.png", { type: "image/png" })];
      }
      try {
        await navigator.share(shareData);
        track("share_clicked");
      } catch {
        // User cancelled the share sheet — no action needed
      }
    } else {
      // Desktop fallback: copy the app URL to clipboard
      try {
        await navigator.clipboard.writeText(APP_URL);
        setShareStatus("copied");
        setTimeout(() => setShareStatus("idle"), 2500);
        track("share_copy_clicked");
      } catch {
        // Clipboard unavailable — silently ignore
      }
    }
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${WHATSAPP_TEXT}`, "_blank", "noopener,noreferrer");
    track("whatsapp_share_clicked");
  }

  // ── Screen 1: Welcome ───────────────────────────────────────────────────────
  if (screen === "welcome") {
    return (
      <div className="relative w-full max-w-sm mx-auto" style={{ aspectRatio: "1015/1801" }}>
        <Image
          src="/assets/welcome_screen.png"
          alt="مرحباً"
          fill
          sizes="(max-width: 384px) 100vw, 384px"
          className="object-cover rounded-2xl"
          priority
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
        {/* Powered by Proud */}
        <a
          href="mailto:admin@thanksbahraincd.com"
          aria-label="تواصل معنا"
          className="absolute bottom-[1.5%] inset-x-0 flex justify-center items-center gap-1 group"
        >
          <span className="text-[10px] text-white/35 group-hover:text-white/65 transition tracking-wide">Powered by Proud</span>
          <Image src="/assets/Bahrain.png" alt="Bahrain" width={20} height={20} className="opacity-35 group-hover:opacity-65 transition" />
        </a>
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
          sizes="(max-width: 384px) 100vw, 384px"
          className="object-cover rounded-2xl"
          priority
        />

        {/* Powered by Proud */}
        <a
          href="mailto:admin@thanksbahraincd.com"
          aria-label="تواصل معنا"
          className="absolute bottom-[1.5%] inset-x-0 flex justify-center items-center gap-1 group"
        >
          <span className="text-[10px] text-white/35 group-hover:text-white/65 transition tracking-wide">Powered by Proud</span>
          <Image src="/assets/Bahrain.png" alt="Bahrain" width={20} height={20} className="opacity-35 group-hover:opacity-65 transition" />
        </a>
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
              "أنشأ الصورة"
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
          track("download_clicked");
        }}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-white py-4 text-base font-bold text-gray-900 shadow-lg transition active:scale-95 hover:bg-white/90 font-arabic"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        تحميل الصورة
      </button>

      {/* Share row */}
      <div className="flex gap-3">
        {/* Native share / copy-link fallback */}
        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/15 border border-white/25 backdrop-blur-sm py-3.5 text-sm font-bold text-white shadow transition active:scale-95 hover:bg-white/25 font-arabic"
        >
          {shareStatus === "copied" ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              نُسخ الرابط
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              شارك التطبيق
            </>
          )}
        </button>

        {/* WhatsApp direct share */}
        <button
          onClick={handleWhatsApp}
          aria-label="شارك عبر واتساب"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 px-4 text-sm font-bold text-white shadow transition active:scale-95 hover:bg-[#1ebe5d] font-arabic"
        >
          {/* WhatsApp logo */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.557 4.117 1.534 5.845L.054 23.447a.5.5 0 00.609.61l5.71-1.496A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.9 9.9 0 01-5.031-1.371l-.361-.214-3.731.979.993-3.63-.235-.374A9.863 9.863 0 012.1 12C2.1 6.533 6.533 2.1 12 2.1c5.467 0 9.9 4.433 9.9 9.9 0 5.467-4.433 9.9-9.9 9.9z"/>
          </svg>
          واتساب
        </button>
      </div>

      {/* Make another */}
      <button
        onClick={() => { setScreen("welcome"); setImageUrl(""); setImageBlob(null); }}
        className="text-sm text-white/70 underline underline-offset-2 hover:text-white transition font-arabic"
      >
        إنشاء شهادة أخرى
      </button>
    </div>
  );
}
