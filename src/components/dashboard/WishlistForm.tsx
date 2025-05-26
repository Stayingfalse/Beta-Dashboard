import React from 'react';
import { Input, Button } from '../ui';

interface WishlistLinkFormProps {
    linkInput: string;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    success: boolean;
    error: string | null;
    isUpdate?: boolean;
}

export function WishlistLinkForm({
    linkInput,
    onInputChange,
    onSubmit,
    success,
    error,
    isUpdate,
}: WishlistLinkFormProps) {
    const bgColor = isUpdate ? "bg-green-100 border-green-500 text-green-700" : "bg-blue-100 border-blue-500 text-blue-700";
    const buttonVariant = isUpdate ? "success" : "primary";

    return (
        <div className={`${bgColor} border-l-4 p-4 text-sm rounded flex flex-col gap-2`}>
            {isUpdate ? (
                <div>Thank you for sharing your Amazon UK wishlist!</div>
            ) : (
                <div>Welcome! Please post your Amazon UK wishlist link below so Santa can find you 🎅</div>
            )}

            <form onSubmit={onSubmit} className="flex flex-col gap-2 mt-2">
                <Input
                    label={isUpdate ? "Update your wishlist link:" : "Amazon UK Wishlist Link:"}
                    type="url"
                    value={linkInput}
                    onChange={onInputChange}
                    required
                    pattern="https://www.amazon.co.uk/hz/wishlist/.*"
                    placeholder={isUpdate ? undefined : "https://www.amazon.co.uk/hz/wishlist/your-link"}
                    className={isUpdate ? "border-green-400" : "border-blue-400"}
                />

                <Button type="submit" variant={buttonVariant}>
                    {isUpdate ? "Update Link" : "Submit Link"}
                </Button>

                {success && (
                    <div className="text-green-700 text-xs">
                        {isUpdate ? "Link updated!" : "Link saved!"}
                    </div>
                )}
                {error && (
                    <div className="text-red-600 text-xs">{error}</div>
                )}
            </form>
        </div>
    );
}
