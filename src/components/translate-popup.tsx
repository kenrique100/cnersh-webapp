"use client";

import React, { useState } from "react";
import { GlobeIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TranslatePopup() {
    const [isOpen, setIsOpen] = useState(false);

    // This component requires the Google Translate script loaded in the root layout
    // (translate.google.com/translate_a/element.js) which populates #google_translate_element
    return (
        <div className="fixed bottom-4 right-4 z-50">
            {isOpen && (
                <div className="mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[200px]">
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
                    <div id="google_translate_element" />
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
    );
}
