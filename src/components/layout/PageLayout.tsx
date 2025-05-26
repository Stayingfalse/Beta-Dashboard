import React from 'react';

interface PageLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export function PageLayout({ children, className = '' }: PageLayoutProps) {
    return (
        <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 ${className}`}>
            {children}
        </div>
    );
}
