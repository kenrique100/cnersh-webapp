"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { SunIcon, MoonIcon, MonitorIcon, ChevronDownIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
                <div className="h-10 rounded-lg border-2 border-gray-200 bg-gray-100 animate-pulse" />
            </div>
        );
    }

    const options = [
        {
            value: "light",
            label: "Light",
            icon: SunIcon,
        },
        {
            value: "dark",
            label: "Dark",
            icon: MoonIcon,
        },
        {
            value: "system",
            label: "System",
            icon: MonitorIcon,
        },
    ];

    const selectedOption = options.find((o) => o.value === theme) || options[2];
    const SelectedIcon = selectedOption.icon;

    return (
        <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Appearance
            </Label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Choose how CNEC looks to you. Select a single theme, or sync with your system.
            </p>
            <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                        <SelectedIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <SelectValue placeholder="Select theme" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => {
                        const Icon = option.icon;
                        return (
                            <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span>{option.label}</span>
                                </div>
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
        </div>
    );
}
