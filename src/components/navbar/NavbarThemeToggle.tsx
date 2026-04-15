"use client";

import React from "react";
import { SunIcon, MoonIcon } from "lucide-react";
import { useTheme } from "next-themes";

export default function NavbarThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="p-2 h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        );
    }

    const isDark = theme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
            {isDark ? (
                <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
                <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
        </button>
    );
}
