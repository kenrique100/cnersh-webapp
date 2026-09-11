"use client";

import React from "react";
import { FileTextIcon, LinkIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_FILE_SIZES } from "@/lib/file-limits";

export interface ProtocolDocument {
    url: string;
    name: string;
}

interface BaseFieldProps {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
}

const MAX_PROTOCOL_DOCUMENT_MB = MAX_FILE_SIZES.document / (1024 * 1024);

function FieldShell({
    id,
    label,
    required,
    hint,
    error,
    children,
}: BaseFieldProps & { children: React.ReactNode }) {
    const descriptionId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor={id} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {label}
                </label>
                {required && (
                    <span className="text-xs font-medium text-red-700 dark:text-red-300">
                        Required
                    </span>
                )}
            </div>
            {children}
            {hint && (
                <p id={descriptionId} className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} role="alert" className="text-sm text-red-700 dark:text-red-300">
                    {error}
                </p>
            )}
        </div>
    );
}

export function ProtocolTextField({
    id,
    label,
    value,
    onChange,
    required,
    hint,
    error,
    type = "text",
    placeholder,
    min,
    max,
}: BaseFieldProps & {
    value: string;
    onChange: (value: string) => void;
    type?: React.HTMLInputTypeAttribute;
    placeholder?: string;
    min?: string | number;
    max?: string | number;
}) {
    return (
        <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
            <Input
                id={id}
                name={id}
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                min={min}
                max={max}
                required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
                    .filter(Boolean)
                    .join(" ") || undefined}
                data-testid={`input-${id}`}
                className="min-h-11"
            />
        </FieldShell>
    );
}

export function ProtocolTextArea({
    id,
    label,
    value,
    onChange,
    required,
    hint,
    error,
    placeholder,
    rows = 5,
}: BaseFieldProps & {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
}) {
    return (
        <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
            <Textarea
                id={id}
                name={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={rows}
                required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
                    .filter(Boolean)
                    .join(" ") || undefined}
                data-testid={`textarea-${id}`}
                className="min-h-28 resize-y"
            />
        </FieldShell>
    );
}

export function ProtocolSelectField({
    id,
    label,
    value,
    onChange,
    required,
    hint,
    error,
    options,
    placeholder = "Select an option",
}: BaseFieldProps & {
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
}) {
    return (
        <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
            <select
                id={id}
                name={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
                    .filter(Boolean)
                    .join(" ") || undefined}
                data-testid={`select-${id}`}
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </FieldShell>
    );
}

export function ProtocolDocumentField({
    id,
    label,
    value,
    onChange,
    required,
    hint,
    error,
}: BaseFieldProps & {
    value: ProtocolDocument;
    onChange: (value: ProtocolDocument) => void;
}) {
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadError, setUploadError] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    const uploadFile = async (file: File) => {
        setUploadError("");
        if (file.size > MAX_FILE_SIZES.document) {
            setUploadError(`The document must be ${MAX_PROTOCOL_DOCUMENT_MB} MB or smaller.`);
            return;
        }

        setIsUploading(true);
        try {
            const body = new FormData();
            body.append("file", file);
            const response = await fetch("/api/upload", { method: "POST", body });
            const result = (await response.json()) as { url?: string; name?: string; error?: string };
            if (!response.ok || !result.url) {
                throw new Error(result.error || "Upload failed");
            }
            onChange({ url: result.url, name: result.name || file.name });
        } catch (uploadFailure) {
            setUploadError(
                uploadFailure instanceof Error
                    ? uploadFailure.message
                    : "The document could not be uploaded."
            );
        } finally {
            setIsUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const displayError = error || uploadError;
    return (
        <FieldShell id={id} label={label} required={required} hint={hint} error={displayError}>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                        ref={inputRef}
                        id={`${id}-file`}
                        type="file"
                        aria-label={`Upload ${label}`}
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="sr-only"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void uploadFile(file);
                        }}
                        data-testid={`file-${id}`}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => inputRef.current?.click()}
                        disabled={isUploading}
                        className="min-h-11 justify-center rounded-md"
                        data-testid={`button-upload-${id}`}
                    >
                        {isUploading ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <UploadIcon className="h-4 w-4" aria-hidden="true" />
                        )}
                        {isUploading ? "Uploading" : "Choose document"}
                    </Button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        PDF or Word, up to {MAX_PROTOCOL_DOCUMENT_MB} MB
                    </span>
                </div>

                <div className="my-3 flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">or use a URL</span>
                    <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>

                <div className="relative">
                    <LinkIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <Input
                        id={id}
                        name={id}
                        type="url"
                        value={value.url}
                        onChange={(event) =>
                            onChange({
                                url: event.target.value,
                                name: value.name || "Linked document",
                            })
                        }
                        placeholder="https://example.org/document.pdf"
                        required={required}
                        aria-invalid={Boolean(displayError)}
                        aria-describedby={[hint ? `${id}-hint` : "", displayError ? `${id}-error` : ""]
                            .filter(Boolean)
                            .join(" ") || undefined}
                        data-testid={`input-${id}`}
                        className="min-h-11 pl-9 pr-10"
                    />
                    {value.url && (
                        <button
                            type="button"
                            onClick={() => onChange({ url: "", name: "" })}
                            aria-label={`Remove ${label}`}
                            className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                            data-testid={`button-remove-${id}`}
                        >
                            <XIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                </div>
                {value.url && (
                    <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <FileTextIcon className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
                        <span className="truncate">{value.name || value.url}</span>
                    </div>
                )}
            </div>
        </FieldShell>
    );
}
