"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );

    if (!mounted) {
        return (
            <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Appearance
                </Label>
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-20 rounded-lg border-2 border-gray-200 bg-gray-100 animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }

    const options = [
        {
            value: "light",
            label: "Light",
            icon: SunIcon,
            preview: "bg-white border-gray-300",
        },
        {
            value: "dark",
            label: "Dark",
            icon: MoonIcon,
            preview: "bg-gray-900 border-gray-700",
        },
        {
            value: "system",
            label: "System",
            icon: MonitorIcon,
            preview: "bg-gradient-to-br from-white to-gray-900 border-gray-400",
        },
    ];

    return (
        <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Appearance
            </Label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Choose how CNEC looks to you. Select a single theme, or sync with your system.
            </p>
            <div className="grid grid-cols-3 gap-3">
                {options.map((option) => {
                    const Icon = option.icon;
                    const isActive = theme === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setTheme(option.value)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                                isActive
                                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950 ring-1 ring-blue-600"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                            }`}
                        >
                            <div
                                className={`w-full h-8 rounded-md ${option.preview} border`}
                            />
                            <div className="flex items-center gap-1.5">
                                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-blue-600" : "text-gray-500 dark:text-gray-400"}`} />
                                <span className={`text-xs font-medium ${isActive ? "text-blue-600" : "text-gray-700 dark:text-gray-300"}`}>
                                    {option.label}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
