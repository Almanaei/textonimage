import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "شكر الدفاع المدني",
  description: "انشأ بطاقة شكر خاصة لرجال الدفاع المدني البحريني",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "شكر الدفاع المدني",
    description: "انشأ بطاقة شكر خاصة لرجال الدفاع المدني البحريني",
    url: "https://thanksbahraincd.com",
    siteName: "شكر الدفاع المدني",
    images: [
      {
        url: "https://thanksbahraincd.com/assets/welcome_screen.png?v=2",
        width: 1015,
        height: 1801,
        alt: "شكر الدفاع المدني",
      },
    ],
    locale: "ar_BH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "شكر الدفاع المدني",
    description: "انشأ بطاقة شكر خاصة لرجال الدفاع المدني البحريني",
    images: ["https://thanksbahraincd.com/assets/welcome_screen.png?v=2"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col items-center justify-center bg-black py-6 px-4 overflow-x-hidden">{children}</body>
    </html>
  );
}
