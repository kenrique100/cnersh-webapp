"use client";

import React from "react";
import { ChevronDownIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavbarPage } from "./types";

export function DynamicPageDesktopChildItem({ page, onClose }: { page: NavbarPage; onClose: () => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const hasContent = page.items.length > 0 || (page.children && page.children.length > 0);

    return (
        <div>
            <button
                onClick={hasContent ? () => setIsOpen(!isOpen) : undefined}
                className="flex items-center gap-2 px-3 py-1.5 text-sm w-full text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors"
            >
                <FileTextIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="flex-1 text-left">{page.name}</span>
                {hasContent && <ChevronDownIcon className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />}
            </button>
            {isOpen && hasContent && (
                <div className="pl-5 space-y-0.5 pb-1">
                    {page.items.map((item) => {
                        const href = item.url || item.fileUrl;
                        if (!href) return null;
                        return (
                            <a
                                key={item.id}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onClose}
                                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md"
                            >
                                {!item.url && item.fileUrl ? (
                                    <DownloadIcon className="h-3 w-3 shrink-0 text-gray-400" />
                                ) : (
                                    <FileTextIcon className="h-3 w-3 shrink-0 text-gray-400" />
                                )}
                                {item.name}
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function DynamicPageDesktopDropdown({ page }: { page: NavbarPage }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const hasContent = page.items.length > 0 || (page.children && page.children.length > 0);

    React.useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    if (!hasContent) {
        return (
            <span className="px-2.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {page.name}
            </span>
        );
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                    isOpen
                        ? "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
                        : "text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                )}
                aria-expanded={isOpen}
            >
                {page.name}
                <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 overflow-hidden">
                    {page.items.map((item) => {
                        const href = item.url || item.fileUrl;
                        if (!href) return null;
                        return (
                            <a
                                key={item.id}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors"
                            >
                                {!item.url && item.fileUrl ? (
                                    <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                ) : (
                                    <FileTextIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                )}
                                {item.name}
                            </a>
                        );
                    })}
                    {page.children && page.children.map((child) => (
                        <DynamicPageDesktopChildItem key={child.id} page={child} onClose={() => setIsOpen(false)} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function MobileDynamicPageDropdown({ page, onNavigate }: { page: NavbarPage; onNavigate: () => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const hasContent = page.items.length > 0 || (page.children && page.children.length > 0);

    if (!hasContent) {
        return (
            <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <FileTextIcon className="h-5 w-5 shrink-0" />
                <span>{page.name}</span>
            </div>
        );
    }

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors w-full text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
            >
                <FileTextIcon className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">{page.name}</span>
                <ChevronDownIcon className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="ml-6 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-2">
                    {page.items.map((item) => {
                        const href = item.url || item.fileUrl;
                        if (!href) return null;
                        return (
                            <a
                                key={item.id}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onNavigate}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                            >
                                {!item.url && item.fileUrl ? (
                                    <DownloadIcon className="h-4 w-4 shrink-0" />
                                ) : (
                                    <FileTextIcon className="h-4 w-4 shrink-0" />
                                )}
                                {item.name}
                            </a>
                        );
                    })}
                    {page.children && page.children.map((child) => (
                        <MobileDynamicPageDropdown key={child.id} page={child} onNavigate={onNavigate} />
                    ))}
                </div>
            )}
        </div>
    );
}
