"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { GlobeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCookieDomain } from "@/lib/cookie-domain";

const INITIAL_TRANSLATION_DELAY_MS = 100;
const WIDGET_RETRY_DELAY_MS = 150;
const SCRIPT_LOAD_TIMEOUT_MS = 10000;
const LANG_STORAGE_KEY = "cnersh_lang";

const setLanguageCookie = (lang: "en" | "fr") => {
    const value = lang === "fr" ? "/en/fr" : "/en/en";
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `googtrans=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
    const domain = getCookieDomain(window.location.hostname);
    if (domain) {
        document.cookie = `googtrans=${value}; domain=${domain}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
};

const persistLanguage = (lang: "en" | "fr") => {
    setLanguageCookie(lang);
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* ignore */ }
};

const readPersistedLanguage = (): "en" | "fr" => {
    try {
        const stored = localStorage.getItem(LANG_STORAGE_KEY);
        if (stored === "fr" || stored === "en") return stored;
    } catch { /* ignore */ }
    const match = document.cookie.match(/(?:^|;\s*)googtrans=\/(?:en|auto)\/([^;]+)/);
    const targetLang = match?.[1]?.toLowerCase() ?? "en";
    return targetLang.startsWith("fr") ? "fr" : "en";
};

export default function TranslationDropdown() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [currentLang, setCurrentLang] = React.useState<"en" | "fr">("en");
    const [scriptReady, setScriptReady] = React.useState(false);
    const widgetInitialized = React.useRef(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const loadTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const pathname = usePathname();

    const applyWidgetLanguage = React.useCallback((lang: "en" | "fr") => {
        const combo = document.querySelector<HTMLSelectElement>("#google_translate_element_navbar .goog-te-combo");
        if (!combo) return false;
        if (combo.value !== lang) {
            combo.value = lang;
        }
        combo.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
    }, []);

    // Initialize the Google Translate widget
    const initWidget = React.useCallback(() => {
        const container = document.getElementById("google_translate_element_navbar");
        if (!window.google?.translate?.TranslateElement || !container) return false;
        const existingCombo = container.querySelector<HTMLSelectElement>(".goog-te-combo");
        if (existingCombo) {
            widgetInitialized.current = true;
            setScriptReady(true);
            return true;
        }

        // Clear container before initializing (handles re-init after navigation)
        container.innerHTML = "";
        widgetInitialized.current = false;

        try {
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: "en",
                    includedLanguages: "en,fr",
                    layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                    autoDisplay: false,
                },
                "google_translate_element_navbar"
            );
            widgetInitialized.current = true;
            setScriptReady(true);
            return true;
        } catch (error) {
            console.error("Failed to initialize Google Translate:", error);
            setScriptReady(false);
            return false;
        }
    }, []);

    const initWidgetRef = React.useRef(initWidget);
    React.useEffect(() => { initWidgetRef.current = initWidget; }, [initWidget]);

    // Load Google Translate script (runs once on mount)
    React.useEffect(() => {
        window.googleTranslateElementInit = () => {
            if (loadTimeoutRef.current !== null) {
                clearTimeout(loadTimeoutRef.current);
                loadTimeoutRef.current = null;
            }
            initWidget();
        };

        if (document.getElementById("google-translate-script")) {
            if (window.google?.translate?.TranslateElement) {
                initWidget();
            }
            return;
        }

        const script = document.createElement("script");
        script.id = "google-translate-script";
        script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        script.onerror = () => { console.error("Google Translate script failed to load"); };
        document.head.appendChild(script);

        loadTimeoutRef.current = setTimeout(() => {
            if (!window.google?.translate?.TranslateElement) {
                setScriptReady(false);
            }
        }, SCRIPT_LOAD_TIMEOUT_MS);

        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (initWidget() || attempts > 50) {
                clearInterval(interval);
            }
        }, 200);

        return () => {
            clearInterval(interval);
            if (loadTimeoutRef.current !== null) {
                clearTimeout(loadTimeoutRef.current);
                loadTimeoutRef.current = null;
            }
            if (retryIntervalRef.current !== null) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
            }
            delete window.googleTranslateElementInit;
        };
    }, [initWidget]);

    // On mount and on pathname change: read persisted language and re-apply
    React.useEffect(() => {
        const lang = readPersistedLanguage();
        setCurrentLang(lang);

        let initialTimer: ReturnType<typeof setTimeout> | null = null;

        if (lang === "fr") {
            initialTimer = setTimeout(() => {
                // Re-initialize widget in case DOM was reset by Next.js navigation
                if (!applyWidgetLanguage("fr")) {
                    initWidgetRef.current();
                    setTimeout(() => applyWidgetLanguage("fr"), WIDGET_RETRY_DELAY_MS);
                }
            }, INITIAL_TRANSLATION_DELAY_MS);
        }

        return () => {
            if (initialTimer !== null) clearTimeout(initialTimer);
        };
    }, [pathname, applyWidgetLanguage]);

    // Close dropdown when clicking outside
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

    const selectLanguage = (lang: "en" | "fr") => {
        persistLanguage(lang);
        setCurrentLang(lang);
        setIsOpen(false);

        // Clear any existing retry interval
        if (retryIntervalRef.current !== null) {
            clearInterval(retryIntervalRef.current);
            retryIntervalRef.current = null;
        }

        // Try to apply immediately
        if (applyWidgetLanguage(lang)) return;

        // Retry every 150ms for up to 4 seconds before reloading
        let elapsed = 0;
        retryIntervalRef.current = setInterval(() => {
            elapsed += WIDGET_RETRY_DELAY_MS;
            if (applyWidgetLanguage(lang)) {
                clearInterval(retryIntervalRef.current!);
                retryIntervalRef.current = null;
                return;
            }
            if (elapsed >= 4000) {
                clearInterval(retryIntervalRef.current!);
                retryIntervalRef.current = null;
                window.location.reload();
            }
        }, WIDGET_RETRY_DELAY_MS);
    };

    return (
        <>
            <style jsx global>{`
                /* Hide Google Translate UI elements but keep functionality */
                .goog-te-banner-frame,
                #goog-gt-tt,
                .goog-te-balloon-frame,
                .goog-tooltip,
                .goog-tooltip:hover {
                    display: none !important;
                }
                body {
                    top: 0 !important;
                }
                .skiptranslate {
                    display: none !important;
                }
                .goog-text-highlight {
                    background-color: transparent !important;
                    box-shadow: none !important;
                }
                /* Keep widget rendered while keeping it visually hidden */
                #google_translate_element_navbar {
                    position: absolute !important;
                    left: -9999px !important;
                    top: 0 !important;
                    width: auto !important;
                    height: auto !important;
                    /* Keep non-zero opacity so Google widget remains render-active across browsers */
                    opacity: 0.01 !important;
                    pointer-events: auto !important;
                    z-index: 1 !important;
                }
                /* Ensure the select element within is accessible */
                #google_translate_element_navbar .goog-te-combo {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
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
                        "absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[200px] transition-all duration-200 z-50",
                        isOpen
                            ? "opacity-100 scale-100 pointer-events-auto"
                            : "opacity-0 scale-95 pointer-events-none"
                    )}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <GlobeIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            Translate Page
                        </span>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Close translation dropdown"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-1">
                        <button
                            onClick={() => selectLanguage("en")}
                            className={cn(
                                "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors",
                                currentLang === "en"
                                    ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-950 dark:text-blue-400"
                                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                            )}
                        >
                            <span className="text-base">🇬🇧</span>
                            English
                            {currentLang === "en" && <span className="ml-auto text-blue-600 dark:text-blue-400 text-xs">✓</span>}
                        </button>
                        <button
                            onClick={() => selectLanguage("fr")}
                            className={cn(
                                "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors",
                                currentLang === "fr"
                                    ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-950 dark:text-blue-400"
                                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                            )}
                        >
                            <span className="text-base">🇫🇷</span>
                            Français
                            {!scriptReady && currentLang !== "fr" && (
                                <span className="ml-auto inline-block h-3 w-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" aria-hidden="true" />
                            )}
                            {currentLang === "fr" && <span className="ml-auto text-blue-600 dark:text-blue-400 text-xs">✓</span>}
                        </button>
                    </div>
                </div>

                {/* Hidden widget container - must be in DOM for Google Translate */}
                <div id="google_translate_element_navbar" />
            </div>
        </>
    );
}
