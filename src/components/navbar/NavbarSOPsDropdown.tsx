"use client";

import React from "react";
import { ChevronDownIcon, ClipboardListIcon, DownloadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SOPsDropdown({ onNavigate }: { onNavigate: () => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [englishOpen, setEnglishOpen] = React.useState(false);
    const [frenchOpen, setFrenchOpen] = React.useState(false);
    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
            >
                <ClipboardListIcon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">SOP&apos;s</span>
                <ChevronDownIcon className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-1">
                    {/* English */}
                    <button
                        onClick={() => setEnglishOpen(!englishOpen)}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                    >
                        <span className="flex-1 text-left">English</span>
                        <ChevronDownIcon className={cn("h-3 w-3 transition-transform", englishOpen && "rotate-180")} />
                    </button>
                    {englishOpen && (
                        <div className="ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-1">
                            <a
                                href="/SOP1- Current Edit-06-25-24.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onNavigate}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                            >
                                <DownloadIcon className="h-4 w-4 shrink-0" />
                                SOP 1
                            </a>
                            <a
                                href="/SOP2 - Current edit-06-26-24.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onNavigate}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                            >
                                <DownloadIcon className="h-4 w-4 shrink-0" />
                                SOP 2
                            </a>
                        </div>
                    )}
                    {/* French */}
                    <button
                        onClick={() => setFrenchOpen(!frenchOpen)}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                    >
                        <span className="flex-1 text-left">French</span>
                        <ChevronDownIcon className={cn("h-3 w-3 transition-transform", frenchOpen && "rotate-180")} />
                    </button>
                    {frenchOpen && (
                        <div className="ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-1">
                            <a
                                href="/SOP1- Current Edit-06-25-24 French.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onNavigate}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                            >
                                <DownloadIcon className="h-4 w-4 shrink-0" />
                                SOP 1
                            </a>
                            <a
                                href="/SOP2 - Current edit-06-26-24.French.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onNavigate}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                            >
                                <DownloadIcon className="h-4 w-4 shrink-0" />
                                SOP 2
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function SOPsDesktopSubmenuNav() {
    const [isOpen, setIsOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

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
                SOP&apos;s
                <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[180px] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 overflow-hidden">
                    <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">English</p>
                    <a href="/SOP1- Current Edit-06-25-24.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />SOP 1
                    </a>
                    <a href="/SOP2 - Current edit-06-26-24.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />SOP 2
                    </a>
                    <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">French</p>
                    <a href="/SOP1- Current Edit-06-25-24 French.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />SOP 1
                    </a>
                    <a href="/SOP2 - Current edit-06-26-24.French.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />SOP 2
                    </a>
                </div>
            )}
        </div>
    );
}
