"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string; domain?: string } | null>(null);
  const [domainEnabled, setDomainEnabled] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) {
      router.replace("/");
      return;
    }
    fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        setUser(data.user);
        setDomainEnabled(data.domain_enabled);
      })
      .catch(() => {
        localStorage.removeItem("session_token");
        router.replace("/");
      });
  }, [router]);

  async function handleLogout() {
    const sessionToken = localStorage.getItem("session_token");
    if (sessionToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      localStorage.removeItem("session_token");
    }
    router.replace("/");
  }

  if (!user) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
      <div className="bg-white/90 rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">Dashboard</h1>
        <p className="text-center text-gray-700">Logged in as <span className="font-mono">{user.email}</span></p>
        {domainEnabled === false && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 text-sm rounded">
            The domain for your email is not recognised or enabled.<br />
            Please check you used your work email, or contact your organisation to be set up.
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
