import React from "react";

export type ReactionType =
    | "Like"
    | "Celebrate"
    | "Love"
    | "Insightful"
    | "Curious"
    | "Funny"
    | "Support";

interface IconProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Colors matched to LinkedIn's actual reaction chips.
 */
export const REACTION_COLORS: Record<ReactionType, string> = {
    Like:       "#5B9BD5", // blue
    Celebrate:  "#6FA662", // green
    Love:       "#D9646B", // red/coral
    Insightful: "#E8A93D", // gold
    Curious:    "#8B7EC8", // purple
    Funny:      "#E8A93D", // orange/gold (same family as Insightful, slightly warmer)
    Support:    "#4FA6B5", // teal
};

function CircleIcon({
                        size = 24,
                        className = "",
                        style,
                        bg,
                        label,
                        children,
                    }: IconProps & { bg: string; label: string; children: React.ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            className={className}
            style={style}
            role="img"
            aria-label={label}
        >
            <circle cx="20" cy="20" r="20" fill={bg} />
            <g
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {children}
            </g>
        </svg>
    );
}

export function LikeIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Like} label="Like">
            <path
                fill="#FFFFFF"
                stroke="none"
                d="M14 18h-3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3v-11Z"
            />
            <path
                fill="#FFFFFF"
                stroke="none"
                d="M16 18.2 19.6 11a2 2 0 0 1 3.6 1.6l-1.3 4.4h4.4a2 2 0 0 1 1.9 2.7l-2.6 7A2 2 0 0 1 23.7 28H16v-9.8Z"
            />
        </CircleIcon>
    );
}

export function CelebrateIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Celebrate} label="Celebrate">
            <path fill="#FFFFFF" stroke="none" d="M12 24l4-9 3 1.5-4 9-3-1.5Z" />
            <path fill="#FFFFFF" stroke="none" d="M19 25l3-10 3 1-3 10-3-1Z" />
            <path fill="#FFFFFF" stroke="none" d="M25 24l2.5-8 3 1-2.5 8-3-1Z" />
            <path d="M14 12l1 2M20 10v2M26 12l-1 2" />
        </CircleIcon>
    );
}

export function SupportIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Support} label="Support">
            <path
                fill="#FFFFFF"
                stroke="none"
                d="M20 17c-1-2.2-3.1-3-4.7-2.2-1.8.9-2.4 3.2-1.1 5l5.8 6.7 5.8-6.7c1.3-1.8.7-4.1-1.1-5-1.6-.8-3.7 0-4.7 2.2Z"
            />
            <path d="M11 27c1.5-2 3.8-3 6-3h6c2.2 0 4.5 1 6 3" />
        </CircleIcon>
    );
}

export function LoveIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Love} label="Love">
            <path
                fill="#FFFFFF"
                stroke="none"
                d="M20 28s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 28 17c0 6-8 11-8 11Z"
            />
        </CircleIcon>
    );
}

export function InsightfulIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Insightful} label="Insightful">
            <path
                fill="#FFFFFF"
                stroke="none"
                d="M20 11a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 20 11Z"
            />
            <path d="M17.5 28.5h5M18 30.5h4" stroke="#FFFFFF" />
        </CircleIcon>
    );
}

export function CuriousIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Curious} label="Curious">
            {/* Face */}
            <circle cx="20" cy="21" r="8.5" fill="none" />
            {/* Raised eyebrow */}
            <path d="M15.5 15.8c1-.7 2.3-.7 3.2 0" />
            {/* Neutral brow on the other side */}
            <path d="M21.5 16.2h3" />
            {/* Eyes */}
            <circle cx="17" cy="19.5" r="1.1" fill="#FFFFFF" stroke="none" />
            <circle cx="23" cy="19.5" r="1.1" fill="#FFFFFF" stroke="none" />
            {/* Pursed, thinking mouth */}
            <path d="M17.5 24.5c1.5.9 3.5.9 5 0" />
            {/* Chin-resting hand, index finger up — signals "hmm" */}
            <path d="M25 25c1-.5 1.8-1.3 2-2.4M27 22.6c.3-1 .1-2-.5-2.7" />
        </CircleIcon>
    );
}

export function FunnyIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Funny} label="Funny">
            <circle cx="20" cy="20" r="9" fill="none" />
            <path d="M15 22c1.2 2 3 3 5 3s3.8-1 5-3" fill="none" />
            <path d="M14.5 17.3c.6-.7 1.6-.7 2.2 0" />
            <path d="M23.3 17.3c.6-.7 1.6-.7 2.2 0" />
        </CircleIcon>
    );
}

export const REACTION_ICONS: Record<
    ReactionType,
    React.ComponentType<IconProps>
> = {
    Like:       LikeIcon,
    Celebrate:  CelebrateIcon,
    Love:       LoveIcon,
    Insightful: InsightfulIcon,
    Curious:    CuriousIcon,
    Funny:      FunnyIcon,
    Support:    SupportIcon,
};

export interface ReactionIconProps {
    type: ReactionType;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export function ReactionIcon({
                                 type,
                                 size = 24,
                                 className = "",
                                 style,
                             }: ReactionIconProps) {
    const IconComponent = REACTION_ICONS[type];

    if (!IconComponent) {
        return (
            <span style={style} className={className}>
                ❓
            </span>
        );
    }

    return (
        <span style={style} className={`inline-flex shrink-0 ${className}`}>
            <IconComponent size={size} />
        </span>
    );
}