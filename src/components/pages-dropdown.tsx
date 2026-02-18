"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, FileTextIcon, ExternalLinkIcon, DownloadIcon, BuildingIcon, UsersIcon } from "lucide-react";

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

function ResourcesDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [lawOpen, setLawOpen] = useState(false);
    const [ministerialOpen, setMinisterialOpen] = useState(false);

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-[11px] font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <FileTextIcon className="w-3 h-3 text-purple-500" />
                    Resources
                </span>
                <ChevronDownIcon
                    className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>
            {isOpen && (
                <div className="ml-4 mt-0.5 border-l border-gray-200 dark:border-gray-700 pl-2">
                    <ul className="space-y-0.5">
                        <li>
                            <a
                                href="https://elearning.trree.org"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                            >
                                <ExternalLinkIcon className="w-2.5 h-2.5 shrink-0" />
                                WHO links for training
                            </a>
                        </li>
                        <li>
                            <a
                                href="/WEB-CIOMS-EthicalGuidelines.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                            >
                                <DownloadIcon className="w-2.5 h-2.5 shrink-0" />
                                CIOMS
                            </a>
                        </li>
                        <li>
                            <a
                                href="/wma-declaration-of-helsinki (3).pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                            >
                                <DownloadIcon className="w-2.5 h-2.5 shrink-0" />
                                Helsinki Declaration
                            </a>
                        </li>
                        <li>
                            <a
                                href="/The Tuskegee Syphilis Study.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                            >
                                <DownloadIcon className="w-2.5 h-2.5 shrink-0" />
                                Tuskegee Syphilis Trials
                            </a>
                        </li>
                    </ul>
                    {/* Law & Research in Cameroon - nested under Resources */}
                    <div className="mt-0.5">
                        <button
                            onClick={() => setLawOpen(!lawOpen)}
                            className="w-full flex items-center justify-between text-[11px] font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
                        >
                            <span className="flex items-center gap-1.5">
                                <FileTextIcon className="w-3 h-3 text-purple-500" />
                                Law &amp; Research in Cameroon
                            </span>
                            <ChevronDownIcon
                                className={`w-3 h-3 text-gray-400 transition-transform ${lawOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {lawOpen && (
                            <div className="ml-4 mt-0.5 border-l border-gray-200 dark:border-gray-700 pl-2">
                                <ul className="space-y-0.5">
                                    <li>
                                        <a
                                            href="/LAW ON RESEARCH ON HUMAN SUBJECTS.pdf"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                                        >
                                            <DownloadIcon className="w-2.5 h-2.5 shrink-0" />
                                            Law on Human Subjects
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="/LOI RECHERCHE MEDICALE-OCR.pdf"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                                        >
                                            <DownloadIcon className="w-2.5 h-2.5 shrink-0" />
                                            Medical Research
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="/Finance Law 2024.pdf"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                                        >
                                            <DownloadIcon className="w-2.5 h-2.5 shrink-0" />
                                            Finance Law 2024
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="/loi_n_2024_017_du_23_12_2024-web.pdf"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                                        >
                                            <DownloadIcon className="w-2.5 h-2.5 shrink-0" />
                                            Data Protection Law
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                    {/* Article link */}
                    <div className="mt-0.5">
                        <Link
                            href="/pages/article"
                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline py-0.5"
                        >
                            <FileTextIcon className="w-2.5 h-2.5 shrink-0" />
                            Article
                        </Link>
                    </div>
                    {/* Ministerial Decision - nested under Resources */}
                    <div className="mt-0.5">
                        <button
                            onClick={() => setMinisterialOpen(!ministerialOpen)}
                            className="w-full flex items-center justify-between text-[11px] font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
                        >
                            <span className="flex items-center gap-1.5">
                                <FileTextIcon className="w-3 h-3 text-purple-500" />
                                Ministerial Decision
                            </span>
                            <ChevronDownIcon
                                className={`w-3 h-3 text-gray-400 transition-transform ${ministerialOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {ministerialOpen && (
                            <div className="ml-4 mt-0.5 border-l border-gray-200 dark:border-gray-700 pl-2">
                                <ul className="space-y-0.5">
                                    <li>
                                        <a
                                            href="/Organisation_et_fonctionnement__évaluation_recherche_12.11.2023-good version.pdf"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                                        >
                                            <DownloadIcon className="w-2.5 h-2.5 shrink-0" />
                                            Ministerial Decision
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PagesDropdown({ pages }: { pages: Page[] }) {
    return (
        <div className="space-y-1">
            {pages.map((page) => (
                <PageNode key={page.id} page={page} />
            ))}
            {/* Separator when dynamic pages exist */}
            {pages.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            )}
            {/* Static Resources Page */}
            <ResourcesDropdown />
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            {/* Static Article Pages */}
            <div>
                <Link
                    href="/pages/about"
                    className="w-full flex items-center gap-1.5 text-[11px] font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
                >
                    <UsersIcon className="w-3 h-3 text-purple-500" />
                    About Us
                </Link>
            </div>
            <div>
                <Link
                    href="/pages/contract-rex"
                    className="w-full flex items-center gap-1.5 text-[11px] font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
                >
                    <BuildingIcon className="w-3 h-3 text-purple-500" />
                    Contract Rex Org
                </Link>
            </div>
            <div>
                <a
                    href="/membership.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-1.5 text-[11px] font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
                >
                    <DownloadIcon className="w-3 h-3 text-purple-500" />
                    Membership
                </a>
            </div>
            <div>
                <a
                    href="/Fiche d'Evaluation CNERSH.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-1.5 text-[11px] font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
                >
                    <DownloadIcon className="w-3 h-3 text-purple-500" />
                    Reviews
                </a>
            </div>
        </div>
    );
}
