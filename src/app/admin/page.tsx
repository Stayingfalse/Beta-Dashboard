"use client";
import React from "react";

export default function AdminDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#b30000] via-[#fffbe6] to-[#006400] bg-fixed" style={{backgroundImage: 'url("/public/snow.svg")', backgroundRepeat: 'repeat'}}>
      <div className="bg-white/90 rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col gap-6 border-4 border-[#b30000] items-center">
        <h1 className="text-3xl font-bold text-[#b30000] mb-4">Admin Dashboard</h1>
        <p className="text-lg text-gray-700">Welcome, Admin!<br/>This is a placeholder for future admin features.</p>
      </div>
    </div>
  );
}
