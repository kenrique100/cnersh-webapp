"use client";

import React from "react";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";

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

export default function LinkPreview({ url, className = "" }: LinkPreviewProps) {
    const [preview, setPreview] = React.useState<PreviewData | null>(null);
    const [imageError, setImageError] = React.useState(false);
    const domain = React.useMemo(() => getDomain(url), [url]);

    React.useEffect(() => {
        let cancelled = false;
        async function fetchPreview() {
            try {
                const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setPreview(data);
                }
            } catch {
                // Silently fail - fallback UI will show
            }
        }
        fetchPreview();
        return () => { cancelled = true; };
    }, [url]);

    const title = preview?.title || domain;
    const description = preview?.description || "";
    const image = preview?.image || "";
    const displayDomain = preview?.domain || domain;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 block rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group overflow-hidden ${className}`}
        >
            {/* Preview Image */}
            {image && !imageError && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={image}
                    alt=""
                    className="w-full h-[160px] object-cover bg-gray-100 dark:bg-gray-800"
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
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 dark:text-gray-500">
                    <GlobeIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{displayDomain}</span>
                    <ExternalLinkIcon className="h-3 w-3 shrink-0 ml-auto" />
                </div>
            </div>
        </a>
    );
}
