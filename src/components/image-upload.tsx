"use client";

import { Trash, ImageIcon, Loader2, CropIcon, CheckIcon } from "lucide-react";
import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const PROFILE_IMAGE_QUALITY = 0.92;

interface ImageUploadProps {
    defaultUrl?: string | null;
    onChange?: (url: string | null) => void;
    variant?: "profile" | "feed";
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
    return centerCrop(
        makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
        mediaWidth,
        mediaHeight
    );
}

async function getCroppedImageBlob(
    image: HTMLImageElement,
    crop: Crop
): Promise<Blob> {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelCrop = {
        x: (crop.x ?? 0) * scaleX,
        y: (crop.y ?? 0) * scaleY,
        width: (crop.width ?? 0) * scaleX,
        height: (crop.height ?? 0) * scaleY,
    };
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height
    );
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
            "image/jpeg",
            PROFILE_IMAGE_QUALITY
        );
    });
}

const VERCEL_BLOB_HOSTNAME = "public.blob.vercel-storage.com";

async function deleteBlobUrl(url: string) {
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith(VERCEL_BLOB_HOSTNAME)) return;
        await fetch("/api/delete-blob", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
    } catch {
        // Best-effort deletion; do not surface errors to the user
    }
}

export default function ImageUpload({
    defaultUrl,
    onChange,
    variant = "profile",
}: ImageUploadProps) {
    const [value, setValue] = useState<string | null>(defaultUrl ?? null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop state
    const [showCrop, setShowCrop] = useState(false);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState<Crop>();
    const cropImageRef = useRef<HTMLImageElement>(null);

    const isProfile = variant === "profile";

    const handleChangeImage = (url: string | null) => {
        setValue(url);
        onChange?.(url);
    };

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        if (isProfile) {
            setCrop(centerAspectCrop(width, height, 1));
        }
    }, [isProfile]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be less than 5MB");
            return;
        }

        // For profile pictures, show crop dialog first
        if (isProfile) {
            const reader = new FileReader();
            reader.onload = () => {
                setCropSrc(reader.result as string);
                setShowCrop(true);
            };
            reader.readAsDataURL(file);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        // For feed images, upload directly
        await uploadFile(file);
    };

    const handleCropConfirm = async () => {
        if (!cropImageRef.current || !crop) return;
        setIsUploading(true);
        try {
            const blob = await getCroppedImageBlob(cropImageRef.current, crop);
            const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
            await uploadFile(file);
            setShowCrop(false);
            setCropSrc(null);
        } catch (err) {
            console.error("Crop error:", err);
            toast.error("Failed to crop image");
        } finally {
            setIsUploading(false);
        }
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                let errorMessage = "Upload failed";
                try {
                    const data = await res.json();
                    errorMessage = data.error || errorMessage;
                } catch {
                    if (res.status === 413) {
                        errorMessage = "Image file is too large for the server. Please try a smaller file.";
                    }
                }
                throw new Error(errorMessage);
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

    // Crop Dialog
    if (showCrop && cropSrc) {
        return (
            <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <CropIcon className="h-4 w-4" />
                    Crop your profile picture
                </div>
                <div className="flex justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
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
                            className="max-h-[300px] max-w-full object-contain"
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
                        {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckIcon className="h-4 w-4" />
                        )}
                        {isUploading ? "Uploading..." : "Apply & Upload"}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setShowCrop(false); setCropSrc(null); }}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (value) {
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
                        if (value) deleteBlobUrl(value);
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
                            {isProfile ? "Upload profile picture" : "Drop or click to upload an image"}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {isProfile ? "Image will be cropped to a circle" : "Images up to 5MB"}
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}