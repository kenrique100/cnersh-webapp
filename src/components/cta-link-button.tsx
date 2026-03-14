"use client";

import React from "react";
import { ExternalLinkIcon } from "lucide-react";

/** Supported CTA link types and their display labels */
export const CTA_LINK_TYPES = [
    { value: "apply_now", label: "Apply Now" },
    { value: "visit_website", label: "Visit Website" },
    { value: "click_here", label: "Click Here" },
] as const;

export type CtaLinkType = (typeof CTA_LINK_TYPES)[number]["value"];

export const DEFAULT_LINK_TYPE: CtaLinkType = "visit_website";

/** Get the display label for a given link type, with fallback */
export function getCtaLabel(linkType: string | null | undefined): string {
    const found = CTA_LINK_TYPES.find((t) => t.value === linkType);
    return found ? found.label : "Visit Website";
}

/** Only allow safe URL protocols */
function isSafeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

interface CtaLinkButtonProps {
    url: string;
    linkType?: string | null;
    className?: string;
}

/** Compact CTA button that replaces the rich link preview card */
export default function CtaLinkButton({ url, linkType, className = "" }: CtaLinkButtonProps) {
    const label = getCtaLabel(linkType);

    if (!isSafeUrl(url)) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                bg-blue-600 text-white hover:bg-blue-700
                dark:bg-blue-500 dark:hover:bg-blue-600
                transition-colors shadow-sm ${className}`}
        >
            {label}
            <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
    );
}
