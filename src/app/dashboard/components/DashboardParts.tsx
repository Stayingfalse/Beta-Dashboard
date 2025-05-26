import React from "react";

export function DomainDisabledMessage({ onLogout }: { onLogout: () => void }) {
  return (
    <>
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 text-sm rounded">
        The domain for your email is not recognised or enabled.<br />
        Please check you used your work email, or contact your organisation to be set up.
      </div>
      <button
        onClick={onLogout}
        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors mt-4"
      >
        Logout
      </button>
    </>
  );
}

export function DepartmentSelect({
  departments,
  value,
  onChange,
  error,
  label = "Select your department:",
  disabledOption = "Select department",
}: {
  departments: Array<{ id: number; name: string }>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string | null;
  label?: string;
  disabledOption?: string;
}) {
  return (
    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 text-sm rounded flex flex-col gap-2">
      <label htmlFor="department-select" className="text-xs text-gray-700">{label}</label>
      <select
        id="department-select"
        className="rounded border border-blue-400 px-2 py-1"
        value={value}
        onChange={onChange}
      >
        <option value="" disabled>{disabledOption}</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id.toString()}>{dept.name}</option>
        ))}
      </select>
      {error && <div className="text-red-600 text-xs">{error}</div>}
    </div>
  );
}

export function DepartmentCurrent({
  department,
  departments,
  onChange,
  error,
}: {
  department: { id: number; name: string };
  departments: Array<{ id: number; name: string }>;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string | null;
}) {
  return (
    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 text-sm rounded flex flex-col gap-2">
      <div>Your department: <span className="font-semibold">{department.name}</span></div>
      <label htmlFor="department-select" className="text-xs text-gray-700">Change department:</label>
      <select
        id="department-select"
        className="rounded border border-blue-400 px-2 py-1"
        value={department.id.toString()}
        onChange={onChange}
      >
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id.toString()}>{dept.name}</option>
        ))}
      </select>
      {error && <div className="text-red-600 text-xs">{error}</div>}
    </div>
  );
}

export function NoDepartmentsMessage() {
  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 text-sm rounded">
      No departments found for your domain. Your domain will be used as your group.
    </div>
  );
}

export function WishlistLinkForm({
  linkInput,
  onInputChange,
  onSubmit,
  success,
  error,
  isUpdate,
}: {
  linkInput: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  success: boolean;
  error: string | null;
  isUpdate?: boolean;
}) {
  return (
    <div className={isUpdate ? "bg-green-100 border-l-4 border-green-500 text-green-700" : "bg-blue-100 border-l-4 border-blue-500 text-blue-700" + " p-4 text-sm rounded flex flex-col gap-2"}>
      {isUpdate ? (
        <>
          <div>Thank you for sharing your Amazon UK wishlist!</div>
        </>
      ) : (
        <div>Welcome! Please post your Amazon UK wishlist link below so Santa can find you 🎅</div>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-2 mt-2">
        <label htmlFor={isUpdate ? "wishlist-link-update" : "wishlist-link"} className="text-xs text-gray-700">
          {isUpdate ? "Update your wishlist link:" : "Amazon UK Wishlist Link:"}
        </label>
        <input
          id={isUpdate ? "wishlist-link-update" : "wishlist-link"}
          type="url"
          className={isUpdate ? "rounded border border-green-400 px-2 py-1" : "rounded border border-blue-400 px-2 py-1"}
          value={linkInput}
          onChange={onInputChange}
          required
          pattern="https://www.amazon.co.uk/hz/wishlist/.*"
          placeholder={isUpdate ? undefined : "https://www.amazon.co.uk/hz/wishlist/your-link"}
        />
        <button type="submit" className={isUpdate ? "bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700" : "bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700"}>
          {isUpdate ? "Update Link" : "Submit Link"}
        </button>
        {success && <div className="text-green-700 text-xs">{isUpdate ? "Link updated!" : "Link saved!"}</div>}
        {error && <div className="text-red-600 text-xs">{error}</div>}
      </form>
    </div>
  );
}

export function LoadingMessage({ message }: { message: string }) {
  return <div className="text-center text-gray-500">{message}</div>;
}
