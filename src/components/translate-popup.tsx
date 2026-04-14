"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { GlobeIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
    interface Window {
        google?: {
            translate: {
                TranslateElement: new (
                    options: { pageLanguage: string; includedLanguages?: string; layout: unknown; autoDisplay: boolean },
                    elementId: string
                ) => unknown;
            };
        };
        googleTranslateElementInit?: () => void;
    }
}

type Lang = "en" | "fr";

/** Read the active language from the googtrans cookie set by Google Translate. */
function getActiveLang(): Lang {
    if (typeof document === "undefined") return "en";
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
    if (match) {
        const value = decodeURIComponent(match[1]);
        // Cookie format is /sourceLang/targetLang, e.g. /en/fr — must have at least 3 parts
        const parts = value.split("/");
        if (parts.length >= 3) {
            const target = parts[parts.length - 1];
            if (target && target !== "en") return "fr";
        }
    }
    return "en";
}

/** Erase the googtrans cookie so Google Translate reverts to original content. */
function clearGoogTransCookie() {
    const paths = ["/"];
    const domains = ["", window.location.hostname, `.${window.location.hostname}`];
    for (const path of paths) {
        for (const domain of domains) {
            const domainAttr = domain ? `; domain=${domain}` : "";
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}${domainAttr}`;
        }
    }
}

export default function TranslatePopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState<Lang>("en");
    const widgetInitialized = useRef(false);
    const scriptLoadedRef = useRef(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Detect language from cookie on mount (page may have been reloaded while in FR)
    useEffect(() => {
        setCurrentLang(getActiveLang());
    }, []);

    const initWidget = useCallback(() => {
        const container = document.getElementById("google_translate_element");
        if (!window.google?.translate?.TranslateElement || !container) return false;
        if (widgetInitialized.current) return true;

        container.innerHTML = "";

        try {
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: "en",
                    includedLanguages: "en,fr",
                    layout: 0,
                    autoDisplay: false,
                },
                "google_translate_element"
            );
            widgetInitialized.current = true;
            return true;
        } catch {
            return false;
        }
    }, []);

    // Keep a ref to initWidget so the global callback always calls the latest version
    const initWidgetRef = useRef(initWidget);
    useEffect(() => {
        initWidgetRef.current = initWidget;
    });

    // Load Google Translate script eagerly on mount
    useEffect(() => {
        if (document.getElementById("google-translate-script") || scriptLoadedRef.current) {
            scriptLoadedRef.current = true;
            initWidgetRef.current();
            return;
        }

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

    // Poll until Google Translate script is ready, then initialize widget
    useEffect(() => {
        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 50; // 50 × 200ms = 10s max wait

        const tryInit = () => {
            if (cancelled || attempts >= maxAttempts) return;
            attempts++;
            if (initWidget()) return;
            setTimeout(tryInit, 200);
        };

        tryInit();
        return () => { cancelled = true; };
    }, [initWidget]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    /**
     * Switch to French by programmatically selecting "fr" in the hidden Google
     * Translate combo box and dispatching a change event.  Google Translate
     * intercepts that event and performs the EN→FR translation.
     *
     * Note: `.goog-te-combo` is an internal Google Translate selector.  A null
     * check guards against future changes to Google Translate's implementation.
     */
    const switchToFrench = useCallback(() => {
        // `.goog-te-combo` is Google Translate's internal select element.
        // We defend against it being absent in case Google ever renames it.
        const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (combo) {
            combo.value = "fr";
            combo.dispatchEvent(new Event("change"));
            setCurrentLang("fr");
        }
    }, []);

    /**
     * Switch back to English by clearing the googtrans cookie and reloading
     * the page.  This is the only reliable way to fully restore Google
     * Translate's modified DOM to the original English content.
     */
    const switchToEnglish = useCallback(() => {
        clearGoogTransCookie();
        window.location.reload();
    }, []);

    const handleSelectLang = (lang: Lang) => {
        if (lang === currentLang) return;
        if (lang === "en") {
            switchToEnglish();
        } else {
            switchToFrench();
        }
    };

    const langButtonClass = (lang: Lang) =>
        `flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
            currentLang === lang
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`;

    return (
        <>
            {/* Hide Google Translate's default top toolbar and the hidden widget container */}
            <style jsx global>{`
                .goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame {
                    display: none !important;
                }
                body { top: 0 !important; }
                .skiptranslate { display: none !important; }
                #google_translate_element {
                    display: none !important;
                }
            `}</style>
            <div className="fixed bottom-4 right-4 z-50" ref={dropdownRef}>
                <div
                    className={`mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[260px] transition-all duration-200 origin-bottom-right ${
                        isOpen
                            ? "opacity-100 scale-100 pointer-events-auto"
                            : "opacity-0 scale-95 pointer-events-none"
                    }`}
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
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Select a language to translate this page
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSelectLang("en")}
                            className={langButtonClass("en")}
                            aria-pressed={currentLang === "en"}
                        >
                            🇬🇧 English
                        </button>
                        <button
                            onClick={() => handleSelectLang("fr")}
                            className={langButtonClass("fr")}
                            aria-pressed={currentLang === "fr"}
                        >
                            🇫🇷 French
                        </button>
                    </div>
                    {/* Hidden mount point required by Google Translate script */}
                    <div id="google_translate_element" aria-hidden="true" />
                </div>
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    size="icon"
                    className="rounded-full h-10 w-10 bg-blue-700 hover:bg-blue-800 text-white shadow-lg"
                    title="Translate this page"
                    aria-label="Open translation language selector"
                    aria-expanded={isOpen}
                >
                    <GlobeIcon className="h-5 w-5" />
                </Button>
            </div>
        </>
    );
}
