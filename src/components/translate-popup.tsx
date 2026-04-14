"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { GlobeIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
    interface Window {
        google?: {
            translate: {
                TranslateElement: new (
                    options: {
                        pageLanguage: string;
                        includedLanguages?: string;
                        layout: unknown;
                        autoDisplay: boolean;
                    },
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
        const parts = value.split("/");
        if (parts.length >= 3) {
            const target = parts[parts.length - 1];
            if (target && target !== "en") return "fr";
        }
    }
    return "en";
}

/** Set the googtrans cookie so Google Translate activates on next load. */
function setGoogTransCookie(targetLang: string) {
    const value = `/en/${targetLang}`;
    document.cookie = `googtrans=${value}; path=/`;
    document.cookie = `googtrans=${value}; domain=${window.location.hostname}; path=/`;
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
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Detect language from cookie on mount
    useEffect(() => {
        setCurrentLang(getActiveLang());
    }, []);

    // Load and initialize Google Translate widget
    useEffect(() => {
        const initWidget = () => {
            const container = document.getElementById("google_translate_element");
            if (!window.google?.translate?.TranslateElement || !container) return false;
            if (widgetInitialized.current) return true;

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
        };

        // If script already loaded, just init
        if (document.getElementById("google-translate-script")) {
            initWidget();
            return;
        }

        // Set global callback for when script loads
        window.googleTranslateElementInit = () => {
            initWidget();
        };

        const script = document.createElement("script");
        script.id = "google-translate-script";
        script.src =
            "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        document.head.appendChild(script);

        // Poll as a fallback in case the callback fires before our assignment
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (initWidget() || attempts > 60) clearInterval(interval);
        }, 200);

        return () => clearInterval(interval);
    }, []);

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
     * Switch to French.
     * First tries the live Google Translate combo box (no page reload needed).
     * Falls back to setting the cookie and reloading if the widget isn't ready.
     */
    const switchToFrench = useCallback(() => {
        const combo = document.querySelector(
            ".goog-te-combo"
        ) as HTMLSelectElement | null;

        if (combo) {
            combo.value = "fr";
            combo.dispatchEvent(new Event("change"));
            setCurrentLang("fr");
        } else {
            // Widget not ready — set cookie and reload; Google Translate will auto-translate on load
            setGoogTransCookie("fr");
            window.location.reload();
        }
    }, []);

    /**
     * Switch back to English by clearing the googtrans cookie and reloading.
     */
    const switchToEnglish = useCallback(() => {
        clearGoogTransCookie();
        window.location.reload();
    }, []);

    const handleSelectLang = (lang: Lang) => {
        if (lang === currentLang) return;
        setIsOpen(false);
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
            {/* Global styles: suppress Google Translate's own UI chrome */}
            <style jsx global>{`
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
                /* Hide the skiptranslate wrapper Google injects, but NOT our mount point */
                body > .skiptranslate {
                    display: none !important;
                }
                .goog-text-highlight {
                    background-color: transparent !important;
                    box-shadow: none !important;
                }
            `}</style>

            {/*
             * IMPORTANT: This div must NOT have display:none — Google Translate
             * needs a visible (or at least rendered) DOM node to attach to.
             * We use position:absolute + clip to hide it visually instead.
             */}
            <div
                id="google_translate_element"
                aria-hidden="true"
                style={{
                    position: "absolute",
                    width: "1px",
                    height: "1px",
                    overflow: "hidden",
                    clip: "rect(0,0,0,0)",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    opacity: 0,
                    top: 0,
                    left: 0,
                }}
            />

            {/* Floating translate button + dropdown */}
            <div className="fixed bottom-4 right-4 z-50" ref={dropdownRef}>
                {/* Dropdown panel */}
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
                </div>

                {/* Toggle button */}
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    size="icon"
                    className="rounded-full h-10 w-10 bg-blue-700 hover:bg-blue-800 text-white shadow-lg ml-auto flex"
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