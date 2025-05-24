"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string; domain?: string } | null>(null);
  const [domainEnabled, setDomainEnabled] = useState<boolean | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [linkLoading, setLinkLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);
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
          setLink(data.link.url);
          setLinkInput(data.link.url);
        } else {
          setLink(null);
        }
        setLinkLoading(false);
      })
      .catch(() => {
        setLinkError("Could not load your wishlist link.");
        setLinkLoading(false);
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
    if (!linkInput.trim()) {
      setLinkError("Please enter your Amazon UK wishlist link.");
      return;
    }
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Authorization": `Bearer ${sessionToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: linkInput.trim() }),
    });
    if (res.ok) {
      setLink(linkInput.trim());
      setLinkSuccess(true);
    } else {
      setLinkError("Could not save your link. Please try again.");
    }
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
        {linkLoading ? (
          <div className="text-center text-gray-500">Loading your wishlist info...</div>
        ) : link ? (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 text-sm rounded flex flex-col gap-2">
            <div>Thank you for sharing your Amazon UK wishlist!</div>
            <div className="break-all"><span className="font-semibold">Your link:</span> <a href={link} target="_blank" rel="noopener noreferrer" className="underline text-green-800">{link}</a></div>
            <form onSubmit={handleLinkSubmit} className="flex flex-col gap-2 mt-2">
              <label htmlFor="wishlist-link-update" className="text-xs text-gray-700">Update your wishlist link:</label>
              <input
                id="wishlist-link-update"
                type="url"
                className="rounded border border-green-400 px-2 py-1"
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                required
                pattern="https://www.amazon.co.uk/hz/wishlist/.*"
              />
              <button type="submit" className="bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700">Update Link</button>
              {linkSuccess && <div className="text-green-700 text-xs">Link updated!</div>}
              {linkError && <div className="text-red-600 text-xs">{linkError}</div>}
            </form>
          </div>
        ) : (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 text-sm rounded flex flex-col gap-2">
            <div>Welcome! Please post your Amazon UK wishlist link below so Santa can find you 🎅</div>
            <form onSubmit={handleLinkSubmit} className="flex flex-col gap-2 mt-2">
              <label htmlFor="wishlist-link" className="text-xs text-gray-700">Amazon UK Wishlist Link:</label>
              <input
                id="wishlist-link"
                type="url"
                className="rounded border border-blue-400 px-2 py-1"
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                required
                pattern="https://www.amazon.co.uk/hz/wishlist/.*"
                placeholder="https://www.amazon.co.uk/hz/wishlist/your-link"
              />
              <button type="submit" className="bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700">Submit Link</button>
              {linkSuccess && <div className="text-green-700 text-xs">Link saved!</div>}
              {linkError && <div className="text-red-600 text-xs">{linkError}</div>}
            </form>
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
