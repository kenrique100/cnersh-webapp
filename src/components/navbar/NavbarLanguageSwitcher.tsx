"use client";

import React, { useEffect, useState, useCallback } from "react";
import { GlobeIcon } from "lucide-react";

/**
 * Fires the Google Translate combo change with proper bubbling.
 * Retries up to `maxRetries` times with 300ms gaps if the combo isn't ready yet.
 */
function triggerGoogleTranslate(lang: "en" | "fr", retries = 0, maxRetries = 15): void {
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
        combo.value = lang;
        // Must use bubbles:true — Google's listener won't fire otherwise
        combo.dispatchEvent(new Event("change", { bubbles: true }));
        return;
    }
    if (retries < maxRetries) {
        setTimeout(() => triggerGoogleTranslate(lang, retries + 1, maxRetries), 300);
    }
}

interface NavbarLanguageSwitcherProps {
    mobile?: boolean;
}

export default function NavbarLanguageSwitcher({ mobile = false }: NavbarLanguageSwitcherProps) {
    const [currentLang, setCurrentLang] = useState<"en" | "fr">("en");
    const [ready, setReady] = useState(false);

    // Poll until the Google Translate combo select is injected into the DOM
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.querySelector(".goog-te-combo")) {
                setReady(true);
                clearInterval(interval);
            }
        }, 400);

        // Restore saved language preference
        const saved = localStorage.getItem("cnersh_lang") as "en" | "fr" | null;
        if (saved === "en" || saved === "fr") {
            setCurrentLang(saved);
            triggerGoogleTranslate(saved); // will auto-retry if not ready yet
        }

        return () => clearInterval(interval);
    }, []);

    const handleChange = useCallback((lang: "en" | "fr") => {
        setCurrentLang(lang);
        localStorage.setItem("cnersh_lang", lang);
        triggerGoogleTranslate(lang);
    }, []);

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
