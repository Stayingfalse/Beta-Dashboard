import React from 'react';
import { Button } from '../ui';

interface LoadingMessageProps {
    message: string;
    className?: string;
}

interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
    className?: string;
}

interface SuccessMessageProps {
    message: string;
    className?: string;
}

export function LoadingMessage({ message, className = '' }: LoadingMessageProps) {
    return (
        <div className={`text-center text-gray-500 ${className}`}>
            {message}
        </div>
    );
}

export function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
    return (
        <div className={`text-center text-red-600 text-sm ${className}`}>
            <p>{message}</p>
            {onRetry && (
                <Button
                    onClick={onRetry}
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                >
                    Retry
                </Button>
            )}
        </div>
    );
}

export function SuccessMessage({ message, className = '' }: SuccessMessageProps) {
    return (
        <div className={`text-center text-green-600 text-sm ${className}`}>
            {message}
        </div>
    );
}
