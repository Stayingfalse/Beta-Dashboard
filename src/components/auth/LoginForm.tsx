import React from 'react';
import { Input, Button, Card } from '../ui';

interface LoginFormProps {
    email: string;
    onEmailChange: (email: string) => void;
    onEmailBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    showPassword: boolean;
    buttonText: string;
    buttonDisabled: boolean;
    userStateKnown: boolean;
    error: string | null;
    onButtonDisableChange?: (disabled: boolean) => void;
    onUserStateKnownChange?: (known: boolean) => void;
}

export function LoginForm({
    email,
    onEmailChange,
    onEmailBlur,
    onSubmit,
    showPassword,
    buttonText,
    buttonDisabled,
    userStateKnown,
    error,
    onButtonDisableChange,
    onUserStateKnownChange,
}: LoginFormProps) {
    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    return (
        <Card variant="border" padding="lg" className="w-full max-w-sm flex flex-col gap-6 shadow-lg">
            <form onSubmit={onSubmit} className="flex flex-col gap-6">
                <h1 className="text-2xl font-bold text-center text-[#b30000] flex items-center justify-center gap-2">
                    <span role="img" aria-label="Santa">🎅</span>
                    Random Acts of Santa - 2025
                    <span role="img" aria-label="Tree">🎄</span>
                </h1>
                <Input
                    label="Email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="you@email.com"
                    value={email}
                    onBlur={onEmailBlur} onChange={(e) => {
                        onEmailChange(e.target.value);
                        onButtonDisableChange?.(true);
                        onUserStateKnownChange?.(false);
                    }}
                />

                {showPassword && (
                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        id="password"
                        autoComplete="current-password"
                        required
                        placeholder="••••••••"
                    />
                )}

                <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={buttonDisabled || !isValidEmail(email) || !userStateKnown}
                >
                    {buttonText}
                </Button>

                {error && (
                    <p className="text-xs text-center text-red-700 mt-2">{error}</p>
                )}

                <p className="text-xs text-center text-[#b30000] mt-2">
                    Made for Senseé, Shared with the world
                </p>
            </form>
        </Card>
    );
}
