"use client";

import React from "react";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import { getCtaLabel } from "@/components/cta-link-button";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PreviewData {
    title: string;
    description: string;
    image: string;
    domain: string;
}

interface LinkPreviewCardProps {
    /** The URL to preview */
    url: string;
    /** CTA link type stored on the post (e.g. "apply_now", "visit_website") */
    linkType?: string | null;
    /** Whether the post already has user-uploaded media (photo/video) */
    hasMedia?: boolean;
    className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return url;
    }
}

function isSafeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

// ─── Custom Hook: Fetch OG Metadata ────────────────────────────────────────

function useLinkPreview(url: string) {
    const [preview, setPreview] = React.useState<PreviewData | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);

        async function fetchPreview() {
            try {
                const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setPreview(data);
                }
            } catch (err) {
                console.error("Link preview fetch error:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchPreview();
        return () => { cancelled = true; };
    }, [url]);

    return { preview, loading };
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Reusable link preview card for posts.
 *
 * - **No user media** → large banner image (og:image) at top, title, description, domain, and CTA button.
 * - **Has user media** → compact card without banner image: title, description, domain, and CTA button.
 * - **No OG metadata** → fallback card with domain and default icon.
 */
export default function LinkPreviewCard({
    url,
    linkType,
    hasMedia = false,
    className = "",
}: LinkPreviewCardProps) {
    const { preview, loading } = useLinkPreview(url);
    const [imageError, setImageError] = React.useState(false);

    const domain = React.useMemo(() => getDomain(url), [url]);
    const ctaLabel = getCtaLabel(linkType);

    if (!isSafeUrl(url)) return null;

    const title = preview?.title || domain;
    const description = preview?.description || "";
    const image = preview?.image || "";
    const displayDomain = preview?.domain || domain;
    const showBannerImage = !hasMedia && image && !imageError;

    // Skeleton while loading
    if (loading) {
        return (
            <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden animate-pulse ${className}`}>
                {!hasMedia && (
                    <div className="w-full h-[200px] bg-gray-200 dark:bg-gray-800" />
                )}
                <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                </div>
            </div>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 hover:shadow-md transition-all group overflow-hidden ${className}`}
        >
            {/* Large banner image — only when user has NOT uploaded media */}
            {showBannerImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={image}
                    alt={title}
                    className="w-full h-[200px] sm:h-[250px] object-cover bg-gray-100 dark:bg-gray-800"
                    onError={() => setImageError(true)}
                />
            )}

            {/* Card body */}
            <div className="p-3 sm:p-4">
                {/* Title */}
                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 leading-snug">
                    {title}
                </p>

                {/* Description */}
                {description && (
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {description}
                    </p>
                )}

                {/* Footer: domain + CTA button */}
                <div className="flex items-center justify-between gap-2 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 min-w-0">
                        <GlobeIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{displayDomain}</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600 text-white group-hover:bg-blue-700 dark:bg-blue-500 dark:group-hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0">
                        {ctaLabel}
                        <ExternalLinkIcon className="h-3 w-3" />
                    </span>
                </div>
            </div>
        </a>
    );
}
