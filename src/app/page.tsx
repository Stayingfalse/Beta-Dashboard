"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [buttonText, setButtonText] = useState("Sign In");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        .catch((err) => setError("Could not create guest session."));
    } else {
      setToken(sessionToken);
    }
  }, []);

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    const sessionToken = localStorage.getItem("session_token");
    if (sessionToken) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
        .then(async (res) => {
          if (res.ok) router.replace("/dashboard");
        });
    }
  }, [router]);

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

  // Email validation helper
  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Track if we know the user state (sign in or sign up)
  const [userStateKnown, setUserStateKnown] = useState(false);

  async function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value;
    setEmail(value);
    setError(null);
    setButtonDisabled(true);
    setShowPassword(false);
    setUserStateKnown(false);
    if (!value || !isValidEmail(value)) {
      setButtonDisabled(true);
      setUserStateKnown(false);
      return;
    }
    try {
      // Only check if user exists and if admin, do not authenticate or create session here
      const res = await apiFetch("/api/auth", {
        method: "POST",
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) {
        setError("Server error. Please try again.");
        setUserStateKnown(false);
        return;
      }
      const data = await res.json();
      setUserStateKnown(true);
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
      }
    } catch (err) {
      setError("Could not check email. Please try again.");
      setUserStateKnown(false);
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
          setError("Sign up failed. Please try again.");
          return;
        }
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          localStorage.setItem("session_token", data.token); // upgrade to authenticated
          router.replace("/dashboard");
        }
        setButtonText("Signed In");
        setButtonDisabled(true);
      } catch (err) {
        setError("Could not sign up. Please try again.");
      }
    } else {
      // Sign in flow (non-admin)
      try {
        const res = await apiFetch("/api/auth", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          setError("Sign in failed. Please try again.");
          return;
        }
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          localStorage.setItem("session_token", data.token);
          router.replace("/dashboard");
        } else if (data.is_admin) {
          setError("Admin password sign-in not implemented.");
        }
        setButtonText("Signed In");
        setButtonDisabled(true);
      } catch (err) {
        setError("Could not sign in. Please try again.");
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
            onChange={(e) => {
              setEmail(e.target.value);
              setButtonDisabled(true);
              setUserStateKnown(false);
            }}
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
          disabled={buttonDisabled || !isValidEmail(email) || !userStateKnown}
        >
          {buttonText}
        </button>
        {error && (
          <p className="text-xs text-center text-red-500 mt-2">{error}</p>
        )}
        <p className="text-xs text-center text-gray-500 mt-2">
          Made for Senseé, Shared with the world{" "}
        </p>
      </form>
    </div>
  );
}
