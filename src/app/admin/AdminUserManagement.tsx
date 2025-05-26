import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserRow {
  id: string; // UUID
  email: string;
  is_admin: boolean;
  domain: string;
  domain_id: number;
  department_id: number | null;
  department_name: string | null;
  link_url: string | null;
}

interface DepartmentForDomain {
  id: number;
  name: string;
}

export default function AdminUserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainDepartments, setDomainDepartments] = useState<DepartmentForDomain[]>([]);
  const [domainFilter, setDomainFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");

  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: keyof UserRow; value: string | boolean | number } | null>(null);

  // Helper function to fetch departments for a domain
  const fetchDepartmentsForUserDomain = async (domainId: number) => {
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) {
      setError("Session token not found. Please re-login.");
      // Potentially redirect or disable editing features
      return;
    }
    setDomainDepartments([]); // Clear previous departments immediately
    try {
      const response = await fetch(`/api/admin/departments?domain_id=${domainId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.ok) {
        const depts = await response.json();
        setDomainDepartments(depts);
      } else {
        console.error("Failed to fetch departments for domain:", domainId);
        // Keep domainDepartments empty or set an error indicator if needed
      }
    } catch (e) {
      console.error("Error fetching departments:", e);
      // Keep domainDepartments empty
    }
  };

  useEffect(() => {
    // Check admin status before loading users
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) {
      router.replace("/");
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!data.user?.is_admin) {
          router.replace("/");
          return;
        }
        // Only load users if admin
        setLoading(true);
        fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        })
          .then(async (res) => {
            if (!res.ok) throw new Error();
            setUsers(await res.json());
            setLoading(false);
          })
          .catch(() => {
            setError("Could not load users");
            setLoading(false);
          });
      })
      .catch(() => {
        router.replace("/");
      });
  }, [router]);

  // Get unique domains and departments for filters
  const domains = Array.from(new Set(users.map(u => u.domain).filter(Boolean)));
  const departments = Array.from(new Set(users.map(u => u.department_name || "(No Department)").filter(Boolean)));

  // Filtered and grouped users
  const filteredUsers = users.filter(u =>
    (domainFilter ? u.domain === domainFilter : true) &&
    (departmentFilter ? u.department_name === departmentFilter : true)
  );

  // Group by domain and department
  const grouped = filteredUsers.reduce((acc, user) => {
    if (!acc[user.domain]) acc[user.domain] = {};
    const dept = user.department_name || "(No Department)";
    if (!acc[user.domain][dept]) acc[user.domain][dept] = [];
    acc[user.domain][dept].push(user);
    return acc;
  }, {} as Record<string, Record<string, UserRow[]>>);

  // Inline edit handlers
  function handleInlineEditStart(userId: string, field: keyof UserRow, value: string | boolean | number | null) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // If already editing this exact cell, do nothing.
    if (inlineEdit && inlineEdit.id === userId && inlineEdit.field === field) {
        return;
    }

    // If starting a new inline edit (different cell or different user), cancel any existing one.
    // This ensures domainDepartments is cleared if the previous edit was a department.
    if (inlineEdit) {
        handleInlineEditCancel(); // Clears inlineEdit and domainDepartments
    }
    
    // Set the new inline edit state. Convert null to empty string for select compatibility.
    setInlineEdit({ id: userId, field, value: value === null ? "" : value });

    if (field === "department_id" && user.domain_id) {
      fetchDepartmentsForUserDomain(user.domain_id);
    }
  }

  function handleInlineEditChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    if (!inlineEdit) return;
    let value: string | boolean | number = event.target.value;
    if (inlineEdit.field === "department_id") {
      value = value === "" ? "" : Number(value); // Use empty string for no department, number for valid
    }
    setInlineEdit({ ...inlineEdit, value });
  }

  async function handleInlineEditSave() {
    if (!inlineEdit) return;
    const user = users.find(u => u.id === inlineEdit.id);
    if (!user) {
      setInlineEdit(null); // User not found, clear edit state
      setDomainDepartments([]); // Clear departments if any were fetched
      return;
    }

    const apiPayload: { id: string; email?: string; department_id?: string | null; is_admin?: boolean } = { id: user.id };
    const optimisticChanges: Partial<UserRow> = {};

    if (inlineEdit.field === "email") {
      apiPayload.email = inlineEdit.value as string;
      optimisticChanges.email = inlineEdit.value as string;
    } else if (inlineEdit.field === "department_id") {
      const selectedDeptId = inlineEdit.value === "" ? null : Number(inlineEdit.value);
      apiPayload.department_id = selectedDeptId === null ? null : selectedDeptId.toString(); // send as string or null
      optimisticChanges.department_id = selectedDeptId;
      const selectedDept = domainDepartments.find(d => d.id === selectedDeptId);
      optimisticChanges.department_name = selectedDept ? selectedDept.name : null;
    } else if (inlineEdit.field === "is_admin") {
      // The 'is_admin' inline editor uses a select with "true"/"false" strings.
      // Or, if it were a checkbox, inlineEdit.value would be boolean.
      // The current select for is_admin in JSX sets inlineEdit.value to boolean directly.
      const isAdminValue = typeof inlineEdit.value === 'string' 
                           ? inlineEdit.value === 'true' 
                           : !!inlineEdit.value;
      apiPayload.is_admin = isAdminValue;
      optimisticChanges.is_admin = isAdminValue;
    } else {
      // Field not actively handled for inline editing (e.g. "domain" has no input)
      setInlineEdit(null);
      setDomainDepartments([]); // Clear departments
      return;
    }

    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) {
        setError("Session expired. Please log in again.");
        setInlineEdit(null);
        setDomainDepartments([]);
        return;
    }
    
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(apiPayload),
    });

    if (res.ok) {
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === user.id ? { ...u, ...optimisticChanges } : u
      ));
    } else {
      let errorMsg = "Inline update failed. Please try again.";
      try {
        const errorData = await res.json();
        errorMsg = errorData.message || errorMsg;
      } catch {
        /* ignore parsing error, use default message */
      }
      alert(errorMsg);
    }
    setInlineEdit(null);
    setDomainDepartments([]); 
  }

  function handleInlineEditCancel() {
    setInlineEdit(null);
    setDomainDepartments([]); // Clear departments when cancelling an inline edit
  }

  // Restore handleDelete function (needed for Delete button)
  async function handleDelete(user: UserRow) {
    if (!window.confirm(`Delete user ${user.email}?`)) return;
    const sessionToken = localStorage.getItem("session_token");
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ id: user.id }),
    });
    if (res.ok) {
      setUsers(users.filter(u => u.id !== user.id));
    } else {
      alert("Failed to delete user");
    }
  }

  return (
    <div className="flex flex-col gap-8 mt-8">
      <h2 className="text-xl font-bold text-[#b30000]">User Management</h2>
      <div className="flex gap-4 mb-4">
        <label className="flex flex-col text-xs">
          Filter by Domain
          <select className="border rounded px-2 py-1" value={domainFilter} onChange={event => { setDomainFilter(event.target.value); setDepartmentFilter(""); }}>
            <option value="">All Domains</option>
            {domains.map(domain => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          Filter by Department
          <select className="border rounded px-2 py-1" value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)}>
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div>Loading users...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        Object.entries(grouped).map(([domain, deptObj]) => (
          <div key={domain} className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-blue-800">Domain: {domain}</h3>
            </div>
            {Object.entries(deptObj).map(([dept, usersInDept]) => (
              <div key={dept} className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-md font-semibold text-green-800">Department: {dept}</h4>
                </div>
                <table className="w-full text-sm border border-gray-300 rounded-lg overflow-hidden shadow-md">
                  <thead>
                    <tr className="bg-[#b30000] text-white">
                      <th className="p-3 font-semibold">Email</th>
                      <th className="p-3 font-semibold">Domain</th>
                      <th className="p-3 font-semibold">Department</th>
                      <th className="p-3 font-semibold">Link</th>
                      <th className="p-3 font-semibold">Admin</th>
                      <th className="p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersInDept.map((user, idx) => (
                      <tr key={user.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-100 transition-colors`}>
                        <td className="p-3 font-mono text-gray-900" onDoubleClick={() => handleInlineEditStart(user.id, "email", user.email)}>
                          {inlineEdit && inlineEdit.id === user.id && inlineEdit.field === "email" ? (
                            <input
                              type="email"
                              className="border px-1 py-0.5 rounded text-gray-900 w-full bg-white"
                              value={inlineEdit.value as string}
                              onChange={handleInlineEditChange}
                              onBlur={handleInlineEditSave}
                              onKeyDown={event => { if (event.key === "Enter") handleInlineEditSave(); if (event.key === "Escape") handleInlineEditCancel(); }}
                              autoFocus
                            />
                          ) : user.email}
                        </td>
                        <td className="p-3 text-gray-900" /* Domain not inline editable with input currently */ >
                          {user.domain}
                        </td>
                        <td className="p-3 text-gray-900" onDoubleClick={() => handleInlineEditStart(user.id, "department_id", user.department_id)}> 
                          {inlineEdit && inlineEdit.id === user.id && inlineEdit.field === "department_id" ? (
                            <select
                              className="border px-1 py-0.5 rounded text-gray-900 bg-white w-full"
                              value={inlineEdit.value as string} // Will be department_id or ""
                              onChange={handleInlineEditChange} // Updates inlineEdit.value
                              onBlur={handleInlineEditSave}
                              onKeyDown={event => { if (event.key === "Enter") handleInlineEditSave(); if (event.key === "Escape") handleInlineEditCancel(); }}
                              autoFocus
                            >
                              <option value="">No Department</option>
                              {domainDepartments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                              ))}
                            </select>
                          ) : (user.department_name || <span className="italic text-gray-400">None</span>)}
                        </td>
                        <td className="p-3 text-center">
                          {user.link_url ? (
                            <a href={user.link_url} target="_blank" rel="noopener noreferrer" className="underline text-blue-700 hover:text-blue-900">Open</a>
                          ) : (
                            <span className="italic text-gray-400">No link</span>
                          )}
                        </td>
                        <td className="p-3 text-center" onDoubleClick={() => handleInlineEditStart(user.id, "is_admin", user.is_admin)}>
                          {inlineEdit && inlineEdit.id === user.id && inlineEdit.field === "is_admin" ? (
                            <select
                              className="border px-1 py-0.5 rounded text-gray-900 bg-white"
                              value={String(inlineEdit.value)} // Ensure value is string "true" or "false"
                              onChange={event => {
                                if (!inlineEdit) return;
                                setInlineEdit({ ...inlineEdit, value: event.target.value === "true" });
                              }}
                              onBlur={handleInlineEditSave}
                              onKeyDown={event => { if (event.key === "Enter") handleInlineEditSave(); if (event.key === "Escape") handleInlineEditCancel(); }}
                              autoFocus
                            >
                              <option value="true">✔️</option>
                              <option value="false">❌</option>
                            </select>
                          ) : (
                            user.is_admin ? <span title="Admin" className="text-green-600 text-lg">✔️</span> : <span title="Not admin" className="text-red-600 text-lg">❌</span>
                          )}
                        </td>
                        <td className="p-3 text-center flex gap-2 justify-center">
                          <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow" onClick={() => handleDelete(user)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
