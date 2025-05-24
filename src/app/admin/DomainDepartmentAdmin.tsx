"use client";
import React, { useEffect, useState } from "react";

interface Domain {
  uid: string;
  domain: string;
  is_enabled: boolean;
  user_count: number;
}

interface Department {
  id: number;
  name: string;
  user_count: number;
  link_count: number;
}

export default function AdminDomainDepartment() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptLoading, setDeptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [newDeptName, setNewDeptName] = useState("");

  // Fetch all domains with user counts
  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/domains")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch domains");
        setDomains(await res.json());
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load domains");
        setLoading(false);
      });
  }, []);

  // Fetch departments for selected domain
  useEffect(() => {
    if (!selectedDomain) return;
    setDeptLoading(true);
    fetch(`/api/admin/departments?domain_id=${selectedDomain.uid}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setDepartments(await res.json());
        setDeptLoading(false);
      })
      .catch(() => {
        setDeptError("Could not load departments");
        setDeptLoading(false);
      });
  }, [selectedDomain]);

  // Enable/disable domain
  async function handleToggleDomain(domain: Domain) {
    setError(null);
    const res = await fetch(`/api/admin/domains/${domain.uid}/toggle`, { method: "POST" });
    if (res.ok) {
      setDomains(domains.map(d => d.uid === domain.uid ? { ...d, is_enabled: !d.is_enabled } : d));
    } else {
      setError("Failed to update domain");
    }
  }

  // Add department
  async function handleAddDepartment() {
    if (!selectedDomain || !newDeptName.trim()) return;
    setDeptError(null);
    const res = await fetch(`/api/admin/departments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain_id: selectedDomain.uid, name: newDeptName.trim() }),
    });
    if (res.ok) {
      setNewDeptName("");
      // Refresh departments
      const depts = await res.json();
      setDepartments(depts);
    } else {
      setDeptError("Failed to add department");
    }
  }

  // Remove department
  async function handleRemoveDepartment(deptId: number) {
    if (!selectedDomain) return;
    setDeptError(null);
    const res = await fetch(`/api/admin/departments/${deptId}`, { method: "DELETE" });
    if (res.ok) {
      setDepartments(departments.filter(d => d.id !== deptId));
    } else {
      setDeptError("Failed to remove department");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-bold text-[#b30000]">Domain Management</h2>
      {loading ? (
        <div>Loading domains...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Domain</th>
              <th className="p-2">Enabled</th>
              <th className="p-2">Users</th>
              <th className="p-2">Departments</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => (
              <tr key={domain.uid} className="border-t">
                <td className="p-2 font-mono">{domain.domain}</td>
                <td className="p-2">
                  <button
                    className={domain.is_enabled ? "bg-green-600 text-white px-2 py-1 rounded" : "bg-gray-400 text-white px-2 py-1 rounded"}
                    onClick={() => handleToggleDomain(domain)}
                  >
                    {domain.is_enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
                <td className="p-2 text-center">{domain.user_count}</td>
                <td className="p-2 text-center">
                  <button
                    className="bg-blue-600 text-white px-2 py-1 rounded"
                    onClick={() => setSelectedDomain(domain)}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selectedDomain && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-[#b30000] mb-2">Departments for {selectedDomain.domain}</h3>
          {deptLoading ? (
            <div>Loading departments...</div>
          ) : deptError ? (
            <div className="text-red-600">{deptError}</div>
          ) : (
            <>
              <table className="w-full text-sm border mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2">Department</th>
                    <th className="p-2">Users</th>
                    <th className="p-2">Links</th>
                    <th className="p-2">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} className="border-t">
                      <td className="p-2">{dept.name}</td>
                      <td className="p-2 text-center">{dept.user_count}</td>
                      <td className="p-2 text-center">{dept.link_count}</td>
                      <td className="p-2 text-center">
                        <button
                          className="bg-red-600 text-white px-2 py-1 rounded"
                          onClick={() => handleRemoveDepartment(dept.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className="border px-2 py-1 rounded"
                  placeholder="New department name"
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                />
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={handleAddDepartment}
                >
                  Add Department
                </button>
                <button
                  className="ml-2 text-xs underline text-blue-700"
                  onClick={() => setSelectedDomain(null)}
                >
                  Back to Domains
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
