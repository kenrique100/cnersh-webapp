"use client";

import { Trash, ImageIcon, Loader2, CropIcon, CheckIcon, UploadCloud, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useUploadThing } from "@/lib/uploadthing";
import { ACCEPTED_IMAGE_MIME_TYPES, isAcceptedImageType, prepareImageForUpload } from "@/lib/client-image-upload";

// ─── Constants ────────────────────────────────────────────────────────────────────

const PROFILE_IMAGE_QUALITY = 0.92;
const MAX_FILE_SIZE_BYTES    = 25 * 1024 * 1024; // 25 MB (matches UploadThing 32MB slot)

// ─── Types ────────────────────────────────────────────────────────────────────────

interface ImageUploadProps {
    /** Initial value — either a /api/files/<uuid> path, a CDN URL, or null */
    defaultUrl?: string | null;
    /** Called whenever the stored value changes (url = null means cleared) */
    onChange?: (url: string | null) => void;
    /** "profile" shows crop dialog + circular preview; "feed" uploads directly */
    variant?: "profile" | "feed";
    /** Optional CSS class added to the root container */
    className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────────

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

function validateImageFile(file: File): string | null {
    if (!isAcceptedImageType(file)) {
        return `Unsupported file type (${file.type}). Please use JPEG, PNG, WebP, or GIF.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max size is 25 MB.`;
    }
    return null;
}

async function deleteStoredFile(url: string): Promise<void> {
    try {
        const dbMatch = url.match(/\/api\/files\/([0-9a-f-]{36})/i);
        if (dbMatch) {
            await fetch(`/api/files/${dbMatch[1]}`, { method: "DELETE" });
            return;
        }
        if (url.includes("vercel-storage.com") || url.includes("blob.vercel")) {
            await fetch("/api/delete-blob", {
                method:  "DELETE",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ url }),
            });
        }
    } catch {
        // Best-effort
    }
}

// ─── Component ────────────────────────────────────────────────────────────────────────

export default function ImageUpload({
    defaultUrl,
    onChange,
    variant   = "profile",
    className = "",
}: ImageUploadProps) {
    const [value,       setValue]      = useState<string | null>(defaultUrl ?? null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging,  setIsDragging]  = useState(false);

    // Crop state (profile variant only)
    const [showCrop,  setShowCrop]  = useState(false);
    const [cropSrc,   setCropSrc]   = useState<string | null>(null);
    const [crop,      setCrop]      = useState<Crop>();
    const cropImageRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastNotifiedValueRef = useRef<string | null>(defaultUrl ?? null);
    const isProfile    = variant === "profile";

    // ─── UploadThing hooks ────────────────────────────────────────────────────────────

    const { startUpload: startAvatarUpload, isUploading: isUploadingAvatar } =
        useUploadThing("avatarUploader", {
            onClientUploadComplete: (res) => {
                const url = res?.[0]?.url ?? null;
                if (url) { commitValue(url); toast.success("Image uploaded successfully"); }
            },
            onUploadError: (err) => {
                setUploadError(err.message ?? "Upload failed");
            },
        });

    const { startUpload: startImageUpload, isUploading: isUploadingImage } =
        useUploadThing("imageUploader", {
            onClientUploadComplete: (res) => {
                const url = res?.[0]?.url ?? null;
                if (url) { commitValue(url); toast.success("Image uploaded successfully"); }
            },
            onUploadError: (err) => {
                setUploadError(err.message ?? "Upload failed");
            },
        });

    const isUploading = isUploadingAvatar || isUploadingImage;

    // ─── Internal helpers ────────────────────────────────────────────────────────────

    const commitValue = useCallback((url: string | null) => {
        setValue(url);
    }, []);

    useEffect(() => {
        if (isUploading) return;
        if (lastNotifiedValueRef.current === value) return;
        lastNotifiedValueRef.current = value;
        onChange?.(value);
    }, [isUploading, onChange, value]);

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        if (isProfile) {
            const { width, height } = e.currentTarget;
            setCrop(centerAspectCrop(width, height, 1));
        }
    }, [isProfile]);

    // ─── Core upload ───────────────────────────────────────────────────────────────

    const uploadFile = useCallback(async (file: File): Promise<void> => {
        let normalizedFile: File;
        try {
            normalizedFile = await prepareImageForUpload(file);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Unsupported image file");
            return;
        }

        const validationError = validateImageFile(normalizedFile);
        if (validationError) { toast.error(validationError); return; }

        setUploadError(null);

        if (isProfile) {
            await startAvatarUpload([normalizedFile]);
        } else {
            await startImageUpload([normalizedFile]);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [isProfile, startAvatarUpload, startImageUpload]);

    // ─── Event handlers ────────────────────────────────────────────────────────────

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (isProfile) {
            let normalizedFile: File;
            try {
                normalizedFile = await prepareImageForUpload(file);
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Unsupported image file");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }
            const reader = new FileReader();
            reader.onload = () => { setCropSrc(reader.result as string); setShowCrop(true); };
            reader.readAsDataURL(normalizedFile);
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
            let normalizedFile: File;
            try {
                normalizedFile = await prepareImageForUpload(file);
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Unsupported image file");
                return;
            }
            const reader = new FileReader();
            reader.onload = () => { setCropSrc(reader.result as string); setShowCrop(true); };
            reader.readAsDataURL(normalizedFile);
            return;
        }

        await uploadFile(file);
    }, [isProfile, uploadFile]);

    const handleCropConfirm = useCallback(async () => {
        if (!cropImageRef.current || !crop) return;
        try {
            const blob = await getCroppedImageBlob(cropImageRef.current, crop);
            const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
            await uploadFile(file);
            setShowCrop(false);
            setCropSrc(null);
        } catch (err) {
            console.error("[ImageUpload] crop error:", err);
            toast.error("Failed to process cropped image. Please try again.");
        }
    }, [crop, uploadFile]);

    const handleRemove = useCallback(async () => {
        if (value) await deleteStoredFile(value);
        commitValue(null);
        setUploadError(null);
    }, [value, commitValue]);

    // ─── Render: crop dialog ────────────────────────────────────────────────────────────

    if (showCrop && cropSrc) {
        return (
            <div className={`space-y-4 ${className}`}>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <CropIcon className="h-4 w-4" />
                    Crop your profile picture
                </p>
                <div className="flex justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-hidden">
                    <ReactCrop crop={crop} onChange={(c) => setCrop(c)} aspect={1} circularCrop>
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
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
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

    // ─── Render: preview (image already uploaded) ─────────────────────────────────────────

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

    // ─── Render: upload dropzone ────────────────────────────────────────────────────────────

    return (
        <div className={`relative ${className}`}>
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_MIME_TYPES.join(",")}
                onChange={handleFileSelect}
                className="sr-only"
                disabled={isUploading}
                aria-label="Upload image"
            />
            <button
                type="button"
                onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
                disabled={isUploading}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
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
                            onClick={(e) => { e.stopPropagation(); setUploadError(null); fileInputRef.current?.click(); }}
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
                                ? "JPEG, PNG or WebP · max 25 MB · cropped to circle"
                                : "JPEG, PNG, WebP or GIF · max 25 MB"}
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}
