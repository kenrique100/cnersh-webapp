"use client";

import React from "react";
import Image from "next/image";
import { ImageIcon, UploadCloud, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
    createPreviewBlobUrl,
    revokePreviewBlobUrl,
    prepareImageForUpload,
    cropImageToSquareFile,
} from "@/lib/client-image-upload";

export type ImageUploadVariant = "feed" | "profile";

interface ImageUploadProps {
    variant?: ImageUploadVariant;
    defaultUrl?: string | null;
    onChange?: (url: string | null) => void;
}

export default function ImageUpload({
                                        variant = "feed",
                                        defaultUrl = null,
                                        onChange,
                                    }: ImageUploadProps) {
    // Only set after a SUCCESSFUL upload (or from defaultUrl)
    const [imageUrl, setImageUrl] = React.useState<string | null>(() => defaultUrl ?? null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [lastFile, setLastFile] = React.useState<File | null>(null);
    const [isDragActive, setIsDragActive] = React.useState(false);
    const [previewBlobUrl, setPreviewBlobUrl] = React.useState<string | null>(null);

    // Crop state
    const [showCrop, setShowCrop] = React.useState(false);
    const [cropSrc, setCropSrc] = React.useState<string | null>(null);
    const [crop, setCrop] = React.useState<Crop>({
        unit: "px",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });
    const [completedCrop, setCompletedCrop] = React.useState<PixelCrop | null>(null);
    const imgRef = React.useRef<HTMLImageElement | null>(null);

    const inputRef = React.useRef<HTMLInputElement | null>(null);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (previewBlobUrl) revokePreviewBlobUrl(previewBlobUrl);
            if (cropSrc) revokePreviewBlobUrl(cropSrc);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openFilePicker = () => inputRef.current?.click();

    const handleSelectedFile = (file: File) => {
        setLastFile(file);
        setError(null);

        // Profile variant: show the crop UI before uploading
        if (variant === "profile") {
            const blobUrl = createPreviewBlobUrl(file);
            if (cropSrc) revokePreviewBlobUrl(cropSrc);
            setCropSrc(blobUrl);
            setCrop({ unit: "px", x: 0, y: 0, width: 0, height: 0 });
            setCompletedCrop(null);
            setShowCrop(true);
            return;
        }

        // Feed variant: upload immediately, show a blob preview while it uploads
        const blobUrl = createPreviewBlobUrl(file);
        if (previewBlobUrl) revokePreviewBlobUrl(previewBlobUrl);
        setPreviewBlobUrl(blobUrl);

        void uploadFile(file);
    };

    const uploadFile = async (fileOrDataUrl: File | string | null) => {
        if (!fileOrDataUrl) return;

        setIsUploading(true);
        setError(null);

        try {
            let fileToUpload: File =
                fileOrDataUrl instanceof File
                    ? fileOrDataUrl
                    : new File([fileOrDataUrl], "image.png", { type: "image/png" });

            if (fileToUpload.type.startsWith("image/")) {
                fileToUpload = await prepareImageForUpload(fileToUpload);
            }

            const formData = new FormData();
            formData.append("file", fileToUpload);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "Upload failed");
            }

            // Clean up preview URLs on success
            if (previewBlobUrl) {
                revokePreviewBlobUrl(previewBlobUrl);
                setPreviewBlobUrl(null);
            }
            if (cropSrc) {
                revokePreviewBlobUrl(cropSrc);
                setCropSrc(null);
            }

            setImageUrl(json.url);
            onChange?.(json.url);
            toast.success("Image uploaded successfully");
            setShowCrop(false);
            setLastFile(null);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Upload failed";
            setError(errorMsg);
            toast.error(errorMsg);
            // Stay in whichever branch is currently showing so error UI is visible
        } finally {
            setIsUploading(false);
        }
    };

    // Called once the crop <img> has finished loading so we can position
    // a sensible initial square in the upper-center of the image.
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const size = Math.min(width, height) * 0.8;
        const x = (width - size) / 2;
        // Prefer the top ~5% so the face/head isn't clipped, but never overflow.
        const y = Math.min(height - size, height * 0.05);
        setCrop({ unit: "px", x, y, width: size, height: size });
    };

    const handleApplyAndUpload = async () => {
        if (
            !imgRef.current ||
            !completedCrop ||
            completedCrop.width === 0 ||
            completedCrop.height === 0
        ) {
            toast.error("Please select a crop area first");
            return;
        }

        try {
            setIsUploading(true);
            setError(null);

            const croppedFile = await cropImageToSquareFile(
                imgRef.current,
                completedCrop,
                512
            );

            await uploadFile(croppedFile);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to crop image";
            setError(errorMsg);
            toast.error(errorMsg);
            setIsUploading(false);
        }
    };

    const handleCancelCrop = () => {
        if (cropSrc) revokePreviewBlobUrl(cropSrc);
        setCropSrc(null);
        setCrop({ unit: "px", x: 0, y: 0, width: 0, height: 0 });
        setCompletedCrop(null);
        setShowCrop(false);
        setLastFile(null);
        setError(null);
    };

    const handleRetry = async () => {
        if (!lastFile) return;
        const blobUrl = createPreviewBlobUrl(lastFile);
        if (previewBlobUrl) revokePreviewBlobUrl(previewBlobUrl);
        setPreviewBlobUrl(blobUrl);
        await uploadFile(lastFile);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        handleSelectedFile(files[0]);
        e.currentTarget.value = "";
    };

    const handleRemove = () => {
        if (previewBlobUrl) {
            revokePreviewBlobUrl(previewBlobUrl);
            setPreviewBlobUrl(null);
        }
        setImageUrl(null);
        onChange?.(null);
    };

    // ─── render ─────────────────────────────────────────────────────────────

    // Branch 1: successful upload / defaultUrl → show preview + remove button
    if (imageUrl && !isUploading && !error && !showCrop) {
        return (
            <div className="relative">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="sr-only"
                    data-testid="image-file-input"
                />
                <div className="flex flex-col items-center gap-2">
                    {variant === "profile" ? (
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                            <Image
                                src={imageUrl}
                                alt="Uploaded profile picture"
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className="relative w-full max-w-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <Image
                                src={imageUrl}
                                alt="Uploaded image preview"
                                width={400}
                                height={300}
                                className="w-full h-auto"
                                unoptimized
                            />
                        </div>
                    )}
                    <button
                        type="button"
                        aria-label="Remove uploaded image"
                        onClick={handleRemove}
                        className="text-xs text-red-600 hover:text-red-700 hover:underline"
                    >
                        Remove
                    </button>
                </div>
            </div>
        );
    }

    // Branch 2: profile crop UI
    if (showCrop && cropSrc) {
        return (
            <div className="relative">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="sr-only"
                    data-testid="image-file-input"
                />
                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Crop your profile picture
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Drag the square to reposition. The selected area will be resized to
                            fit your profile circle.
                        </p>
                    </div>

                    <div className="flex justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-auto max-h-[420px]">
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={1}
                            keepSelection
                            minWidth={50}
                            minHeight={50}
                        >
                            <img
                                ref={imgRef}
                                src={cropSrc}
                                alt="Crop preview"
                                onLoad={handleImageLoad}
                                style={{ maxHeight: 400, maxWidth: "100%" }}
                            />
                        </ReactCrop>
                    </div>

                    {error && (
                        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                    )}

                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={handleCancelCrop}
                            disabled={isUploading}
                            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleApplyAndUpload}
                            disabled={isUploading || !completedCrop}
                            className="px-3 py-1.5 text-xs rounded-md bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Uploading…
                                </>
                            ) : (
                                "Apply & Upload"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Branch 3: dropzone (idle / uploading / error / drag-active)
    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="sr-only"
                data-testid="image-file-input"
            />
            <div
                role="button"
                tabIndex={0}
                data-testid="image-dropzone"
                aria-busy={isUploading}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                onClick={openFilePicker}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openFilePicker();
                    }
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragActive(false);
                    const f = e.dataTransfer?.files?.[0];
                    if (f) handleSelectedFile(f);
                }}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Uploading…</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-6 w-6 text-red-500" data-testid="icon-AlertCircle" />
                        <span className="text-sm text-red-600 dark:text-red-400 text-center">
                            {error}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                void handleRetry();
                            }}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Retry
                        </button>
                    </div>
                ) : isDragActive ? (
                    <div className="flex flex-col items-center gap-2">
                        <UploadCloud className="h-6 w-6 text-blue-600" data-testid="icon-UploadCloud" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Drop image here
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="h-6 w-6 text-gray-400" data-testid="icon-Image" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {variant === "profile"
                                ? "Upload profile picture"
                                : "Drop or click to upload an image"}
                        </span>
                        {variant === "profile" && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                You&apos;ll be able to crop it before upload.
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}