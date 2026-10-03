"use client";

import React from "react";
import { toast } from "sonner";
import { Loader2, VideoIcon } from "lucide-react";

/**
 * VideoUploadInput — extracted from feed-client.tsx (Case 13).
 *
 * Kept as the default export so it can be imported via `next/dynamic`.
 * The component owns only its own upload state; the parent receives the
 * final CDN URL through `onUpload`.
 */
export default function VideoUploadInput({
                                             onUpload,
                                         }: {
    onUpload: (url: string) => void;
}) {
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("video/")) {
            toast.error("Please select a video file");
            return;
        }
        if (file.size > 64 * 1024 * 1024) {
            toast.error("Video must be less than 65MB");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(
                `/api/upload?filename=${encodeURIComponent(file.name)}`,
                { method: "POST", body: formData },
            );

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }

            const result = await res.json();
            onUpload(result.url);
        } catch (err) {
            console.error("Video upload error:", err);
            toast.error(err instanceof Error ? err.message : "Video upload failed");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div>
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer p-5 flex flex-col items-center justify-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Uploading video...
                        </span>
                    </>
                ) : (
                    <>
                        <VideoIcon className="h-7 w-7 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Drop or click to upload a video
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            Videos up to 64MB
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}