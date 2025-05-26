import React from 'react';
import { Button } from '../ui';

interface DomainDisabledMessageProps {
    onLogout: () => void;
}

export function DomainDisabledMessage({ onLogout }: DomainDisabledMessageProps) {
    return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 text-sm rounded flex flex-col gap-4">
            <div>
                <p className="font-semibold">Domain Disabled</p>
                <p>Your email domain has been disabled by an administrator. Please contact support for assistance.</p>
            </div>
            <Button onClick={onLogout} variant="danger" className="w-full">
                Logout
            </Button>
        </div>
    );
}
