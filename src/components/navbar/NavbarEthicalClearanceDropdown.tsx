"use client";

import React from "react";
import { ChevronDownIcon, DownloadIcon, ScaleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EthicalClearanceDesktopDropdown() {
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
                Ethical Clearance
                <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[240px] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 overflow-hidden">
                    <a href="/PROCEDURE D'EVALUATION DES PROTOCOLES DE RECHERCHE.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Documents &amp; Calendar
                    </a>
                    <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Application Guidelines</p>
                    <a href="/Composition dossier pour soumission protocole.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Dossier Composition
                    </a>
                    <a href="/Form for Ethical Clearance CNERSH (2025).pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Clearance Form
                    </a>
                    <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Forms &amp; Questionnaires</p>
                    <a href="/Contenu d'un protocole de recherche.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Protocol Content
                    </a>
                    <a href="/Fiche d'Evaluation CNERSH.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />Evaluation Form
                    </a>
                </div>
            )}
        </div>
    );
}

export function EthicalClearanceMobileDropdown({ onNavigate }: { onNavigate: () => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [guidelinesOpen, setGuidelinesOpen] = React.useState(false);
    const [formsOpen, setFormsOpen] = React.useState(false);
    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
            >
                <ScaleIcon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">Ethical Clearance</span>
                <ChevronDownIcon className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-1">
                    <a href="/PROCEDURE D'EVALUATION DES PROTOCOLES DE RECHERCHE.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                       className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                        <DownloadIcon className="h-4 w-4 shrink-0" />Documents &amp; Calendar
                    </a>
                    <button
                        onClick={() => setGuidelinesOpen(!guidelinesOpen)}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                    >
                        <span className="flex-1 text-left">Application Guidelines</span>
                        <ChevronDownIcon className={cn("h-3 w-3 transition-transform", guidelinesOpen && "rotate-180")} />
                    </button>
                    {guidelinesOpen && (
                        <div className="ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-1">
                            <a href="/Composition dossier pour soumission protocole.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                               className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                                <DownloadIcon className="h-4 w-4 shrink-0" />Dossier Composition
                            </a>
                            <a href="/Form for Ethical Clearance CNERSH (2025).pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                               className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                                <DownloadIcon className="h-4 w-4 shrink-0" />Clearance Form
                            </a>
                        </div>
                    )}
                    <button
                        onClick={() => setFormsOpen(!formsOpen)}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                    >
                        <span className="flex-1 text-left">Forms &amp; Questionnaires</span>
                        <ChevronDownIcon className={cn("h-3 w-3 transition-transform", formsOpen && "rotate-180")} />
                    </button>
                    {formsOpen && (
                        <div className="ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-1">
                            <a href="/Contenu d'un protocole de recherche.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                               className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                                <DownloadIcon className="h-4 w-4 shrink-0" />Protocol Content
                            </a>
                            <a href="/Fiche d'Evaluation CNERSH.pdf" target="_blank" rel="noopener noreferrer" onClick={onNavigate}
                               className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950">
                                <DownloadIcon className="h-4 w-4 shrink-0" />Evaluation Form
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
