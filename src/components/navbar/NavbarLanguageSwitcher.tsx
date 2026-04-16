"use client";

import React, { useEffect, useState, useCallback } from "react";
import { GlobeIcon } from "lucide-react";

/**
 * Sets the googtrans cookie (which Google Translate reads on page load)
 * and reloads the page so every piece of content is fully translated.
 *
 * For English: expire the cookie so Google restores original text.
 * For French: set cookie to /en/fr before reloading.
 */
function switchLanguage(lang: "en" | "fr"): void {
    localStorage.setItem("cnersh_lang", lang);

    const hostname = window.location.hostname;

    if (lang === "en") {
        // Expire the googtrans cookie on both root path and domain
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
    } else {
        // Google Translate reads /en/{targetLang} from the googtrans cookie on load
        document.cookie = `googtrans=/en/${lang}; path=/;`;
        document.cookie = `googtrans=/en/${lang}; path=/; domain=${hostname};`;
    }

    window.location.reload();
}

/**
 * After reload, drive the hidden combo select so the widget reflects
 * the cookie. Retries up to maxRetries x 300ms until combo is ready.
 */
function applyCombo(lang: "en" | "fr", retries = 0, maxRetries = 20): void {
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
        combo.value = lang;
        combo.dispatchEvent(new Event("change", { bubbles: true }));
        return;
    }
    if (retries < maxRetries) {
        setTimeout(() => applyCombo(lang, retries + 1, maxRetries), 300);
    }
}

interface NavbarLanguageSwitcherProps {
    mobile?: boolean;
}

export default function NavbarLanguageSwitcher({ mobile = false }: NavbarLanguageSwitcherProps) {
    const [currentLang, setCurrentLang] = useState<"en" | "fr">("en");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Read saved preference immediately to reflect correct active button
        const saved = localStorage.getItem("cnersh_lang") as "en" | "fr" | null;
        const lang: "en" | "fr" = saved === "fr" ? "fr" : "en";

        // Defer the setState call to avoid triggering it synchronously inside the effect body
        const langId = setTimeout(() => setCurrentLang(lang), 0);

        // Poll until widget is injected, then drive combo if French
        const interval = setInterval(() => {
            if (document.querySelector(".goog-te-combo")) {
                setReady(true);
                clearInterval(interval);
                if (lang === "fr") applyCombo(lang);
            }
        }, 400);

        return () => {
            clearTimeout(langId);
            clearInterval(interval);
        };
    }, []);

    const handleChange = useCallback(
        (lang: "en" | "fr") => {
            if (lang === currentLang) return;
            switchLanguage(lang);
        },
        [currentLang]
    );

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
                            disabled={currentLang === "en"}
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors border disabled:opacity-60 disabled:cursor-default ${
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
                            disabled={currentLang === "fr"}
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors border disabled:opacity-60 disabled:cursor-default ${
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
                disabled={currentLang === "en"}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all disabled:cursor-default ${
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
                disabled={currentLang === "fr"}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all disabled:cursor-default ${
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
