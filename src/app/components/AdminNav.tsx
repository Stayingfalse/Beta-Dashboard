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
    console.log("AdminNav: sessionToken:", sessionToken); // DEBUG
    if (!sessionToken) {
      setIsAdmin(false);
      setChecked(true);
      console.log("AdminNav: No session token found."); // DEBUG
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then(async (res) => {
        console.log("AdminNav: API response status:", res.status); // DEBUG
        if (!res.ok) {
          console.error("AdminNav: API response not OK", res); // DEBUG
          throw new Error("API response not OK");
        }
        const data = await res.json();
        console.log("AdminNav: API response data:", data); // DEBUG
        if (data && data.user) {
          console.log("AdminNav: User data from API:", data.user); // DEBUG
          console.log("AdminNav: is_admin from API:", data.user.is_admin); // DEBUG
          setIsAdmin(!!data.user.is_admin);
          console.log("AdminNav: isAdmin state set to:", !!data.user.is_admin); // DEBUG
        } else {
          console.warn("AdminNav: User data not found in API response", data); // DEBUG
          setIsAdmin(false);
        }
        setChecked(true);
      })
      .catch((error) => {
        console.error("AdminNav: Error fetching user data or processing response:", error); // DEBUG
        setIsAdmin(false);
        setChecked(true);
      });
  }, [pathname]);
  if (!checked) {
    console.log("AdminNav: Still checking auth, rendering null."); // DEBUG
    return null;
  }
  if (!isAdmin) {
    console.log("AdminNav: Not an admin or check failed, rendering null."); // DEBUG
    return null;
  }
  console.log("AdminNav: Rendering AdminNav component."); // DEBUG
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
