"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
    ReactionIcon,
    REACTION_COLORS,
    REACTION_ORDER,
    type ReactionType,
} from "@/components/reaction-icons";

export interface ReactionButtonProps {
    reaction: {
        label: ReactionType;
        color?: string;
    };
    onClick: () => void;
    isActive?: boolean;
    className?: string;
}

export function ReactionButton({ reaction, onClick, isActive = false, className = "" }: ReactionButtonProps) {
    const [isClicked, setIsClicked] = useState(false);

    const handleClick = () => {
        setIsClicked(true);
        window.setTimeout(() => setIsClicked(false), 240);
        onClick();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
        }
    };

    const color = reaction.color || REACTION_COLORS[reaction.label];

    return (
        <button
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            type="button"
            aria-pressed={isActive}
            aria-label={reaction.label}
            className={cn(
                "group relative flex flex-col items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all duration-200",
                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                isActive && "bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-100 dark:ring-blue-900",
                className
            )}
            style={{ animation: isClicked ? "popBounce 0.24s ease-out" : undefined }}
        >
            <div
                className={cn(
                    "flex items-center justify-center rounded-full transition-transform duration-200 shadow-sm",
                    "group-hover:scale-105 group-hover:shadow-md",
                    isActive && "ring-2 ring-white dark:ring-gray-950"
                )}
                style={{ backgroundColor: color, width: 38, height: 38 }}
            >
                <ReactionIcon type={reaction.label} size={22} />
            </div>
            <span className={cn(
                "text-[11px] font-semibold text-gray-600 dark:text-gray-400 transition-opacity duration-150",
                "opacity-0 group-hover:opacity-100"
            )}>
                {reaction.label}
            </span>
        </button>
    );
}

export interface ReactionPickerProps {
    reactions?: readonly { label: ReactionType; color?: string }[];
    onReaction: (label: ReactionType | null) => void;
    userReaction?: ReactionType | null;
    className?: string;
}

export function ReactionPicker({
                                   reactions = REACTION_ORDER.map((label) => ({ label })),
                                   onReaction,
                                   userReaction,
                                   className = "",
                               }: ReactionPickerProps) {
    const handleReaction = (label: ReactionType) => {
        onReaction(userReaction === label ? null : label);
    };

    return (
        <div className={cn(
            "flex items-center gap-1 p-1.5 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800",
            className
        )}>
            {reactions.map((reaction) => (
                <ReactionButton
                    key={reaction.label}
                    reaction={reaction}
                    onClick={() => handleReaction(reaction.label)}
                    isActive={userReaction === reaction.label}
                />
            ))}
        </div>
    );
}