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
}

export default function ImageUpload({
                                        defaultUrl,
                                        onChange,
                                        endpoint,
                                    }: ImageUploadProps) {
    const [value, setValue] = useState<string | null>(defaultUrl ?? null);
    const [showDropzone, setShowDropzone] = useState<boolean>(!defaultUrl);

    const handleChangImage = (url: string | null) => {
        setValue(url);
        onChange?.(url);
    };

    if (!showDropzone && value) {
        return (
            <div className="relative">
                <div className="relative w-25 h-25 shadow-lg overflow-hidden rounded-full">
                    <Image
                        src={value ?? ""}
                        className="object-cover"
                        fill
                        alt="user image"
                    />
                </div>

                <div className="mt-3 flex gap-2">
                    <Trash className="absolute rounded-full left-40 cursor-pointer top-0 text-rose-600" />
                </div>
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