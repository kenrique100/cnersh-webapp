"use client";

import React from "react";
import { getCookieDomain } from "@/lib/cookie-domain";

const CONSENT_KEY = "cookie-consent-choice";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type ConsentChoice = "accepted" | "rejected";

function clearTranslateCookie() {
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    const domain = getCookieDomain(window.location.hostname);
    if (domain) {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain}; path=/`;
    }
}

export default function CookieConsentBanner() {
    const [visible, setVisible] = React.useState(false);

    React.useEffect(() => {
        const choice = window.localStorage.getItem(CONSENT_KEY);
        setVisible(choice !== "accepted" && choice !== "rejected");
    }, []);

    const saveChoice = (choice: ConsentChoice) => {
        window.localStorage.setItem(CONSENT_KEY, choice);
        document.cookie = `cookie_consent=${choice}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
        if (choice === "rejected") {
            clearTranslateCookie();
        }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-4">
            <div className="mx-auto max-w-6xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    We use cookies to improve your experience. You can accept all or reject all non-essential cookies.
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => saveChoice("rejected")}
                        className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Reject All
                    </button>
                    <button
                        type="button"
                        onClick={() => saveChoice("accepted")}
                        className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                        Accept All
                    </button>
                </div>
            </div>
        </div>
    );
}
