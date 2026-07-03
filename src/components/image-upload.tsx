"use client";

import React from "react";
import Image from "next/image";
import { ImageIcon, UploadCloud, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ReactCrop from "react-image-crop";
import {
    createPreviewBlobUrl,
    revokePreviewBlobUrl,
    prepareImageForUpload,
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
    const [imageUrl, setImageUrl] = React.useState<string | null>(
        () => defaultUrl ?? null
    );
    const [isUploading, setIsUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [showCrop, setShowCrop] = React.useState(false);
    const [lastFile, setLastFile] = React.useState<File | null>(null);
    const [isDragActive, setIsDragActive] = React.useState(false);
    const [previewBlobUrl, setPreviewBlobUrl] = React.useState<string | null>(null);

    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        return () => {
            if (previewBlobUrl) {
                revokePreviewBlobUrl(previewBlobUrl);
            }
        };
    }, [previewBlobUrl]);

    const openFilePicker = () => inputRef.current?.click();

    const handleSelectedFile = (file: File) => {
        setLastFile(file);
        setError(null);

        if (variant === "profile") {
            setShowCrop(true);
            return;
        }

        // Create blob preview but do NOT set imageUrl yet —
        // imageUrl controls which top-level branch renders.
        // We stay in the dropzone branch so uploading/error UI is visible.
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

            // Success — now switch to image-preview branch
            if (previewBlobUrl) {
                revokePreviewBlobUrl(previewBlobUrl);
                setPreviewBlobUrl(null);
            }

            setImageUrl(json.url);
            onChange?.(json.url);
            toast.success("Image uploaded successfully");
            setShowCrop(false);
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : "Upload failed";
            setError(errorMsg);
            toast.error(errorMsg);
            // Stay in dropzone branch so error UI is visible
        } finally {
            setIsUploading(false);
        }
    };

    const handleApplyAndUpload = () => {
        if (!lastFile) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const result = e.target?.result;
            if (typeof result === "string") {
                await uploadFile(result);
            } else {
                setError("Upload failed");
            }
        };
        reader.readAsDataURL(lastFile);
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

    // ─── render ────────────────────────────────────────────────────────────────

    // Branch 1: successful upload / defaultUrl → show preview + remove button
    if (imageUrl && !isUploading && !error) {
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
                <div>
                    <Image
                        src={imageUrl}
                        alt="Uploaded image preview"
                        width={400}
                        height={300}
                        unoptimized
                    />
                    <div>
                        <button
                            aria-label="Remove uploaded image"
                            onClick={handleRemove}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Branch 2: profile crop UI
    if (showCrop) {
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
                <div>
                    <p>Crop your profile picture</p>
                    <ReactCrop onChange={() => {}}>
                        <div />
                    </ReactCrop>
                    <div>
                        <button onClick={handleApplyAndUpload}>
                            Apply &amp; Upload
                        </button>
                        <button
                            onClick={() => {
                                setShowCrop(false);
                                setLastFile(null);
                            }}
                        >
                            Cancel
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
                className="w-full rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 transition-colors"
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
                    <div>
                        <p>Uploading…</p>
                    </div>
                ) : error ? (
                    <div>
                        <AlertCircle data-testid="icon-AlertCircle" />
                        <span>{error}</span>
                        <div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void handleRetry();
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                ) : isDragActive ? (
                    <div>
                        <UploadCloud data-testid="icon-UploadCloud" />
                        <span>Drop image here</span>
                    </div>
                ) : (
                    <div>
                        <ImageIcon data-testid="icon-Image" />
                        <span>
                            {variant === "profile"
                                ? "Upload profile picture"
                                : "Drop or click to upload an image"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}