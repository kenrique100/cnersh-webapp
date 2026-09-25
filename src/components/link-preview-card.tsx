"use client";

import React from "react";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import { getCtaLabel } from "@/components/cta-link-button";
import { sanitizeUrl } from "@/lib/sanitize";

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

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return url;
    }
}

function isFaviconUrl(image: string): boolean {
    return image.includes("s2/favicons");
}

function useLinkPreview(safeUrl: string | null) {
    const [preview, setPreview] = React.useState<PreviewData | null>(null);
    const [loading, setLoading] = React.useState(!!safeUrl);

    React.useEffect(() => {
        if (!safeUrl) {
            Promise.resolve().then(() => setLoading(false));
            return;
        }

        const target = safeUrl;
        let cancelled = false;

        Promise.resolve().then(() => {
            if (!cancelled) setLoading(true);
        });

        async function fetchPreview() {
            try {
                const res = await fetch(
                    `/api/link-preview?url=${encodeURIComponent(target)}`
                );
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

        return () => {
            cancelled = true;
        };
    }, [safeUrl]);

    return { preview, loading };
}

export default function LinkPreviewCard({
                                            url,
                                            linkType,
                                            hasMedia = false,
                                            className = "",
                                        }: LinkPreviewCardProps) {
    const safeUrl = React.useMemo(() => sanitizeUrl(url), [url]);
    const { preview, loading } = useLinkPreview(safeUrl);
    const [imageError, setImageError] = React.useState(false);

    const domain = React.useMemo(() => getDomain(url), [url]);
    const ctaLabel = getCtaLabel(linkType ?? undefined);

    if (!safeUrl) return null;

    const title = preview?.title || domain;
    const description = preview?.description || "";
    const image = preview?.image || "";
    const displayDomain = preview?.domain || domain;

    const hasFavicon = image && isFaviconUrl(image);
    const hasBanner = image && !isFaviconUrl(image) && !imageError;
    const showFavicon = hasFavicon || (image && imageError);

    // When the post already has media, use the compact horizontal layout.
    // Otherwise use the vertical layout matching the WhatsApp-style reference.
    const useCompactLayout = hasMedia && (hasBanner || hasFavicon);

    if (loading) {
        return (
            <div
                className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden animate-pulse ${className}`}
            >
                {useCompactLayout ? (
                    <div className="flex">
                        <div className="w-[120px] h-[120px] bg-gray-200 dark:bg-gray-800 shrink-0" />
                        <div className="flex-1 p-4 space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-full aspect-[1.91/1] bg-gray-200 dark:bg-gray-800" />
                        <div className="p-4 space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all group overflow-hidden ${className}`}
        >
            {useCompactLayout ? (
                // Horizontal: user already posted media, so the preview sits inline.
                <div className="flex">
                    {hasBanner ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={image}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-[120px] h-auto object-cover bg-gray-100 dark:bg-gray-800 shrink-0"
                            onError={() => setImageError(true)}
                        />
                    ) : showFavicon ? (
                        <div className="w-[120px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={image}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="h-8 w-8 rounded-md"
                                onError={() => setImageError(true)}
                            />
                        </div>
                    ) : (
                        <div className="w-[120px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 shrink-0">
                            <GlobeIcon className="h-8 w-8 text-gray-400" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0 p-3 space-y-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 leading-snug">
                            {title}
                        </p>
                        {description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                {description}
                            </p>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 pt-1">
                            <GlobeIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{displayDomain}</span>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 truncate group-hover:underline">
                            {safeUrl}
                        </div>
                    </div>
                </div>
            ) : (
                // Vertical: standard chat-bubble layout (matches Image 2).
                <>
                    {hasBanner && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={image}
                            alt={title}
                            referrerPolicy="no-referrer"
                            className="w-full aspect-[1.91/1] object-cover bg-gray-100 dark:bg-gray-800"
                            onError={() => setImageError(true)}
                        />
                    )}

                    <div className="p-3 sm:p-4 space-y-1.5">
                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 leading-snug">
                            {title}
                        </p>

                        {description && (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                {description}
                            </p>
                        )}

                        {/* Domain row */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 pt-1">
                            {showFavicon && hasFavicon ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={image}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="h-3.5 w-3.5 shrink-0 rounded-sm"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <GlobeIcon className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span className="truncate">{displayDomain}</span>
                        </div>

                        {/* Full URL — matches Image 2 */}
                        <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 truncate group-hover:underline">
                            {safeUrl}
                        </div>

                        {ctaLabel && (
                            <div className="pt-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600 text-white group-hover:bg-blue-700 dark:bg-blue-500 dark:group-hover:bg-blue-600 transition-colors whitespace-nowrap">
                                    {ctaLabel}
                                    <ExternalLinkIcon className="h-3 w-3" />
                                </span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </a>
    );
}