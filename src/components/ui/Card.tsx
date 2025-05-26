import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'border' | 'shadow';
}

export function Card({ children, className = '', padding = 'md', variant = 'default' }: CardProps) {
    const baseClasses = 'bg-white/90 rounded-xl';

    const paddingClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    const variantClasses = {
        default: '',
        border: 'border-4 border-[#b30000]',
        shadow: 'shadow-lg',
    };

    return (
        <div className={`${baseClasses} ${paddingClasses[padding]} ${variantClasses[variant]} ${className}`}>
            {children}
        </div>
    );
}
