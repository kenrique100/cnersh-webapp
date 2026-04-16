"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";

export default function TrackingCodeCopyButton({ trackingCode }: { trackingCode: string }) {
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);

    const handleCopy = async () => {
        if (!navigator?.clipboard?.writeText) {
            setCopied(false);
            setCopyFailed(true);
            setTimeout(() => setCopyFailed(false), 1500);
            return;
        }

        try {
            await navigator.clipboard.writeText(trackingCode);
            setCopied(true);
            setCopyFailed(false);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
            setCopyFailed(true);
            setTimeout(() => setCopyFailed(false), 1500);
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-6 w-6 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:text-indigo-200 dark:hover:bg-indigo-900/70"
            title={copyFailed ? "Failed to copy tracking code" : copied ? "Copied" : "Copy tracking code"}
            aria-label="Copy tracking code"
        >
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
        </Button>
    );
}
