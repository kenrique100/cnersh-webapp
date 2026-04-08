"use client";

import React from "react";
import { ReactionIcon, type ReactionType, REACTION_ICONS } from "@/components/reaction-icons";
import { cn } from "@/lib/utils";

interface ReactionButtonProps {
    reaction: {
        label: string;
        color?: string;
    };
    onClick: () => void;
    isActive?: boolean;
    className?: string;
}

export function ReactionButton({ reaction, onClick, isActive = false, className = "" }: ReactionButtonProps) {
    const [isClicked, setIsClicked] = React.useState(false);

    const handleClick = () => {
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 300);
        onClick();
    };

    const validLabel = reaction.label as ReactionType;
    const hasIcon = validLabel in REACTION_ICONS;

    return (
        <button
            onClick={handleClick}
            type="button"
            className={cn(
                "group relative flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200",
                "hover:scale-110 hover:shadow-lg",
                isClicked && "animate-bounce-click",
                isActive && "bg-blue-50 dark:bg-blue-950",
                className
            )}
            style={{
                animation: isClicked ? "popBounce 0.3s ease-out" : undefined,
            }}
        >
            {hasIcon ? (
                <div className={cn(
                    "transform transition-all duration-200",
                    "group-hover:scale-110 group-hover:drop-shadow-lg"
                )}>
                    <ReactionIcon type={validLabel} size={24} />
                </div>
            ) : (
                <span className="text-xl">{reaction.label}</span>
            )}
            <span className={cn(
                "text-xs font-medium transition-opacity",
                "opacity-0 group-hover:opacity-100",
                "text-gray-700 dark:text-gray-300"
            )}>
                {reaction.label}
            </span>
        </button>
    );
}

interface ReactionPickerProps {
    reactions: readonly { label: string; color?: string }[];
    onReaction: (label: string) => void;
    userReaction?: string | null;
    className?: string;
}

export function ReactionPicker({ reactions, onReaction, userReaction, className = "" }: ReactionPickerProps) {
    return (
        <div className={cn(
            "flex items-center gap-1 sm:gap-2 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700",
            className
        )}>
            {reactions.map((reaction) => (
                <ReactionButton
                    key={reaction.label}
                    reaction={reaction}
                    onClick={() => onReaction(reaction.label)}
                    isActive={userReaction === reaction.label}
                />
            ))}
        </div>
    );
}

// Add CSS animation for pop/bounce effect
if (typeof document !== "undefined") {
    const styleId = "reaction-animations";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            @keyframes popBounce {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }

            .animate-bounce-click {
                animation: popBounce 0.3s ease-out;
            }
        `;
        document.head.appendChild(style);
    }
}
