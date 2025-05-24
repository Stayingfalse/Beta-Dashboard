import type { Metadata } from "next";
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
  title: "Random Acts of Santa - 2025",
  description: "A festive dashboard for Random Acts of Santa - 2025",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-[#b30000] via-[#fffbe6] to-[#006400] bg-fixed`}
        style={{
          backgroundImage:
            'url("/public/snow.svg"), linear-gradient(135deg, #b30000 0%, #fffbe6 50%, #006400 100%)',
          backgroundRepeat: 'repeat',
        }}
      >
        <div className="w-full flex flex-col min-h-screen justify-between">
          <header className="w-full py-4 bg-[#b30000] text-white text-center font-bold text-lg shadow-md border-b-4 border-[#fffbe6]">
            🎅 Random Acts of Santa - 2025 🎄
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
