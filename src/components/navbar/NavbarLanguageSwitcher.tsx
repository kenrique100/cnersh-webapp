"use client";

import React, { useEffect, useState } from "react";
import { GlobeIcon } from "lucide-react";

declare global {
    interface Window {
        googleTranslateElementInit?: () => void;
        google?: {
            translate: {
                TranslateElement: new (
                    options: {
                        pageLanguage: string;
                        includedLanguages: string;
                        autoDisplay: boolean;
                    },
                    elementId: string
                ) => void;
            };
        };
    }
}

function triggerGoogleTranslate(lang: "en" | "fr") {
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
        combo.value = lang;
        combo.dispatchEvent(new Event("change"));
    }
}

interface NavbarLanguageSwitcherProps {
    /** When true, renders a full-width block suitable for mobile menus */
    mobile?: boolean;
}

export default function NavbarLanguageSwitcher({ mobile = false }: NavbarLanguageSwitcherProps) {
    const [currentLang, setCurrentLang] = useState<"en" | "fr">("en");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Poll until the hidden Google Translate combo is available
        const interval = setInterval(() => {
            const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
            if (combo) {
                setReady(true);
                clearInterval(interval);
            }
        }, 400);

        // Persist last chosen language on page load
        const saved = localStorage.getItem("cnersh_lang") as "en" | "fr" | null;
        if (saved && (saved === "en" || saved === "fr")) {
            setCurrentLang(saved);
            // Wait for combo then apply
            const applyInterval = setInterval(() => {
                const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
                if (combo) {
                    triggerGoogleTranslate(saved);
                    clearInterval(applyInterval);
                }
            }, 500);
        }

        return () => clearInterval(interval);
    }, []);

    const handleChange = (lang: "en" | "fr") => {
        setCurrentLang(lang);
        localStorage.setItem("cnersh_lang", lang);
        triggerGoogleTranslate(lang);
    };

    if (mobile) {
        return (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
                    Language
                </p>
                <div className="flex items-center gap-2 px-3">
                    <GlobeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
                    <div className="flex gap-1 flex-1">
                        <button
                            onClick={() => handleChange("en")}
                            aria-label="Switch to English"
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors border ${
                                currentLang === "en"
                                    ? "bg-blue-700 text-white border-blue-700"
                                    : "bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                        >
                            🇬🇧 English
                        </button>
                        <button
                            onClick={() => handleChange("fr")}
                            aria-label="Switch to French"
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors border ${
                                currentLang === "fr"
                                    ? "bg-blue-700 text-white border-blue-700"
                                    : "bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                        >
                            🇫🇷 Français
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Desktop: compact pill toggle
    return (
        <div
            className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-1 py-1 shadow-sm"
            title={ready ? "Switch language" : "Loading translator..."}
        >
            <button
                onClick={() => handleChange("en")}
                aria-label="Switch to English"
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all ${
                    currentLang === "en"
                        ? "bg-blue-700 text-white shadow"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
            >
                <span>EN</span>
            </button>
            <button
                onClick={() => handleChange("fr")}
                aria-label="Switch to French"
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all ${
                    currentLang === "fr"
                        ? "bg-blue-700 text-white shadow"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
            >
                <span>FR</span>
            </button>
        </div>
    );
}
