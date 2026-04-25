import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Sign in to the Admin Dashboard.",
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      dir="ltr"
      className="w-full min-h-dvh bg-[radial-gradient(circle_at_top_left,#1f2a44_0%,#05070b_45%,#020305_100%)] text-slate-100 flex items-center justify-center"
    >
      {children}
    </main>
  );
}
