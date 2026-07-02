"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, TrashIcon, UploadIcon, AlertCircle, CheckCircleIcon, EyeIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createProtocol, uploadDocuments } from "@/app/actions/protocol";
import { validatePDFPageCount } from "@/lib/pdf-validation";

// ... [rest of protocol-form-wizard component remains the same, but add PDF validation]

function FileUploadField({
    label,
    required,
    file,
    accept,
    maxSizeMB = 8,
    fieldId,
    onUpload,
    onRemove,
}: {
    label: string;
    required?: boolean;
    file: FileUpload;
    accept?: string;
    maxSizeMB?: number;
    fieldId: string;
    onUpload: (url: string, name: string) => void;
    onRemove: () => void;
}) {
    const [uploading, setUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        setError(null);

        if (f.size > maxSizeMB * 1024 * 1024) {
            setError(`File must be less than ${maxSizeMB}MB`);
            toast.error(`File must be less than ${maxSizeMB}MB`);
            return;
        }

        // PDF validation
        if (f.type === "application/pdf") {
            const validation = await validatePDFPageCount(f);
            if (!validation.valid) {
                setError(validation.error || "PDF validation failed");
                toast.error(validation.error || "PDF validation failed");
                return;
            }
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", f);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }
            const result = await res.json();
            onUpload(result.url, f.name);
            toast.success(`${label} uploaded successfully`);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : `Failed to upload ${label.toLowerCase()}`;
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    if (file.url) {
        return (
            <div className="space-y-1.5">
                <label className="text-sm font-medium">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{file.name || "File uploaded"}</span>
                    <a href={file.url} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900">
                        <EyeIcon className="h-4 w-4 text-green-600" />
                    </a>
                    <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 text-red-500">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type="file"
                accept={accept || ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
                className="hidden"
                id={fieldId}
                disabled={uploading}
                onChange={handleUpload}
            />
            <button
                type="button"
                onClick={() => document.getElementById(fieldId)?.click()}
                disabled={uploading}
                className="w-full rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer p-4 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {uploading ? (
                    <>
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                    </>
                ) : (
                    <>
                        <UploadIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload (max {maxSizeMB}MB)</span>
                    </>
                )}
            </button>
            {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}
        </div>
    );
}

// ... [rest of component remains unchanged]
