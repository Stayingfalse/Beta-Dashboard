import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Random Acts of Santa - 2025",
  description: "A festive dashboard for Random Acts of Santa - 2025",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Admin nav logic
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const sessionToken =
      typeof window !== "undefined" ? localStorage.getItem("session_token") : null;
    if (!sessionToken) {
      setIsAdmin(false);
      setChecked(true);
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setIsAdmin(!!data.user.is_admin);
        setChecked(true);
      })
      .catch(() => {
        setIsAdmin(false);
        setChecked(true);
      });
  }, [pathname]);
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-[#b30000] via-[#fffbe6] to-[#006400] bg-fixed`}
        style={{
          backgroundImage:
            'url("/public/snow.svg"), linear-gradient(135deg, #b30000 0%, #fffbe6 50%, #006400 100%)',
          backgroundRepeat: "repeat",
        }}
      >
        <div className="w-full flex flex-col min-h-screen justify-between">
          <header className="w-full py-4 bg-[#b30000] text-white text-center font-bold text-lg shadow-md border-b-4 border-[#fffbe6] flex items-center justify-center relative">
            <span className="flex-1">🎅 Random Acts of Santa - 2025 🎄</span>
            {checked && isAdmin && (
              pathname.startsWith("/admin") ? (
                <Link
                  href="/dashboard"
                  className="absolute right-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/admin"
                  className="absolute right-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
                >
                  Admin Area
                </Link>
              )
            )}
          </header>
          <main className="flex-1">{children}</main>
          <footer className="text-xs text-center text-[#b30000] bg-[#fffbe6] py-2 w-full border-t-2 border-[#b30000]">
            v0.1.6 &mdash; Made for Senseé, Shared with the world
          </footer>
        </div>
      </body>
    </html>
  );
}
