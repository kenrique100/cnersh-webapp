"use client";

import { OurFileRouter } from "@/app/api/uploadthing/core";
import { UploadDropzone } from "@/lib/uploadthing";
import { Trash, ImageIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ImageUploadProps {
    defaultUrl?: string | null;
    onChange?: (url: string | null) => void;
    endpoint: keyof OurFileRouter;
    variant?: "profile" | "feed";
}

export default function ImageUpload({
                                        defaultUrl,
                                        onChange,
                                        endpoint,
                                        variant = "profile",
                                    }: ImageUploadProps) {
    const [value, setValue] = useState<string | null>(defaultUrl ?? null);
    const [showDropzone, setShowDropzone] = useState<boolean>(!defaultUrl);

    const handleChangeImage = (url: string | null) => {
        setValue(url);
        onChange?.(url);
    };

    if (!showDropzone && value) {
        const isProfile = variant === "profile";
        return (
            <div className="relative group">
                <div className={
                    isProfile
                        ? "relative w-24 h-24 shadow-lg overflow-hidden rounded-full border-2 border-gray-200 dark:border-gray-700"
                        : "relative w-full h-48 shadow-lg overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                }>
                    <Image
                        src={value ?? ""}
                        className="object-cover"
                        fill
                        alt="uploaded image"
                    />
                </div>

                <button
                    type="button"
                    onClick={() => {
                        handleChangeImage(null);
                        setShowDropzone(true);
                    }}
                    className={
                        isProfile
                            ? "absolute -top-1 -right-1 p-1.5 bg-white dark:bg-gray-900 rounded-full text-rose-600 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer transition-colors shadow-sm border border-gray-200 dark:border-gray-700"
                            : "absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-full text-rose-600 hover:bg-white dark:hover:bg-gray-900 cursor-pointer transition-colors shadow-sm"
                    }
                    title="Remove image"
                >
                    <Trash className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <UploadDropzone
                endpoint={endpoint}
                content={{
                    label: value
                        ? "Drop or click to replace the image"
                        : "Drop or click to upload an image",
                    allowedContent: "Images up to 4MB",
                }}
                appearance={{
                    container: "rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer",
                    button: "!bg-blue-700 !text-white text-sm",
                    label: "text-sm text-gray-600 dark:text-gray-400",
                }}
                onClientUploadComplete={(res) => {
                    const url = res?.[0]?.url;

                    if (url) {
                        setShowDropzone(false);
                        handleChangeImage(url);
                    }
                }}
            />
        </div>
    );
}