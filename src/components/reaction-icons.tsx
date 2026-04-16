import React from "react";

// LinkedIn-style reaction types used across the app
export type ReactionType = "Like" | "Celebrate" | "Love" | "Insightful" | "Funny" | "Support";

interface IconProps {
    size?: number;
    className?: string;
}

export function LikeIcon({ size = 24, className = "" }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="likeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0D8BE8" />
                    <stop offset="100%" stopColor="#0A66C2" />
                </linearGradient>
                <filter id="likeShadow">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
                </filter>
            </defs>
            <circle cx="12" cy="12" r="12" fill="url(#likeGradient)" />
            <path
                d="M7 11h2v6H7v-6zm3-4c0-.6.4-1 1-1h.5c.3 0 .5.2.5.4L12 9h3.5c.8 0 1.5.7 1.5 1.5v.5c0 .2 0 .4-.1.6l-1.5 3.5c-.3.5-.8.9-1.4.9H10v-8z"
                fill="white"
            />
        </svg>
    );
}

export function CelebrateIcon({ size = 24, className = "" }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="celebrateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6ED98F" />
                    <stop offset="100%" stopColor="#57C27D" />
                </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="12" fill="url(#celebrateGradient)" />
            <path
                d="M6 18l3-7 4 4-7 3zm4-8l2-4 2 2-4 2zm5-2l1-2 2 1-3 1zm1 4l2-1 1 2-3-1z"
                fill="white"
            />
        </svg>
    );
}

export function LoveIcon({ size = 24, className = "" }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="loveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F87171" />
                    <stop offset="100%" stopColor="#F5666C" />
                </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="12" fill="url(#loveGradient)" />
            <path
                d="M12 17l-1-.9C7.5 13.4 5 11.3 5 8.6 5 6.5 6.7 5 8.5 5c1.1 0 2.1.5 2.7 1.3.6-.8 1.6-1.3 2.8-1.3C15.8 5 17 6.2 17 8.2c0 3.1-2.5 5.2-5 8.1z"
                fill="white"
            />
        </svg>
    );
}

export function InsightfulIcon({ size = 24, className = "" }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="insightfulGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#F5A623" />
                </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="12" fill="url(#insightfulGradient)" />
            <path
                d="M12 4a5 5 0 0 1 4 8c-.5.6-1 1.2-1 2v1H9v-1c0-.8-.5-1.4-1-2A5 5 0 0 1 12 4zm-2 13h4v1a2 2 0 0 1-4 0v-1z"
                fill="white"
            />
        </svg>
    );
}

export function FunnyIcon({ size = 24, className = "" }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="funnyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#93D5F5" />
                    <stop offset="100%" stopColor="#7FD1F6" />
                </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="12" fill="url(#funnyGradient)" />
            <circle cx="12" cy="12" r="7" fill="none" stroke="white" strokeWidth="1.5" />
            <circle cx="9.5" cy="10.5" r="1" fill="white" />
            <circle cx="14.5" cy="10.5" r="1" fill="white" />
            <path
                d="M9 14c.8 1.5 5.2 1.5 6 0"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    );
}

export function SupportIcon({ size = 24, className = "" }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="supportGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A78BFA" />
                    <stop offset="100%" stopColor="#9B6DD6" />
                </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="12" fill="url(#supportGradient)" />
            <path
                d="M9 9c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3-3-1.3-3-3zm-3 9c0-2.2 2.7-4 6-4s6 1.8 6 4H6z"
                fill="white"
            />
        </svg>
    );
}

export const REACTION_ICONS: Record<ReactionType, React.ComponentType<{ size?: number; className?: string }>> = {
    Like: LikeIcon,
    Celebrate: CelebrateIcon,
    Love: LoveIcon,
    Insightful: InsightfulIcon,
    Funny: FunnyIcon,
    Support: SupportIcon,
};

export interface ReactionIconProps {
    type: ReactionType;
    /** Diameter in px. Default 24 */
    size?: number;
    className?: string;
    /** Inline styles — used for overlap offset and z-index in stacked reaction displays */
    style?: React.CSSProperties;
}

/** Renders the matching SVG icon for a given reaction type. */
export function ReactionIcon({ type, size = 24, className = "", style }: ReactionIconProps) {
    const IconComponent = REACTION_ICONS[type];
    return (
        <span style={style} className="inline-flex shrink-0">
            <IconComponent size={size} className={className} />
        </span>
    );
}
