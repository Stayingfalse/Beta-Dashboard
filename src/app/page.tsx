"use client";

import React, { useState } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  // Simulate API check for password requirement
  async function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const email = e.target.value;
    // TODO: Replace with real API call
    if (email.endsWith("@requirepass.com")) {
      setShowPassword(true);
    } else {
      setShowPassword(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
      <form className="bg-white/90 rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Sign in to your account
        </h1>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
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
        >
          Sign In
        </button>
        <p className="text-xs text-center text-gray-500 mt-2">
          Don&apos;t have an account?{" "}
          <a
            href="#"
            className="text-blue-600 hover:underline"
          >
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
