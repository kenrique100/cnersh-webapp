"use client";

import React from "react";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import { sanitizeUrl } from "@/lib/sanitize";

interface LinkPreviewProps {
    url: string;
    className?: string;
}

interface PreviewData {
    title: string;
    description: string;
    image: string;
    domain: string;
}

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return url;
    }
}

/**
 * The link-preview API falls back to a small Google favicon when the target
 * page has no og:image. That image is a 128px square — rendering it as a
 * full-width banner stretches it into a blurry mess, so we detect it and
 * render it as a small inline icon instead.
 */
function isFaviconUrl(image: string): boolean {
    return image.includes("s2/favicons");
}

export default function LinkPreview({ url, className = "" }: LinkPreviewProps) {
    const [preview, setPreview] = React.useState<PreviewData | null>(null);
    const [imageError, setImageError] = React.useState(false);
    const safeUrl = React.useMemo(() => sanitizeUrl(url), [url]);
    const domain = React.useMemo(() => getDomain(url), [url]);

    React.useEffect(() => {
        if (!safeUrl) return;

        const target = safeUrl;
        let cancelled = false;

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
            }
        }

        fetchPreview();
        return () => {
            cancelled = true;
        };
    }, [safeUrl]);

    if (!safeUrl) return null;

    const title = preview?.title || domain;
    const description = preview?.description || "";
    const image = preview?.image || "";
    const displayDomain = preview?.domain || domain;

    const hasFavicon = image && isFaviconUrl(image);
    const hasBanner = image && !isFaviconUrl(image) && !imageError;
    const showFavicon = hasFavicon || (image && imageError);

    return (
        <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 block rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group overflow-hidden ${className}`}
        >
            {hasBanner && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[1.91/1] object-cover bg-gray-100 dark:bg-gray-800"
                    onError={() => setImageError(true)}
                />
            )}
            <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 leading-snug">
                    {title}
                </p>
                {description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {description}
                    </p>
                )}

                {/* Domain row */}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 dark:text-gray-500">
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
                        <GlobeIcon className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate">{displayDomain}</span>
                    <ExternalLinkIcon className="h-3 w-3 shrink-0 ml-auto" />
                </div>

                {/* Full URL — matches the reference images */}
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate group-hover:underline">
                    {safeUrl}
                </div>
            </div>
        </a>
    );
}