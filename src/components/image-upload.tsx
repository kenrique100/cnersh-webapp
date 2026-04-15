"use client";

import { Trash, ImageIcon, Loader2, CropIcon, CheckIcon, UploadCloud, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// ─── Constants ───────────────────────────────────────────────────────────────

const PROFILE_IMAGE_QUALITY = 0.92;
const MAX_FILE_SIZE_BYTES    = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES     = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageUploadProps {
    /** Initial value — either a /api/files/<uuid> path or a full URL */
    defaultUrl?: string | null;
    /** Called whenever the stored value changes (url = null means cleared) */
    onChange?: (url: string | null) => void;
    /** "profile" shows crop dialog + circular preview; "feed" uploads directly */
    variant?: "profile" | "feed";
    /** Optional CSS class added to the root container */
    className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
    return centerCrop(
        makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
        mediaWidth,
        mediaHeight
    );
}

async function getCroppedImageBlob(image: HTMLImageElement, crop: Crop): Promise<Blob> {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth  / image.width;
    const scaleY = image.naturalHeight / image.height;
    const px = {
        x:      (crop.x      ?? 0) * scaleX,
        y:      (crop.y      ?? 0) * scaleY,
        width:  (crop.width  ?? 0) * scaleX,
        height: (crop.height ?? 0) * scaleY,
    };
    canvas.width  = px.width;
    canvas.height = px.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(image, px.x, px.y, px.width, px.height, 0, 0, px.width, px.height);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
            "image/jpeg",
            PROFILE_IMAGE_QUALITY
        );
    });
}

/**
 * Validates a File before we even try to upload it.
 * Returns an error string or null if valid.
 */
function validateImageFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return `Unsupported file type (${file.type}). Please use JPEG, PNG, WebP, or GIF.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max size is 5 MB.`;
    }
    return null;
}

/**
 * Calls DELETE /api/files/<id> for DB-stored files.
 * Falls back to the legacy /api/delete-blob endpoint for old Vercel Blob URLs
 * so nothing breaks for files uploaded before the migration.
 * Always best-effort — errors are swallowed so UX is never blocked.
 */
