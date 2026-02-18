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
    const containerRef = useRef<HTMLDivElement>(null);

    const initWidget = useCallback(() => {
        if (!window.google?.translate?.TranslateElement || !containerRef.current) return false;
        if (widgetInitialized.current) return true;

        containerRef.current.innerHTML = "";

        try {
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: "en",
                    layout: 1,
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

    // Load script on mount (no state changes)
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

    // Init widget when popup opens (poll for script readiness)
    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 30;

        const tryInit = () => {
            if (cancelled || attempts >= maxAttempts) return;
            attempts++;
            if (initWidget()) return;
            setTimeout(tryInit, 200);
        };

        tryInit();
        return () => { cancelled = true; };
    }, [isOpen, initWidget]);

    return (
        <>
            {/* Hide Google Translate's default top toolbar */}
            <style jsx global>{`
                .goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame {
                    display: none !important;
                }
                body { top: 0 !important; }
                .skiptranslate { display: none !important; }
                .goog-te-gadget .goog-te-combo {
                    padding: 4px 8px;
                    border-radius: 6px;
                    border: 1px solid #d1d5db;
                    font-size: 13px;
                    background: white;
                    cursor: pointer;
                    width: 100%;
                }
                .dark .goog-te-gadget .goog-te-combo {
                    background: #1f2937;
                    border-color: #374151;
                    color: #e5e7eb;
                }
                .goog-te-gadget {
                    font-size: 0 !important;
                }
                .goog-te-gadget > span {
                    display: none !important;
                }
            `}</style>
            <div className="fixed bottom-4 right-4 z-50">
                {isOpen && (
                    <div className="mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[220px]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                Translate Page
                            </span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <XIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div id="google_translate_element" ref={containerRef} />
                    </div>
                )}
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    size="icon"
                    className="rounded-full h-10 w-10 bg-blue-700 hover:bg-blue-800 text-white shadow-lg"
                    title="Translate this page"
                >
                    <GlobeIcon className="h-5 w-5" />
                </Button>
            </div>
        </>
    );
}
