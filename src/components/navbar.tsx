"use client";

import Link from "next/link";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    MenuIcon,
    LogOutIcon,
    UserIcon,
    SettingsIcon,
    LayoutDashboardIcon,
    PenSquareIcon,
    FolderIcon,
    MessageSquareIcon,
    BellIcon,
    FolderPlusIcon,
    UsersIcon,
    CheckSquareIcon,
    ShieldIcon,
    BarChart3Icon,
    ScrollTextIcon,
    FlagIcon,
    FileTextIcon,
    ChevronDownIcon,
    BuildingIcon,
    DownloadIcon,
    ClipboardListIcon,
    GlobeIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import NotificationDropdown from "@/components/notification-dropdown";

interface NavbarProps {
    user?: {
        name: string | null;
        email: string;
        image: string | null;
        role?: string | null;
    } | null;
    notificationCount?: number;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
}

const userMobileNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { href: "/update-profile", label: "My Profile", icon: UserIcon },
    { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
    { href: "/projects/submit", label: "Submit Project", icon: FolderPlusIcon },
    { href: "/projects", label: "My Projects", icon: FolderIcon },
    { href: "/notifications", label: "Notifications", icon: BellIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const adminMobileNavItems: NavItem[] = [
    { href: "/admin", label: "Admin Dashboard", icon: BarChart3Icon },
    { href: "/user-management", label: "User Management", icon: UsersIcon },
    { href: "/admin/pages", label: "Manage Pages", icon: FileTextIcon },
    { href: "/admin/project-review", label: "Project Review", icon: CheckSquareIcon },
    { href: "/admin/feed-moderation", label: "Feed Moderation", icon: ShieldIcon },
    { href: "/admin/community-moderation", label: "Community Moderation", icon: MessageSquareIcon },
    { href: "/admin/reports", label: "Reports", icon: FlagIcon },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollTextIcon },
    { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
    { href: "/projects", label: "Projects", icon: FolderIcon },
    { href: "/community", label: "Community", icon: MessageSquareIcon },
    { href: "/notifications", label: "Notifications", icon: BellIcon },
    { href: "/update-profile", label: "My Profile", icon: UserIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
];

declare global {
    interface Window {
        google?: {
            translate: {
                TranslateElement: new (
                    options: { pageLanguage: string; layout: unknown; autoDisplay: boolean },
                    elementId: string
                ) => unknown;
            };
        };
        googleTranslateElementInit?: () => void;
    }
}

function TranslationDropdown() {
    const [isOpen, setIsOpen] = React.useState(false);
    const widgetInitialized = React.useRef(false);
    const scriptLoadedRef = React.useRef(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const initWidget = React.useCallback(() => {
        const container = document.getElementById("google_translate_element_navbar");
        if (!window.google?.translate?.TranslateElement || !container) return false;
        if (widgetInitialized.current) return true;

        container.innerHTML = "";

        try {
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: "en",
                    layout: 0,
                    autoDisplay: false,
                },
                "google_translate_element_navbar"
            );
            widgetInitialized.current = true;
            return true;
        } catch {
            return false;
        }
    }, []);

    // Keep a ref to initWidget so the global callback always calls the latest version
    const initWidgetRef = React.useRef(initWidget);
    React.useEffect(() => {
        initWidgetRef.current = initWidget;
    });

    React.useEffect(() => {
        // If the script tag already exists (e.g. after client-side navigation), try
        // to initialise the widget straight away since the API may already be loaded.
        if (document.getElementById("google-translate-script") || scriptLoadedRef.current) {
            scriptLoadedRef.current = true;
            initWidgetRef.current();
            return;
        }

        // Set the callback that Google's script calls when it has finished loading.
        window.googleTranslateElementInit = () => {
            scriptLoadedRef.current = true;
            initWidgetRef.current();
        };

        const script = document.createElement("script");
        script.id = "google-translate-script";
        script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        document.head.appendChild(script);
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 50;

        const tryInit = () => {
            if (cancelled || attempts >= maxAttempts) return;
            attempts++;
            if (initWidget()) return;
            setTimeout(tryInit, 200);
        };

        tryInit();
        return () => { cancelled = true; };
    }, [initWidget]);

    React.useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <>
            <style jsx global>{`
                .goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame {
                    display: none !important;
                }
                body { top: 0 !important; }
                .skiptranslate { display: none !important; }
                #google_translate_element_navbar .goog-te-gadget {
                    font-size: 0 !important;
                }
                #google_translate_element_navbar .goog-te-gadget > span {
                    display: none !important;
                }
                #google_translate_element_navbar .goog-te-gadget .goog-te-combo {
                    padding: 6px 10px;
                    border-radius: 6px;
                    border: 1px solid #d1d5db;
                    font-size: 14px;
                    background: white;
                    cursor: pointer;
                    width: 100%;
                    outline: none;
                }
                .dark #google_translate_element_navbar .goog-te-gadget .goog-te-combo {
                    background: #1f2937;
                    border-color: #374151;
                    color: #e5e7eb;
                }
            `}</style>
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Translate this page"
                    aria-label="Open translation language selector"
                    aria-expanded={isOpen}
                >
                    <GlobeIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div
                    className={cn(
                        "absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[260px] transition-all duration-200 z-50",
                        isOpen
                            ? "opacity-100 scale-100 pointer-events-auto"
                            : "opacity-0 scale-95 pointer-events-none"
                    )}
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <GlobeIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            Translate Page
                        </span>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Close translation dropdown"
                        >
                            <span className="sr-only">Close</span>
                            ✕
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Select a language to translate this page
                    </p>
                    <div id="google_translate_element_navbar" />
                </div>
            </div>
        </>
    );
}

function SOPsDropdown({ onNavigate }: { onNavigate: () => void }) {
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

function OurPagesDropdown({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
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

function OurPagesDesktopDropdown({ pathname }: { pathname: string }) {
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
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isOpen
                        ? "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
                        : "text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                )}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <FileTextIcon className="h-4 w-4 shrink-0" />
                Our Pages
                <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[220px] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 overflow-hidden">
                    <Link
                        href="/pages/about"
                        onClick={() => setIsOpen(false)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                            pathname === "/pages/about"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                : "text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                        )}
                    >
                        <UsersIcon className="h-4 w-4 shrink-0 text-gray-400" />
                        About Us
                    </Link>
                    <Link
                        href="/pages/contract-rex"
                        onClick={() => setIsOpen(false)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                            pathname === "/pages/contract-rex"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                : "text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                        )}
                    >
                        <BuildingIcon className="h-4 w-4 shrink-0 text-gray-400" />
                        Contract Rex Org
                    </Link>
                    <a
                        href="/membership.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors"
                    >
                        <DownloadIcon className="h-4 w-4 shrink-0 text-gray-400" />
                        Membership
                    </a>
                    <a
                        href="/Fiche d'Evaluation CNERSH.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors"
                    >
                        <DownloadIcon className="h-4 w-4 shrink-0 text-gray-400" />
                        Reviews
                    </a>
                    <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                    <SOPsDesktopSubmenu onClose={() => setIsOpen(false)} />
                </div>
            )}
        </div>
    );
}

function SOPsDesktopSubmenu({ onClose }: { onClose: () => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm w-full text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors"
            >
                <ClipboardListIcon className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="flex-1 text-left">SOP&apos;s</span>
                <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="pl-5 space-y-0.5 pb-1">
                    <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">English</p>
                    <a href="/SOP1- Current Edit-06-25-24.pdf" target="_blank" rel="noopener noreferrer" onClick={onClose}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />SOP 1
                    </a>
                    <a href="/SOP2 - Current edit-06-26-24.pdf" target="_blank" rel="noopener noreferrer" onClick={onClose}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />SOP 2
                    </a>
                    <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">French</p>
                    <a href="/SOP1- Current Edit-06-25-24 French.pdf" target="_blank" rel="noopener noreferrer" onClick={onClose}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />SOP 1
                    </a>
                    <a href="/SOP2 - Current edit-06-26-24.French.pdf" target="_blank" rel="noopener noreferrer" onClick={onClose}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-colors rounded-md">
                        <DownloadIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />SOP 2
                    </a>
                </div>
            )}
        </div>
    );
}

export default function Navbar({ user, notificationCount = 0 }: NavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/");
    };

    const userInitials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.email?.slice(0, 2).toUpperCase() || "U";

    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    const mobileNavItems = isAdmin ? adminMobileNavItems : userMobileNavItems;

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
            <div className="container mx-auto max-w-7xl">
                <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Left Side - Logo */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-white border border-gray-200 dark:border-gray-600 shadow-sm">
                                <Image
                                    src="/logo.png"
                                    alt="CNERSH"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 object-contain"
                                    priority
                                />
                            </div>
                            <span className="hidden sm:block text-xl font-bold text-gray-900 dark:text-gray-100">
                                CNERSH
                            </span>
                        </Link>

                        {/* Desktop: Our Pages dropdown — visible from md+ */}
                        <div className="hidden md:flex items-center">
                            <OurPagesDesktopDropdown pathname={pathname} />
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {user ? (
                            <>
                                {/* Translation Dropdown */}
                                <TranslationDropdown />

                                <NotificationDropdown count={notificationCount} />

                                {/* Desktop: User Avatar Dropdown */}
                                <div className="hidden md:block">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-3 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                                <Avatar className="h-10 w-10 border-2 border-gray-200 dark:border-gray-700">
                                                    <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                                                    <AvatarFallback className="bg-blue-700 text-white dark:bg-blue-600">
                                                        {userInitials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="hidden lg:block text-left">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {user.name || "User"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {user.name || "User"}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {user.email}
                                                </p>
                                            </div>
                                            <DropdownMenuItem asChild>
                                                <Link href="/update-profile" className="cursor-pointer">
                                                    <UserIcon className="mr-2 h-4 w-4" />
                                                    <span>View Profile</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/settings" className="cursor-pointer">
                                                    <SettingsIcon className="mr-2 h-4 w-4" />
                                                    <span>Settings</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={handleSignOut}
                                                className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950"
                                            >
                                                <LogOutIcon className="mr-2 h-4 w-4" />
                                                <span>Logout</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Mobile Menu Toggle - opens from RIGHT */}
                                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className="md:hidden">
                                            <MenuIcon className="h-6 w-6" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 overflow-y-auto">
                                        <div className="flex flex-col gap-2 p-4 pt-8">
                                            {/* User Info Header */}
                                            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-800">
                                                <Avatar className="h-12 w-12 border-2 border-gray-200 dark:border-gray-700">
                                                    <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                                                    <AvatarFallback className="bg-blue-700 text-white dark:bg-blue-600">
                                                        {userInitials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                        {user.name || "User"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {user.email}
                                                    </p>
                                                    {isAdmin && (
                                                        <span className={cn(
                                                            "mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium w-fit",
                                                            user?.role === "superadmin"
                                                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                                                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                                        )}>
                                                            {user?.role === "superadmin" ? "Super Admin" : "Admin"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* All Navigation Links */}
                                            <div className="flex flex-col gap-0.5 py-2">
                                                {mobileNavItems.map((item) => {
                                                    const Icon = item.icon;
                                                    const isActive = pathname === item.href;
                                                    const isNotification = item.href === "/notifications";
                                                    return (
                                                        <Link
                                                            key={`${item.href}-${item.label}`}
                                                            href={item.href}
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className={cn(
                                                                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                                                                isActive
                                                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                                                    : "text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                                                            )}
                                                        >
                                                            <Icon className="h-5 w-5 shrink-0" />
                                                            <span className="flex-1">{item.label}</span>
                                                            {isNotification && notificationCount > 0 && (
                                                                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold leading-none text-white bg-red-600 rounded-full">
                                                                    {notificationCount > 99 ? "99+" : notificationCount}
                                                                </span>
                                                            )}
                                                        </Link>
                                                    );
                                                })}
                                            </div>

                                            {/* Our Pages Section */}
                                            <div className="border-t border-gray-200 dark:border-gray-800 pt-2">
                                                <OurPagesDropdown pathname={pathname} onNavigate={() => setIsMobileMenuOpen(false)} />
                                            </div>

                                            {/* Logout */}
                                            <div className="border-t border-gray-200 dark:border-gray-800 pt-2">
                                                <Button
                                                    onClick={handleSignOut}
                                                    variant="ghost"
                                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                                >
                                                    <LogOutIcon className="mr-2 h-5 w-5" />
                                                    Logout
                                                </Button>
                                            </div>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </>
                        ) : (
                            <>
                                {/* Translation Dropdown (for non-logged-in users) */}
                                <TranslationDropdown />

                                {/* Desktop: Sign In + Sign Up buttons */}
                                <div className="hidden sm:flex items-center gap-3">
                                    <Link href="/sign-in">
                                        <Button variant="ghost" className="text-sm font-medium">
                                            Sign In
                                        </Button>
                                    </Link>
                                    <Link href="/sign-up">
                                        <Button className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium">
                                            Sign Up
                                        </Button>
                                    </Link>
                                </div>

                                {/* Mobile: Hamburger menu with Our Pages + Sign In/Up */}
                                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className="sm:hidden">
                                            <MenuIcon className="h-6 w-6" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 overflow-y-auto">
                                        <div className="flex flex-col gap-2 p-4 pt-8">
                                            {/* Sign In / Sign Up */}
                                            <div className="flex flex-col gap-2 pb-4 border-b border-gray-200 dark:border-gray-800">
                                                <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                                                    <Button variant="outline" className="w-full text-sm font-medium">
                                                        Sign In
                                                    </Button>
                                                </Link>
                                                <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>
                                                    <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium">
                                                        Sign Up
                                                    </Button>
                                                </Link>
                                            </div>

                                            {/* Our Pages Dropdown */}
                                            <div className="py-2">
                                                <OurPagesDropdown pathname={pathname} onNavigate={() => setIsMobileMenuOpen(false)} />
                                            </div>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
