"use client";

import React from "react";

export type ReactionType =
    | "Like"
    | "Celebrate"
    | "Support"
    | "Love"
    | "Insightful"
    | "Funny";

/** WhatsApp-style order: most-used reactions first. */
export const REACTION_ORDER: ReactionType[] = [
    "Like",
    "Love",
    "Funny",
    "Celebrate",
    "Insightful",
    "Support",
];

/** The single source of truth for how each reaction renders. */
export const REACTION_EMOJI: Record<ReactionType, string> = {
    Like: "👍",
    Love: "❤️",
    Funny: "😂",
    Celebrate: "🎉",
    Insightful: "💡",
    Support: "🙏",
};

/** Kept for backwards compatibility — no longer used for icon fills. */
export const REACTION_COLORS: Record<ReactionType, string> = {
    Like: "#0A66C2",
    Celebrate: "#17A34A",
    Support: "#5B7083",
    Love: "#F56B62",
    Insightful: "#F5B326",
    Funny: "#0284C7",
};

export const REACTION_PASTEL_COLORS: Record<ReactionType, string> = {
    Like: "#D0E4FF",
    Celebrate: "#C8F7D5",
    Support: "#D3DCE6",
    Love: "#FFD1CD",
    Insightful: "#FDE7B6",
    Funny: "#E0F2FE",
};

export function isReactionType(value: string): value is ReactionType {
    return (REACTION_ORDER as string[]).includes(value);
}

/** Convenience: get the emoji character for a label, or "" if unknown. */
export function getReactionEmojiChar(label: string | null | undefined): string {
    if (!label) return "";
    return isReactionType(label) ? REACTION_EMOJI[label] : "";
}

export interface ReactionIconProps {
    type: ReactionType | string;
    /** Font size in pixels. Default 24. */
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Renders a reaction as a plain emoji character — WhatsApp-style.
 * `size` controls the font-size in pixels.
 */
export function ReactionIcon({
                                 type,
                                 size = 24,
                                 className = "",
                                 style,
                             }: ReactionIconProps) {
    const emoji = isReactionType(type) ? REACTION_EMOJI[type] : "👍";

    return (
        <span
            role="img"
            aria-label={String(type)}
            className={`inline-flex shrink-0 items-center justify-center leading-none select-none ${className}`}
            style={{ fontSize: size, lineHeight: 1, ...style }}
        >
            {emoji}
        </span>
    );
}

/* ─── Backwards-compatible named exports ─────────────────────────────
 * Existing imports across the codebase reference these names. They now
 * delegate to ReactionIcon and render emoji, but the call sites don't
 * need to change.
 * ─────────────────────────────────────────────────────────────────── */

type SimpleIconProps = Omit<ReactionIconProps, "type">;

export function LikeIcon(props: SimpleIconProps) { return <ReactionIcon type="Like" {...props} />; }
export function CelebrateIcon(props: SimpleIconProps) { return <ReactionIcon type="Celebrate" {...props} />; }
export function SupportIcon(props: SimpleIconProps) { return <ReactionIcon type="Support" {...props} />; }
export function LoveIcon(props: SimpleIconProps) { return <ReactionIcon type="Love" {...props} />; }
export function InsightfulIcon(props: SimpleIconProps) { return <ReactionIcon type="Insightful" {...props} />; }
export function FunnyIcon(props: SimpleIconProps) { return <ReactionIcon type="Funny" {...props} />; }

export const REACTION_ICONS: Record<ReactionType, React.ComponentType<SimpleIconProps>> = {
    Like: LikeIcon,
    Celebrate: CelebrateIcon,
    Support: SupportIcon,
    Love: LoveIcon,
    Insightful: InsightfulIcon,
    Funny: FunnyIcon,
};