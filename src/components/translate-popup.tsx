"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { GlobeIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function TranslatePopup() {
    const [isOpen, setIsOpen] = useState(false);
    const widgetInitialized = useRef(false);
    const scriptLoadedRef = useRef(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const initWidget = useCallback(() => {
        const container = document.getElementById("google_translate_element");
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
                "google_translate_element"
            );
            widgetInitialized.current = true;
            return true;
        } catch {
            return false;
        }
    }, []);

    // Load script eagerly on mount
    useEffect(() => {
        if (document.getElementById("google-translate-script") || scriptLoadedRef.current) {
            scriptLoadedRef.current = true;
            return;
        }

        window.googleTranslateElementInit = () => {
            scriptLoadedRef.current = true;
        };

        const script = document.createElement("script");
        script.id = "google-translate-script";
        script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        document.head.appendChild(script);
    }, []);

    // Initialize widget eagerly on mount (poll until Google Translate script is ready)
    useEffect(() => {
        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 50; // 50 × 200ms = 10s max wait for async script load

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
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <>
            {/* Hide Google Translate's default top toolbar */}
            <style jsx global>{`
                .goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame {
                    display: none !important;
                }
                body { top: 0 !important; }
                .skiptranslate { display: none !important; }
                #google_translate_element .goog-te-gadget {
                    font-size: 0 !important;
                }
                #google_translate_element .goog-te-gadget > span {
                    display: none !important;
                }
                #google_translate_element .goog-te-gadget .goog-te-combo {
                    padding: 6px 10px;
                    border-radius: 6px;
                    border: 1px solid #d1d5db;
                    font-size: 14px;
                    background: white;
                    cursor: pointer;
                    width: 100%;
                    outline: none;
                }
                .dark #google_translate_element .goog-te-gadget .goog-te-combo {
                    background: #1f2937;
                    border-color: #374151;
                    color: #e5e7eb;
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Select a language to translate this page
                    </p>
                    <div id="google_translate_element" />
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
