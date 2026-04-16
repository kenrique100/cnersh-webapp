import React from "react";

// Reaction type must match exactly what reactions-picker.tsx uses
export type ReactionType = "Like" | "Love" | "Haha" | "Wow" | "Sad" | "Angry";

// Map each reaction to its actual emoji + background color (LinkedIn-style circle)
const REACTION_META: Record<ReactionType, { emoji: string; bg: string; label: string }> = {
    Like:  { emoji: "\uD83D\uDC4D", bg: "#0A66C2", label: "Like"  },
    Love:  { emoji: "\u2764\uFE0F",  bg: "#F5666C", label: "Love"  },
    Haha:  { emoji: "\uD83D\uDE02", bg: "#F7C948", label: "Haha"  },
    Wow:   { emoji: "\uD83D\uDE2E", bg: "#F5A623", label: "Wow"   },
    Sad:   { emoji: "\uD83D\uDE22", bg: "#9B6DD6", label: "Sad"   },
    Angry: { emoji: "\uD83D\uDE21", bg: "#E5534B", label: "Angry" },
};

export interface ReactionIconProps {
    type: ReactionType;
    /** Diameter of the circle in px. Default 24 */
    size?: number;
    className?: string;
    /** Inline styles — used for overlap offset and z-index in stacked reaction displays */
    style?: React.CSSProperties;
}

/**
 * Renders a LinkedIn-style reaction badge:
 *   a small coloured circle with the actual emoji centred inside.
 */
export function ReactionIcon({ type, size = 24, className = "", style }: ReactionIconProps) {
    const meta = REACTION_META[type];
    const fontSize = Math.round(size * 0.6);

    return (
        <span
            className={`inline-flex items-center justify-center rounded-full shrink-0 select-none ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: meta.bg,
                fontSize: fontSize,
                lineHeight: 1,
                boxShadow: "0 0 0 1.5px #fff",   // white ring — looks great when overlapping
                ...style,
            }}
            title={meta.label}
            aria-label={meta.label}
        >
            {meta.emoji}
        </span>
    );
}

// Keep REACTION_ICONS for any legacy imports that reference it by name
export const REACTION_ICONS: Record<ReactionType, React.ComponentType<{ size?: number; className?: string }>> = {
    Like:  ({ size = 24, className = "" }) => <ReactionIcon type="Like"  size={size} className={className} />,
    Love:  ({ size = 24, className = "" }) => <ReactionIcon type="Love"  size={size} className={className} />,
    Haha:  ({ size = 24, className = "" }) => <ReactionIcon type="Haha"  size={size} className={className} />,
    Wow:   ({ size = 24, className = "" }) => <ReactionIcon type="Wow"   size={size} className={className} />,
    Sad:   ({ size = 24, className = "" }) => <ReactionIcon type="Sad"   size={size} className={className} />,
    Angry: ({ size = 24, className = "" }) => <ReactionIcon type="Angry" size={size} className={className} />,
};
