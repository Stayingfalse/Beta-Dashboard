"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminNav() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const sessionToken = typeof window !== "undefined" ? localStorage.getItem("session_token") : null;
    if (!sessionToken) {
      setIsAdmin(false);
      setChecked(true);
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("API response not OK");
        }
        const data = await res.json();
        if (data && data.user) {
          setIsAdmin(!!data.user.is_admin);
        } else {
          setIsAdmin(false);
        }
        setChecked(true);
      })
      .catch(() => {
        setIsAdmin(false);
        setChecked(true);
      });
  }, [pathname]);
  if (!checked) {
    return null;
  }
  if (!isAdmin) {
    return null;
  }
  return (
    <nav className="absolute right-4 flex gap-2">
      <Link
        href="/dashboard"
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
      >
        Dashboard
      </Link>
      <Link
        href="/admin"
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
      >
        Admin Area
      </Link>
    </nav>
  );
}
