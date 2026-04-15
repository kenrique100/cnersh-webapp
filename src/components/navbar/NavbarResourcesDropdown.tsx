"use client";

import React from "react";
import Link from "next/link";
import { ChevronDownIcon, DownloadIcon, GlobeIcon, BookOpenIcon, FileTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResourcesDesktopDropdown() {
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
                Resources
                <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[240px] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 overflow-hidden">
                    <a href="https://elearning.trree.org" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <GlobeIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />WHO links for training
                    </a>
                    <a href="/WEB-CIOMS-EthicalGuidelines.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />CIOMS
                    </a>
                    <a href="/wma-declaration-of-helsinki.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Helsinki Declaration
                    </a>
                    <a href="/The Tuskegee Syphilis Study.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Tuskegee Syphilis Trials
                    </a>
                    <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Law &amp; Research in Cameroon</p>
                    <a href="/LAW ON RESEARCH ON HUMAN SUBJECTS.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Law on Human Subjects
                    </a>
                    <a href="/LOI RECHERCHE MEDICALE-OCR.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Medical Research
                    </a>
                    <a href="/Finance Law 2024.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Finance Law 2024
                    </a>
                    <a href="/loi_n_2024_017_du_23_12_2024-web.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Data Protection Law
                    </a>
                    <a href="/Organisation_et_fonctionnement__évaluation_recherche_12.11.2023-good version.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Ministerial Decision
                    </a>
                    <Link href="/pages/article" onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <FileTextIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Article
                    </Link>
                </div>
            )}
        </div>
    );
}

export function ResourcesMobileDropdown({ onNavigate }: { onNavigate: () => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [lawOpen, setLawOpen] = React.useState(false);
    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
            >
                <BookOpenIcon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">Resources</span>
                <ChevronDownIcon className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-1">
                    <a href="https://elearning.trree.org" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                       className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                        <GlobeIcon className="h-4 w-4 shrink-0" />WHO links for training
                    </a>
                    <a href="/WEB-CIOMS-EthicalGuidelines.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                       className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                        <DownloadIcon className="h-4 w-4 shrink-0" />CIOMS
                    </a>
                    <a href="/wma-declaration-of-helsinki.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                       className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                        <DownloadIcon className="h-4 w-4 shrink-0" />Helsinki Declaration
                    </a>
                    <a href="/The Tuskegee Syphilis Study.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                       className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                        <DownloadIcon className="h-4 w-4 shrink-0" />Tuskegee Syphilis Trials
                    </a>
                    <button
                        onClick={() => setLawOpen(!lawOpen)}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                    >
                        <span className="flex-1 text-left">Law &amp; Research in Cameroon</span>
                        <ChevronDownIcon className={cn("h-3 w-3 transition-transform", lawOpen && "rotate-180")} />
                    </button>
                    {lawOpen && (
                        <div className="ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-1">
                            <a href="/LAW ON RESEARCH ON HUMAN SUBJECTS.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                               className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                                <DownloadIcon className="h-4 w-4 shrink-0" />Law on Human Subjects
                            </a>
                            <a href="/LOI RECHERCHE MEDICALE-OCR.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                               className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                                <DownloadIcon className="h-4 w-4 shrink-0" />Medical Research
                            </a>
                            <a href="/Finance Law 2024.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                               className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                                <DownloadIcon className="h-4 w-4 shrink-0" />Finance Law 2024
                            </a>
                            <a href="/loi_n_2024_017_du_23_12_2024-web.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                               className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                                <DownloadIcon className="h-4 w-4 shrink-0" />Data Protection Law
                            </a>
                        </div>
                    )}
                    <a href="/Organisation_et_fonctionnement__évaluation_recherche_12.11.2023-good version.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                       className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                        <DownloadIcon className="h-4 w-4 shrink-0" />Ministerial Decision
                    </a>
                    <Link href="/pages/article" onClick={onNavigate}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                        <FileTextIcon className="h-4 w-4 shrink-0" />Article
                    </Link>
                </div>
            )}
        </div>
    );
}
