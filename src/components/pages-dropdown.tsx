"use client";

import React, { useState } from "react";
import { ChevronDownIcon, FileTextIcon, ExternalLinkIcon, DownloadIcon } from "lucide-react";

interface PageItem {
    id: string;
    name: string;
    url: string | null;
    fileUrl: string | null;
}

interface Page {
    id: string;
    name: string;
    items: PageItem[];
    children?: Page[];
}

function PageNode({ page }: { page: Page }) {
    const [isOpen, setIsOpen] = useState(false);
    const hasContent = page.items.length > 0 || (page.children && page.children.length > 0);

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-[11px] font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <FileTextIcon className="w-3 h-3 text-purple-500" />
                    {page.name}
                </span>
                {hasContent && (
                    <ChevronDownIcon
                        className={`w-3 h-3 text-gray-400 transition-transform ${
                            isOpen ? "rotate-180" : ""
                        }`}
                    />
                )}
            </button>
            {isOpen && hasContent && (
                <div className="ml-4 mt-0.5 border-l border-gray-200 dark:border-gray-700 pl-2">
                    {page.items.length > 0 && (
                        <ul className="space-y-0.5">
                            {page.items.map((item) => {
                                const href = item.url || item.fileUrl;
                                const isFile = !item.url && !!item.fileUrl;
                                if (!href) {
                                    return (
                                        <li key={item.id} className="text-[11px] text-gray-600 dark:text-gray-400">
                                            {item.name}
                                        </li>
                                    );
                                }
                                return (
                                    <li key={item.id}>
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                                        >
                                            {isFile ? (
                                                <DownloadIcon className="w-2.5 h-2.5 shrink-0" />
                                            ) : (
                                                <ExternalLinkIcon className="w-2.5 h-2.5 shrink-0" />
                                            )}
                                            {item.name}
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {page.children && page.children.length > 0 && (
                        <div className="space-y-0.5 mt-0.5">
                            {page.children.map((child) => (
                                <PageNode key={child.id} page={child} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function PagesDropdown({ pages }: { pages: Page[] }) {
    if (pages.length === 0) {
        return null;
    }

    return (
        <div className="space-y-1">
            {pages.map((page) => (
                <PageNode key={page.id} page={page} />
            ))}
        </div>
    );
}
