"use client";

import React from "react";
import { ThumbsUp } from "lucide-react";

const REACTIONS = [
    { label: "Like", emoji: "👍", color: "#0A66C2" },
    { label: "Love", emoji: "❤️", color: "#F5666C" },
    { label: "Funny", emoji: "😂", color: "#7FD1F6" },
    { label: "Insightful", emoji: "😮", color: "#F5A623" },
    { label: "Support", emoji: "😢", color: "#9B6DD6" },
    { label: "Celebrate", emoji: "🎉", color: "#57C27D" },
] as const;

type ReactionLabel = (typeof REACTIONS)[number]["label"];

interface ReactionsPickerProps {
    postId: string;
    initialReaction?: string | null;
    initialCount?: number;
    onReact?: (postId: string, reactionType: string) => void;
}

export function ReactionsPicker({
    postId,
    initialReaction,
    initialCount = 0,
    onReact,
}: ReactionsPickerProps) {
    const [selectedReaction, setSelectedReaction] = React.useState<ReactionLabel | null>(
        (initialReaction as ReactionLabel) || null
    );
    const [count, setCount] = React.useState(initialCount);
    const [showPicker, setShowPicker] = React.useState(false);

    const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const leaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Sync with parent if initialReaction changes (e.g. after server response)
    React.useEffect(() => {
        setSelectedReaction((initialReaction as ReactionLabel) || null);
    }, [initialReaction]);

    React.useEffect(() => {
        setCount(initialCount);
    }, [initialCount]);

    // Close picker on outside click
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMouseEnter = () => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        hoverTimerRef.current = setTimeout(() => setShowPicker(true), 400);
    };

    const handleMouseLeave = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        leaveTimerRef.current = setTimeout(() => setShowPicker(false), 300);
    };

    const handlePickerMouseEnter = () => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };

    const handlePickerMouseLeave = () => {
        leaveTimerRef.current = setTimeout(() => setShowPicker(false), 300);
    };

    const handleEmojiClick = (label: ReactionLabel) => {
        setShowPicker(false);
        const isSameReaction = selectedReaction === label;
        if (isSameReaction) {
            setSelectedReaction(null);
            setCount((c) => Math.max(0, c - 1));
        } else {
            if (!selectedReaction) setCount((c) => c + 1);
            setSelectedReaction(label);
        }
        onReact?.(postId, label);
    };

    const handleMainButtonClick = () => {
        if (showPicker) return;
        const reactionToToggle: ReactionLabel = (selectedReaction as ReactionLabel) || "Like";
        if (selectedReaction) {
            setSelectedReaction(null);
            setCount((c) => Math.max(0, c - 1));
        } else {
            setSelectedReaction("Like");
            setCount((c) => c + 1);
        }
        onReact?.(postId, reactionToToggle);
    };

    const activeReaction = REACTIONS.find((r) => r.label === selectedReaction);
    const isActive = !!selectedReaction;

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Reaction emoji picker popup */}
            {showPicker && (
                <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-full shadow-xl px-2 sm:px-3 py-1.5 sm:py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                    style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                    onMouseEnter={handlePickerMouseEnter}
                    onMouseLeave={handlePickerMouseLeave}
                >
                    {REACTIONS.map((reaction) => (
                        <button
                            key={reaction.label}
                            type="button"
                            onClick={() => handleEmojiClick(reaction.label)}
                            className="group relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-200 hover:scale-150 hover:-translate-y-1.5 cursor-pointer"
                            title={reaction.label}
                        >
                            <span className="text-xl sm:text-2xl drop-shadow-sm select-none">
                                {reaction.emoji}
                            </span>
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
                                {reaction.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Main Like button */}
            <button
                type="button"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleMainButtonClick}
                className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors w-full justify-center ${
                    isActive
                        ? "hover:bg-blue-50 dark:hover:bg-blue-950"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                style={isActive && activeReaction ? { color: activeReaction.color } : undefined}
            >
                {isActive && activeReaction ? (
                    <span className="text-base leading-none select-none">{activeReaction.emoji}</span>
                ) : (
                    <ThumbsUp className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                    {isActive && activeReaction ? activeReaction.label : "Like"}
                </span>
                {count > 0 && <span className="ml-0.5">{count}</span>}
            </button>
        </div>
    );
}
