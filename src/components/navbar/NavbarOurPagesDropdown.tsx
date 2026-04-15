"use client";

import React from "react";
import Link from "next/link";
import {
    ChevronDownIcon,
    FileTextIcon,
    UsersIcon,
    BuildingIcon,
    DownloadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SOPsDropdown } from "./NavbarSOPsDropdown";

export function OurPagesDropdown({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors w-full text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
            >
                <FileTextIcon className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Our Pages</span>
                <ChevronDownIcon className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="ml-6 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-2">
                    <Link
                        href="/pages/about"
                        onClick={onNavigate}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                            pathname === "/pages/about"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                : "text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                        )}
                    >
                        <UsersIcon className="h-4 w-4 shrink-0" />
                        About Us
                    </Link>
                    <Link
                        href="/pages/contract-rex"
                        onClick={onNavigate}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                            pathname === "/pages/contract-rex"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                : "text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                        )}
                    >
                        <BuildingIcon className="h-4 w-4 shrink-0" />
                        Contract Rex Org
                    </Link>
                    <a
                        href="/membership.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onNavigate}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                    >
                        <DownloadIcon className="h-4 w-4 shrink-0" />
                        Membership
                    </a>
                    <a
                        href="/Fiche d'Evaluation CNERSH.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onNavigate}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                    >
                        <DownloadIcon className="h-4 w-4 shrink-0" />
                        Reviews
                    </a>
                    <SOPsDropdown onNavigate={onNavigate} />
                </div>
            )}
        </div>
    );
}

export default function OurPagesDesktopDropdown({ pathname }: { pathname: string }) {
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

    const isActive = pathname === "/pages/about" || pathname === "/pages/contract-rex";

    return (
        <div className="relative hidden lg:block" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                    isOpen || isActive
                        ? "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
                        : "text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                )}
                aria-expanded={isOpen}
            >
                <FileTextIcon className="h-4 w-4 shrink-0" />
                Our Pages
                <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 overflow-hidden">
                    <Link
                        href="/pages/about"
                        onClick={() => setIsOpen(false)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors rounded-md",
                            pathname === "/pages/about"
                                ? "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
                                : "text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                        )}
                    >
                        <UsersIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        About Us
                    </Link>
                    <Link
                        href="/pages/contract-rex"
                        onClick={() => setIsOpen(false)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors rounded-md",
                            pathname === "/pages/contract-rex"
                                ? "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
                                : "text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                        )}
                    >
                        <BuildingIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        Contract Rex Org
                    </Link>
                    <a
                        href="/membership.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md"
                    >
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        Membership
                    </a>
                    <a
                        href="/Fiche d'Evaluation CNERSH.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md"
                    >
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        Reviews
                    </a>
                </div>
            )}
        </div>
    );
}
