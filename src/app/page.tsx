"use client";
import React, { useState, useEffect } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [buttonText, setButtonText] = useState("Sign In");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Session token management
  useEffect(() => {
    // Check for token in localStorage
    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) {
      // No token, request guest session from backend
      fetch("/api/auth", { method: "GET" })
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to create guest session");
          const data = await res.json();
          if (data.token) {
            localStorage.setItem("session_token", data.token);
            setToken(data.token);
          }
        })
        .catch((err) => setError("Could not create guest session: " + err.message));
    } else {
      setToken(sessionToken);
    }
  }, []);

  // Helper to always send token with API calls
  async function apiFetch(url: string, options: RequestInit = {}) {
    const sessionToken = localStorage.getItem("session_token");
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        "Authorization": sessionToken ? `Bearer ${sessionToken}` : "",
        "Content-Type": "application/json",
      },
    });
  }

  async function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value;
    setEmail(value);
    setError(null);
    setButtonDisabled(true);
    setShowPassword(false);
    if (!value) return;
    try {
      const res = await apiFetch("/api/auth", {
        method: "POST",
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) {
        const errText = await res.text();
        setError(`Server error: ${res.status} ${errText}`);
        return;
      }
      const data = await res.json();
      if (!data.exists) {
        setButtonText("Sign Up");
        setButtonDisabled(false);
      } else if (data.is_admin) {
        setShowPassword(true);
        setButtonText("Sign In");
        setButtonDisabled(false);
      } else {
        setShowPassword(false);
        setButtonText("Sign In");
        setButtonDisabled(false);
        if (data.token) setToken(data.token);
      }
    } catch (err) {
      setError("Network or server error: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (buttonText === "Sign Up") {
      // Sign up flow
      try {
        const res = await apiFetch("/api/auth", {
          method: "PUT",
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const errText = await res.text();
          setError(`Sign up failed: ${res.status} ${errText}`);
          return;
        }
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          localStorage.setItem("session_token", data.token); // upgrade to authenticated
        }
        setButtonText("Signed In");
        setButtonDisabled(true);
      } catch (err) {
        setError("Sign up failed: " + (err instanceof Error ? err.message : String(err)));
      }
    } else {
      // Sign in flow (non-admin)
      if (token) {
        setButtonText("Signed In");
        setButtonDisabled(true);
      } else if (showPassword) {
        // TODO: Implement admin password sign-in
        setError("Admin password sign-in not implemented.");
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
      <form
        className="bg-white/90 rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-6"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Sign in to your account
        </h1>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="you@email.com"
            onBlur={handleEmailBlur}
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>
        {showPassword && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>
        )}
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          disabled={buttonDisabled}
        >
          {buttonText}
        </button>
        {error && (
          <p className="text-xs text-center text-red-500 mt-2">{error}</p>
        )}
        {token && (
          <p className="text-xs text-center text-green-600 mt-2">
            Signed in! Token: {token}
          </p>
        )}
        <p className="text-xs text-center text-gray-500 mt-2">
          Don&apos;t have an account?{" "}
          <a
            href="#"
            className="text-blue-600 hover:underline"
          >
            Sign up
          </a>
        </p>
        <p className="text-xs text-center text-gray-400 mt-4">v0.0.03</p>
      </form>
    </div>
  );
}
