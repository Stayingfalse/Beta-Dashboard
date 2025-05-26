"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLayout, LoginForm } from "../components";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [buttonText, setButtonText] = useState("Sign In");
  const [buttonDisabled, setButtonDisabled] = useState(true);
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
            // Removed setToken
          }
        })
        .catch(() => setError("Could not create guest session."));
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
    } catch {
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
          localStorage.setItem("session_token", data.token); // upgrade to authenticated
          router.replace("/dashboard");
        }
        setButtonText("Signed In");
        setButtonDisabled(true);
      } catch {
        setError("Could not sign up. Please try again.");
      }
    } else if (showPassword) {
      // Admin sign in flow
      const passwordInput = (document.getElementById("password") as HTMLInputElement)?.value;
      if (!passwordInput) {
        setError("Password required for admin sign in.");
        return;
      }
      try {
        const res = await apiFetch("/api/auth", {
          method: "POST",
          body: JSON.stringify({ email, password: passwordInput }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || "Admin sign in failed. Please try again.");
          return;
        }
        const data = await res.json();
        if (data.token) {
          localStorage.setItem("session_token", data.token);
          router.replace("/dashboard");
        } else {
          setError("Admin sign in failed. Please try again.");
        }
        setButtonText("Signed In");
        setButtonDisabled(true);
      } catch {
        setError("Could not sign in. Please try again.");
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
          localStorage.setItem("session_token", data.token);
          router.replace("/dashboard");
        }
        setButtonText("Signed In");
        setButtonDisabled(true);
      } catch {
        setError("Could not sign in. Please try again.");
      }
    }
  }

  return (
    <PageLayout>
      <LoginForm
        email={email}
        onEmailChange={setEmail}
        onEmailBlur={handleEmailBlur}
        onSubmit={handleSubmit}
        showPassword={showPassword}
        buttonText={buttonText}
        buttonDisabled={buttonDisabled}
        userStateKnown={userStateKnown}
        error={error}
        onButtonDisableChange={setButtonDisabled}
        onUserStateKnownChange={setUserStateKnown}
      />
    </PageLayout>
  );
}
