"use client";

import { MarsIcon, UserIcon, VenusIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    name?: string | null;
    image?: string | null;
    gender?: string | null;
    className?: string;
    fallbackClassName?: string;
    iconClassName?: string;
}

function getSafeImageSrc(image?: string | null): string | undefined {
    if (!image) return undefined;

    const value = image.trim();
    if (!value) return undefined;

    if (value.startsWith("/") || value.startsWith("data:image/") || value.startsWith("blob:")) {
        return value;
    }

    try {
        const parsed = new URL(value);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return value;
        }
    } catch {
        return undefined;
    }

    return undefined;
}

export default function UserAvatar({
    name,
    image,
    gender,
    className,
    fallbackClassName,
    iconClassName,
}: UserAvatarProps) {
    const safeImage = getSafeImageSrc(image);
    const normalizedGender = gender?.toLowerCase();
    const isFemale = normalizedGender === "female";
    const isMale = normalizedGender === "male";

    return (
        <Avatar className={className}>
            {safeImage && <AvatarImage src={safeImage} alt={name || "User"} />}
            <AvatarFallback
                className={cn(
                    "text-white",
                    isFemale && "bg-pink-600 dark:bg-pink-500",
                    isMale && "bg-blue-700 dark:bg-blue-600",
                    !isFemale && !isMale && "bg-gray-600 dark:bg-gray-500",
                    fallbackClassName
                )}
            >
                {isFemale ? (
                    <VenusIcon className={cn("h-4 w-4", iconClassName)} />
                ) : isMale ? (
                    <MarsIcon className={cn("h-4 w-4", iconClassName)} />
                ) : (
                    <UserIcon className={cn("h-4 w-4", iconClassName)} />
                )}
            </AvatarFallback>
        </Avatar>
    );
}
