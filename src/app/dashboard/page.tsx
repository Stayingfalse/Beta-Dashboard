"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DomainDisabledMessage,
  DepartmentSelect,
  DepartmentCurrent,
  NoDepartmentsMessage,
  WishlistLinkForm,
  AllocatedLinksSection,
  LoadingMessage,
  PageLayout,
  DashboardLayout,
} from "../../components";

type User = {
  email: string;
  domain?: string;
  department?: { id: number; name: string };
  is_admin?: boolean;
};

type Department = {
  id: number;
  name: string;
};

type AllocatedLink = {
  id: number;
  url: string;
  times_allocated: number;
  times_purchased: number;
  error_count: number;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [domainEnabled, setDomainEnabled] = useState<boolean | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [linkLoading, setLinkLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allocatedLinks, setAllocatedLinks] = useState<AllocatedLink[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocError, setAllocError] = useState<string | null>(null); const [allocSuccess, setAllocSuccess] = useState<string | null>(null);
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

  useEffect(() => {
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) return;
    setAllocLoading(true);
    fetch("/api/links/allocate", {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not fetch allocated links");
        const data = await res.json();
        setAllocatedLinks(data.allocated || []);
        setAllocLoading(false);
      })
      .catch(() => {
        setAllocError("Could not load your allocated links.");
        setAllocLoading(false);
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

  async function handleDepartmentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setDepartmentError(null);
    const selectedId = e.target.value === "" ? null : Number(e.target.value);
    setSelectedDepartment(selectedId === null ? "" : selectedId.toString());
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) return;
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Authorization": `Bearer ${sessionToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ department_id: selectedId }),
    });
    if (res.ok) {
      setUser((u) => u ? { ...u, department: departments.find(d => d.id === selectedId) } : u);
      if (linkInput) {
        await fetch("/api/links", {
          method: "POST",
          headers: { "Authorization": `Bearer ${sessionToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: linkInput }),
        });
      }
    } else {
      setDepartmentError("Could not update department. Please try again.");
    }
  }

  async function handleAllocate(additional = false) {
    setAllocError(null);
    setAllocSuccess(null);
    setAllocLoading(true);
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) return;
    const res = await fetch("/api/links", {
      method: "PUT",
      headers: { "Authorization": `Bearer ${sessionToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ additional }),
    });
    if (res.ok) {
      const data = await res.json();
      setAllocatedLinks((prev) => additional ? [...prev, ...data.allocated] : data.allocated);
      setAllocSuccess(additional ? "You have been allocated an additional link!" : "You have been allocated 3 links!");
    } else {
      setAllocError("Could not allocate links. Please try again.");
    }
    setAllocLoading(false);
  }

  if (!user) {
    return (
      <PageLayout>
        <LoadingMessage message="Loading..." />
      </PageLayout>
    );
  }
  return (
    <PageLayout>
      <DashboardLayout
        user={user}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      >
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
                onInputChange={(e) => setLinkInput(e.target.value)}
                onSubmit={handleLinkSubmit}
                success={linkSuccess}
                error={linkError}
                isUpdate={!!linkInput}
              />
            )}

            <AllocatedLinksSection
              links={allocatedLinks}
              loading={allocLoading}
              error={allocError}
              success={allocSuccess}
              onAllocate={handleAllocate}
            />
          </>
        )}
      </DashboardLayout>
    </PageLayout>
  );
}