async function deleteStoredFile(url: string): Promise<void> {
    try {
        // DB-stored file path: /api/files/<uuid>
        const dbMatch = url.match(/\/api\/files\/([0-9a-f-]{36})/i);
        if (dbMatch) {
            await fetch(`/api/files/${dbMatch[1]}`, { method: "DELETE" });
            return;
        }

        // Legacy Vercel Blob URL — send to backward-compat endpoint
        if (url.includes("vercel-storage.com") || url.includes("blob.vercel")) {
            await fetch("/api/delete-blob", {
                method:  "DELETE",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ url }),
            });
        }
        // data: URLs and other values have nothing to delete server-side
    } catch {
        // Best-effort — do not surface errors to the user
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImageUpload({
    defaultUrl,
    onChange,
    variant   = "profile",
    className = "",
}: ImageUploadProps) {
    const [value,      setValue]      = useState<string | null>(defaultUrl ?? null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging,  setIsDragging]  = useState(false);

    // Crop state (profile variant only)
    const [showCrop,  setShowCrop]  = useState(false);
    const [cropSrc,   setCropSrc]   = useState<string | null>(null);
    const [crop,      setCrop]      = useState<Crop>();
    const cropImageRef = useRef<HTMLImageElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const isProfile    = variant === "profile";

    // ── Internal helpers ──────────────────────────────────────────────────────

    const commitValue = useCallback((url: string | null) => {
        setValue(url);
        onChange?.(url);
    }, [onChange]);

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        if (isProfile) {
            const { width, height } = e.currentTarget;
            setCrop(centerAspectCrop(width, height, 1));
        }
    }, [isProfile]);

    // ── Core upload ───────────────────────────────────────────────────────────

    /**
     * Upload a File object to POST /api/upload.
     * The route returns { url: "/api/files/<uuid>", ... }.
     * We store that URL as the component value.
     */
    const uploadFile = useCallback(async (file: File): Promise<void> => {
        // Client-side guard before touching the network
        const validationError = validateImageFile(file);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body:   formData,
                // Do NOT set Content-Type manually — browser must set it
                // automatically so the multipart boundary is included.
            });

            if (!res.ok) {
                // Try to parse a JSON error body from our API route
                let message = "Upload failed";
                try {
                    const body = (await res.json()) as { error?: string };
                    if (body.error) message = body.error;
                } catch { /* ignore JSON parse error */ }

                if (res.status === 413) {
                    message = "Image is too large for the server (max 10 MB).";
                } else if (res.status === 401) {
                    message = "You must be signed in to upload images.";
                } else if (res.status === 429) {
                    message = "Too many uploads. Please wait a moment and try again.";
                }

                throw new Error(message);
            }

            const data = (await res.json()) as { url?: string; fileId?: string };

            // The upload route returns { url: "/api/files/<uuid>", fileId: "<uuid>", ... }
            const fileUrl = data.url ?? (data.fileId ? `/api/files/${data.fileId}` : null);

            if (!fileUrl) {
                throw new Error("Server did not return a file URL. Please try again.");
            }

            commitValue(fileUrl);
            toast.success("Image uploaded successfully");
        } catch (err) {
            const rawMsg = err instanceof Error ? err.message : "Upload failed";
            const msg = rawMsg.length > 120 ? "Upload failed. Please try again." : rawMsg;
            setUploadError(msg);
        } finally {
            setIsUploading(false);
            // Always reset the file input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [commitValue]);

    // ── Event handlers ────────────────────────────────────────────────────────

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (isProfile) {
            // Show crop dialog before uploading
            const reader = new FileReader();
            reader.onload = () => {
                setCropSrc(reader.result as string);
                setShowCrop(true);
            };
            reader.readAsDataURL(file);
            // Reset input early so cancel works correctly
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        await uploadFile(file);
    }, [isProfile, uploadFile]);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        if (isProfile) {
            const reader = new FileReader();
            reader.onload = () => {
                setCropSrc(reader.result as string);
                setShowCrop(true);
            };
            reader.readAsDataURL(file);
            return;
        }

        await uploadFile(file);
    }, [isProfile, uploadFile]);

    const handleCropConfirm = useCallback(async () => {
        if (!cropImageRef.current || !crop) return;
        setIsUploading(true);
        try {
            const blob = await getCroppedImageBlob(cropImageRef.current, crop);
            const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
            await uploadFile(file);
            setShowCrop(false);
            setCropSrc(null);
        } catch (err) {
            console.error("[ImageUpload] crop error:", err);
            toast.error("Failed to process cropped image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    }, [crop, uploadFile]);

    const handleRemove = useCallback(async () => {
        if (value) await deleteStoredFile(value);
        commitValue(null);
        setUploadError(null);
    }, [value, commitValue]);

    // ── Render: crop dialog ───────────────────────────────────────────────────

    if (showCrop && cropSrc) {
        return (
            <div className={`space-y-4 ${className}`}>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <CropIcon className="h-4 w-4" />
                    Crop your profile picture
                </p>
                <div className="flex justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-hidden">
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        aspect={1}
                        circularCrop
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            ref={cropImageRef}
                            src={cropSrc}
                            alt="Crop preview"
                            onLoad={onImageLoad}
                            className="max-h-[320px] max-w-full object-contain"
                        />
                    </ReactCrop>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleCropConfirm}
                        disabled={isUploading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {isUploading
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <CheckIcon className="h-4 w-4" />
                        }
                        {isUploading ? "Uploading…" : "Apply & Upload"}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setShowCrop(false); setCropSrc(null); }}
                        disabled={isUploading}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // ── Render: preview (image already uploaded) ──────────────────────────────

    if (value) {
        return (
            <div className={`relative group ${className}`}>
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
                        alt="Uploaded image preview"
                        // unoptimized because images are served from our own API route,
                        // not an external CDN, so Next.js image optimisation is unnecessary.
                        unoptimized
                    />
                </div>

                <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isUploading}
                    className={
                        isProfile
                            ? "absolute -top-1 -right-1 p-1.5 bg-white dark:bg-gray-900 rounded-full text-rose-600 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer transition-colors shadow-sm border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                            : "absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-full text-rose-600 hover:bg-white dark:hover:bg-gray-900 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                    }
                    title="Remove image"
                    aria-label="Remove uploaded image"
                >
                    <Trash className="h-4 w-4" />
                </button>
            </div>
        );
    }

    // ── Render: upload dropzone ───────────────────────────────────────────────

    return (
        <div className={`relative ${className}`}>
            <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_MIME_TYPES.join(",")}
                onChange={handleFileSelect}
                className="sr-only"
                disabled={isUploading}
                aria-label="Upload image"
            />

            <button
                type="button"
                onClick={() => {
                    setUploadError(null);
                    fileInputRef.current?.click();
                }}
                disabled={isUploading}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true);  }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={[
                    "w-full rounded-xl border-2 border-dashed p-6",
                    "flex flex-col items-center justify-center gap-2",
                    "transition-colors duration-150",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    uploadError
                        ? "border-rose-400 bg-rose-50 dark:bg-rose-950/20"
                        : isDragging
                            ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                            : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800",
                ].join(" ")}
                aria-busy={isUploading}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Uploading…</span>
                    </>
                ) : uploadError ? (
                    <>
                        <AlertCircle className="h-8 w-8 text-rose-500" />
                        <span className="text-sm text-rose-600 dark:text-rose-400 text-center">{uploadError}</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setUploadError(null);
                                fileInputRef.current?.click();
                            }}
                            className="mt-1 px-3 py-1 text-xs font-medium bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-300 rounded-md transition-colors"
                        >
                            Retry
                        </button>
                    </>
                ) : isDragging ? (
                    <>
                        <UploadCloud className="h-8 w-8 text-blue-500" />
                        <span className="text-sm text-blue-600 dark:text-blue-400">Drop image here</span>
                    </>
                ) : (
                    <>
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {isProfile ? "Upload profile picture" : "Drop or click to upload an image"}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {isProfile
                                ? "JPEG, PNG or WebP · max 5 MB · cropped to circle"
                                : "JPEG, PNG, WebP or GIF · max 5 MB"}
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}
