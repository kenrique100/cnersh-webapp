"use client";

import React, { useState, useRef, useEffect } from "react";
import { ThumbsUp } from "lucide-react";
import {
    ReactionIcon,
    REACTION_COLORS,
    REACTION_ORDER,
    type ReactionType,
} from "@/components/reaction-icons";
import { cn } from "@/lib/utils";

const QUICK_REACTIONS = REACTION_ORDER.map((label) => ({
    label,
    tooltip: label,
}));

export interface ReactionsPickerProps {
    postId: string;
    initialReaction?: string | null;
    initialCount?: number;
    onReact?: (postId: string, reactionType: string | null) => void;
}

export function ReactionsPicker({
                                    postId,
                                    initialReaction,
                                    initialCount = 0,
                                    onReact,
                                }: ReactionsPickerProps) {
    const [selectedReaction, setSelectedReaction] = useState<ReactionType | null>(
        () => (initialReaction as ReactionType) ?? null
    );
    const [count, setCount] = useState(initialCount);
    const [showQuickPicker, setShowQuickPicker] = useState(false);

    const hoverTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const leaveTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedReaction((initialReaction as ReactionType) ?? null);
    }, [initialReaction]);

    useEffect(() => {
        setCount(initialCount);
    }, [initialCount]);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowQuickPicker(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const handleMouseEnter = () => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        hoverTimerRef.current = setTimeout(() => setShowQuickPicker(true), 350);
    };

    const handleMouseLeave = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        leaveTimerRef.current = setTimeout(() => setShowQuickPicker(false), 300);
    };

    const emitReaction = (reaction: ReactionType | null) => {
        onReact?.(postId, reaction);
    };

    const handleQuickReact = (label: ReactionType) => {
        setShowQuickPicker(false);
        const isSame = selectedReaction === label;

        if (isSame) {
            setSelectedReaction(null);
            setCount((c) => Math.max(0, c - 1));
            emitReaction(null);
            return;
        }

        if (!selectedReaction) {
            setCount((c) => c + 1);
        }

        setSelectedReaction(label);
        emitReaction(label);
    };

    const handleMainClick = () => {
        if (showQuickPicker) return;

        if (selectedReaction) {
            setSelectedReaction(null);
            setCount((c) => Math.max(0, c - 1));
            emitReaction(null);
            return;
        }

        setSelectedReaction("Like");
        setCount((c) => c + 1);
        emitReaction("Like");
    };

    const isActive = !!selectedReaction;

    return (
        <div
            ref={containerRef}
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {showQuickPicker && (
                <div
                    className="absolute bottom-full left-0 mb-2 flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
                    onMouseEnter={() => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); }}
                    onMouseLeave={handleMouseLeave}
                >
                    {QUICK_REACTIONS.map((r) => (
                        <button
                            key={r.label}
                            type="button"
                            onClick={() => handleQuickReact(r.label)}
                            className="group relative flex items-center justify-center w-9 h-9 transition-transform duration-150 ease-out hover:scale-135 hover:-translate-y-1.5 cursor-pointer"
                            title={r.tooltip}
                            aria-label={r.tooltip}
                        >
                            <ReactionIcon type={r.label} size={32} className="drop-shadow-sm select-none" />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] font-medium px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap pointer-events-none shadow-md">
                                {r.tooltip}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={handleMainClick}
                aria-pressed={isActive}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer",
                    isActive
                        ? "bg-transparent"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                style={isActive ? { color: REACTION_COLORS[selectedReaction] } : undefined}
            >
                {isActive ? (
                    <ReactionIcon type={selectedReaction} size={18} />
                ) : (
                    <ThumbsUp className="h-4 w-4" />
                )}
                <span>{isActive ? selectedReaction : "Like"}</span>
                {count > 0 && <span className="text-xs text-gray-500 ml-1 font-normal">{count}</span>}
            </button>
        </div>
    );
}