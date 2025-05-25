"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DomainDisabledMessage,
  DepartmentSelect,
  DepartmentCurrent,
  NoDepartmentsMessage,
  WishlistLinkForm,
  LoadingMessage,
} from "./components/DashboardParts";

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string; domain?: string; department?: { id: string; name: string } } | null>(null);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [domainEnabled, setDomainEnabled] = useState<boolean | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [linkLoading, setLinkLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
        setIsAdmin(!!data.user.is_admin);
      })
      .catch(() => {
        localStorage.removeItem("session_token");
        router.replace("/");
      });
  }, [router]);

  useEffect(() => {
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) return;
    setLinkLoading(true);
    fetch("/api/links", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not fetch link");
        const data = await res.json();
        if (data.link && data.link.url) {
          setLinkInput(data.link.url);
        } else {
          setLinkInput("");
        }
        setLinkLoading(false);
      })
      .catch(() => {
        setLinkError("Could not load your wishlist link.");
        setLinkLoading(false);
      });
  }, [user]);

  useEffect(() => {
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) return;
    setDepartmentLoading(true);
    fetch("/api/departments", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not fetch departments");
        const data = await res.json();
        setDepartments(data.departments || []);
        setDepartmentLoading(false);
      })
      .catch(() => {
        setDepartmentError("Could not load departments.");
        setDepartmentLoading(false);
      });
  }, [user]);

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

  async function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLinkError(null);
    setLinkSuccess(false);
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) return;
    const url = linkInput.trim();
    // Validate Amazon UK wishlist format
    const amazonPattern = /^https:\/\/www\.amazon\.co\.uk\/hz\/wishlist\/[A-Za-z0-9?=&#_\/-]+$/;
    if (!url) {
      setLinkError("Please enter your Amazon UK wishlist link.");
      return;
    }
    if (!amazonPattern.test(url)) {
      setLinkError("Please enter a valid Amazon UK wishlist link (must start with https://www.amazon.co.uk/hz/wishlist/).");
      return;
    }
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Authorization": `Bearer ${sessionToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      setLinkInput(url);
      setLinkSuccess(true);
    } else {
      setLinkError("Could not save your link. Please try again.");
    }
  }

  // Department selection logic
  async function handleDepartmentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setDepartmentError(null);
    setSelectedDepartment(e.target.value);
    // Call API to update user's department
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) return;
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Authorization": `Bearer ${sessionToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ department_id: e.target.value }),
    });
    if (res.ok) {
      setUser((u) => u ? { ...u, department: departments.find(d => d.id === e.target.value) } : u);
      // If user has a wishlist link, update its department_id as well
      if (linkInput) {
        await fetch("/api/links", {
          method: "POST",
          headers: { "Authorization": `Bearer ${sessionToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: linkInput }), // backend will use new department_id from user
        });
      }
    } else {
      setDepartmentError("Could not update department. Please try again.");
    }
  }

  if (!user) return <LoadingMessage message="Loading..." />;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
      <div className="bg-white/90 rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-center text-gray-900 flex-1">Dashboard</h1>
          {isAdmin && (
            <Link href="/admin" className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold">Admin Area</Link>
          )}
        </div>
        <p className="text-center text-gray-700">Logged in as <span className="font-mono">{user.email}</span></p>
        {domainEnabled === false ? (
          <DomainDisabledMessage onLogout={handleLogout} />
        ) : (
          <>
            {departmentLoading ? (
              <LoadingMessage message="Loading departments..." />
            ) : departments.length === 0 ? (
              <NoDepartmentsMessage />
            ) : user.department ? (
              <DepartmentCurrent
                department={user.department}
                departments={departments}
                onChange={handleDepartmentChange}
                error={departmentError}
              />
            ) : (
              <DepartmentSelect
                departments={departments}
                value={selectedDepartment || ""}
                onChange={handleDepartmentChange}
                error={departmentError}
              />
            )}
            {linkLoading ? (
              <LoadingMessage message="Loading your wishlist info..." />
            ) : (
              <WishlistLinkForm
                linkInput={linkInput}
                onInputChange={e => setLinkInput(e.target.value)}
                onSubmit={handleLinkSubmit}
                success={linkSuccess}
                error={linkError}
                isUpdate={!!linkInput}
              />
            )}
            {/* Only show this logout button if domain is enabled (true or null) */}
            {(domainEnabled === true || domainEnabled === null) && (
              <button
                onClick={handleLogout}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Logout
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
