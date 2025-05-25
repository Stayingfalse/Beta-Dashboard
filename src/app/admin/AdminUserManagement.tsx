import React, { useEffect, useState } from "react";

interface UserRow {
  id: string;
  email: string;
  is_admin: boolean;
  domain: string;
  department_id: string | null;
  department_name: string | null;
  link_url: string | null;
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editDepartment, setEditDepartment] = useState<string | null>(null);
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [domainFilter, setDomainFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");

  // Inline editing state
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: keyof UserRow; value: string | boolean } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/users")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setUsers(await res.json());
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load users");
        setLoading(false);
      });
  }, []);

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

  function handleEdit(user: UserRow) {
    setEditUser(user);
    setEditEmail(user.email);
    setEditDepartment(user.department_id);
    setEditIsAdmin(user.is_admin);
    setEditError(null);
    setEditSuccess(false);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError(null);
    setEditSuccess(false);
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editUser.id,
        email: editEmail,
        department_id: editDepartment,
        is_admin: editIsAdmin,
      }),
    });
    if (res.ok) {
      setEditSuccess(true);
      setUsers(users.map(u => u.id === editUser.id ? { ...u, email: editEmail, department_id: editDepartment, is_admin: editIsAdmin } : u));
      setEditUser(null);
    } else {
      setEditError("Failed to update user");
    }
  }

  async function handleDelete(user: UserRow) {
    if (!window.confirm(`Delete user ${user.email}?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    if (res.ok) {
      setUsers(users.filter(u => u.id !== user.id));
    } else {
      alert("Failed to delete user");
    }
  }

  // Inline edit handlers
  function handleInlineEditStart(userId: string, field: keyof UserRow, value: string | boolean) {
    setInlineEdit({ id: userId, field, value });
  }
  function handleInlineEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    if (!inlineEdit) return;
    setInlineEdit({ ...inlineEdit, value: e.target.value });
  }
  async function handleInlineEditSave() {
    if (!inlineEdit) return;
    const user = users.find(u => u.id === inlineEdit.id);
    if (!user) return;
    const updated = { ...user, [inlineEdit.field]: inlineEdit.value };
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        email: inlineEdit.field === "email" ? inlineEdit.value : user.email,
        department_id: inlineEdit.field === "department_id" ? inlineEdit.value : user.department_id,
        is_admin: inlineEdit.field === "is_admin" ? inlineEdit.value : user.is_admin,
      }),
    });
    if (res.ok) {
      setUsers(users.map(u => u.id === user.id ? { ...u, ...updated } : u));
    }
    setInlineEdit(null);
  }
  function handleInlineEditCancel() {
    setInlineEdit(null);
  }

  // Handler to filter by domain or department from click
  function handleDomainFilterClick(domain: string) {
    setDomainFilter(domain);
    setDepartmentFilter("");
  }
  function handleDepartmentFilterClick(department: string) {
    setDepartmentFilter(department);
  }

  return (
    <div className="flex flex-col gap-8 mt-8">
      <h2 className="text-xl font-bold text-[#b30000]">User Management</h2>
      <div className="flex gap-4 mb-4">
        <label className="flex flex-col text-xs">
          Filter by Domain
          <select className="border rounded px-2 py-1" value={domainFilter} onChange={e => { setDomainFilter(e.target.value); setDepartmentFilter(""); }}>
            <option value="">All Domains</option>
            {domains.map(domain => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          Filter by Department
          <select className="border rounded px-2 py-1" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
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
              <button
                className="ml-2 px-2 py-0.5 bg-gray-200 hover:bg-blue-200 rounded text-xs font-mono border border-blue-400"
                onClick={() => handleDomainFilterClick(domain)}
                title={`Show only users in domain: ${domain}`}
              >
                {Object.values(deptObj).reduce((sum, arr) => sum + arr.length, 0)} users
              </button>
            </div>
            {Object.entries(deptObj).map(([dept, usersInDept]) => (
              <div key={dept} className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-md font-semibold text-green-800">Department: {dept}</h4>
                  <button
                    className="ml-2 px-2 py-0.5 bg-gray-200 hover:bg-green-200 rounded text-xs font-mono border border-green-400"
                    onClick={() => handleDepartmentFilterClick(dept)}
                    title={`Show only users in department: ${dept}`}
                  >
                    {usersInDept.length} users
                  </button>
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
                              className="border px-1 py-0.5 rounded text-gray-900 w-full"
                              value={inlineEdit.value as string}
                              onChange={handleInlineEditChange}
                              onBlur={handleInlineEditSave}
                              onKeyDown={e => { if (e.key === "Enter") handleInlineEditSave(); if (e.key === "Escape") handleInlineEditCancel(); }}
                              autoFocus
                            />
                          ) : user.email}
                        </td>
                        <td className="p-3 text-gray-900" onDoubleClick={() => handleInlineEditStart(user.id, "domain", user.domain)}>
                          {user.domain}
                        </td>
                        <td className="p-3 text-gray-900" onDoubleClick={() => handleInlineEditStart(user.id, "department_id", user.department_id || "")}> 
                          {inlineEdit && inlineEdit.id === user.id && inlineEdit.field === "department_id" ? (
                            <input
                              type="text"
                              className="border px-1 py-0.5 rounded text-gray-900 w-full"
                              value={inlineEdit.value as string}
                              onChange={handleInlineEditChange}
                              onBlur={handleInlineEditSave}
                              onKeyDown={e => { if (e.key === "Enter") handleInlineEditSave(); if (e.key === "Escape") handleInlineEditCancel(); }}
                              autoFocus
                            />
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
                              className="border px-1 py-0.5 rounded text-gray-900"
                              value={inlineEdit.value ? "true" : "false"}
                              onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value === "true" })}
                              onBlur={handleInlineEditSave}
                              onKeyDown={e => { if (e.key === "Enter") handleInlineEditSave(); if (e.key === "Escape") handleInlineEditCancel(); }}
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
                          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow" onClick={() => handleEdit(user)}>Edit</button>
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
      {editUser && (
        <form onSubmit={handleEditSubmit} className="bg-white border rounded-lg shadow-md p-6 flex flex-col gap-4 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-[#b30000]">Edit User</h3>
          <label className="flex flex-col gap-1">
            Email
            <input type="email" className="border px-2 py-1 rounded text-gray-900" value={editEmail} onChange={e => setEditEmail(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1">
            Department ID
            <input type="text" className="border px-2 py-1 rounded text-gray-900" value={editDepartment || ""} onChange={e => setEditDepartment(e.target.value)} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={editIsAdmin} onChange={e => setEditIsAdmin(e.target.checked)} />
            Admin
          </label>
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow">Save</button>
            <button type="button" className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded shadow" onClick={() => setEditUser(null)}>Cancel</button>
          </div>
          {editError && <div className="text-red-600 text-sm">{editError}</div>}
          {editSuccess && <div className="text-green-700 text-sm">User updated!</div>}
        </form>
      )}
    </div>
  );
}
