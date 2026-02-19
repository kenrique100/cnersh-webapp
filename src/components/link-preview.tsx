"use client";

import React from "react";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";

interface LinkPreviewProps {
    url: string;
    className?: string;
}

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return url;
    }
}

function getFaviconUrl(url: string): string {
    try {
        const domain = new URL(url).origin;
        return `${domain}/favicon.ico`;
    } catch {
        return "";
    }
}

export default function LinkPreview({ url, className = "" }: LinkPreviewProps) {
    const [faviconError, setFaviconError] = React.useState(false);
    const domain = React.useMemo(() => getDomain(url), [url]);
    const faviconUrl = React.useMemo(() => getFaviconUrl(url), [url]);

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group max-w-sm ${className}`}
        >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0 overflow-hidden">
                {faviconUrl && !faviconError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={faviconUrl}
                        alt=""
                        className="w-6 h-6 object-contain"
                        onError={() => setFaviconError(true)}
                    />
                ) : (
                    <GlobeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline truncate">
                    {domain}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {url}
                </p>
            </div>
            <ExternalLinkIcon className="h-4 w-4 text-gray-400 shrink-0" />
        </a>
    );
}
