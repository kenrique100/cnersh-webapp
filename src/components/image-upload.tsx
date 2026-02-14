"use client";

import { OurFileRouter } from "@/app/api/uploadthing/core";
import { UploadDropzone } from "@/lib/uploadthing";
import { Trash } from "lucide-react";
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

    const handleChangImage = (url: string | null) => {
        setValue(url);
        onChange?.(url);
    };

    if (!showDropzone && value) {
        const isProfile = variant === "profile";
        return (
            <div className="relative">
                <div className={
                    isProfile
                        ? "relative w-25 h-25 shadow-lg overflow-hidden rounded-full"
                        : "relative w-full h-48 shadow-lg overflow-hidden rounded-lg"
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
                        handleChangImage(null);
                        setShowDropzone(true);
                    }}
                    className={
                        isProfile
                            ? "absolute top-0 left-40 text-rose-600 cursor-pointer"
                            : "absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-gray-900/80 rounded-full text-rose-600 hover:bg-white dark:hover:bg-gray-900 cursor-pointer transition-colors"
                    }
                >
                    <Trash className="h-5 w-5" />
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
                }}
                appearance={{ container: "rounded-xl border", button: "!bg-blue-700" }}
                onClientUploadComplete={(res) => {
                    const url = res?.[0]?.url;

                    if (url) {
                        setShowDropzone(false);
                        handleChangImage(url);
                    }
                }}
            />
        </div>
    );
}