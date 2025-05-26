import React from 'react';
import Link from "next/link";

interface DashboardLayoutProps {
    children: React.ReactNode;
    user: { email: string };
    isAdmin?: boolean;
    onLogout?: () => void;
    className?: string;
}

export function DashboardLayout({
    children,
    user,
    isAdmin = false,
    onLogout,
    className = ''
}: DashboardLayoutProps) {
    return (
        <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 ${className}`}>
            <div className="bg-white/90 rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-6">
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-2xl font-bold text-center text-gray-900 flex-1">Dashboard</h1>
                    {isAdmin && (
                        <Link
                            href="/admin"
                            className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
                        >
                            Admin Area
                        </Link>
                    )}
                </div>
                <p className="text-center text-gray-700">
                    Logged in as <span className="font-mono">{user.email}</span>
                </p>

                {children}

                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    >
                        Logout
                    </button>
                )}
            </div>
        </div>
    );
}
