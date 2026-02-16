"use client";

import { Trash, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface ImageUploadProps {
    defaultUrl?: string | null;
    onChange?: (url: string | null) => void;
    variant?: "profile" | "feed";
}

export default function ImageUpload({
    defaultUrl,
    onChange,
    variant = "profile",
}: ImageUploadProps) {
    const [value, setValue] = useState<string | null>(defaultUrl ?? null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChangeImage = (url: string | null) => {
        setValue(url);
        onChange?.(url);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 4 * 1024 * 1024) {
            toast.error("Image must be less than 4MB");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Upload failed");
            }

            const data = await res.json();
            if (data.url) {
                handleChangeImage(data.url);
            }
        } catch (err) {
            console.error("Upload error:", err);
            toast.error(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    if (value) {
        const isProfile = variant === "profile";
        return (
            <div className="relative group">
                <div
                    className={
                        isProfile
                            ? "relative w-24 h-24 shadow-lg overflow-hidden rounded-full border-2 border-gray-200 dark:border-gray-700"
                            : "relative w-full h-48 shadow-lg overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                    }
                >
                    <Image
                        src={value}
                        className="object-cover"
                        fill
                        alt="uploaded image"
                        unoptimized
                    />
                </div>

                <button
                    type="button"
                    onClick={() => {
                        handleChangeImage(null);
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
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer p-6 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Uploading...
                        </span>
                    </>
                ) : (
                    <>
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Drop or click to upload an image
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            Images up to 4MB
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}