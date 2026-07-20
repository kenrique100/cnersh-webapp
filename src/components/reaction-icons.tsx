import React from "react";

export type ReactionType = "Like" | "Celebrate" | "Support" | "Love" | "Insightful" | "Funny";

export const REACTION_ORDER: ReactionType[] = ["Like", "Celebrate", "Support", "Love", "Insightful", "Funny"];

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

const DARK_BLUE = "#102A43";

interface IconProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

interface CircleIconProps extends IconProps {
    bg: string;
    label: string;
    innerFill: string;
    children: React.ReactNode;
}

function CircleIcon({
                        size = 40,
                        className = "",
                        style,
                        bg,
                        label,
                        innerFill,
                        children,
                    }: CircleIconProps) {
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
            <circle cx="20" cy="20" r="19" fill={bg} />
            <g fill={innerFill} stroke={DARK_BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {children}
            </g>
        </svg>
    );
}

export function LikeIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Like} innerFill={REACTION_PASTEL_COLORS.Like} label="Like">
            <path d="M12.5 28.5H24c1.2 0 2.2-.8 2.5-1.8l1.3-4.2c.4-1.2-.4-2.5-1.7-2.5h-5.6l.8-4.3c.3-1.5-.5-3-2-3.3-1.2-.2-2.3.5-2.5 1.7l-1.5 5.4h-2.8v9Z" />
            <path d="M12.5 28.5h-3c-.8 0-1.5-.7-1.5-1.5v-6c0-.8.7-1.5 1.5-1.5h3v9Z" />
        </CircleIcon>
    );
}

export function CelebrateIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Celebrate} innerFill={REACTION_PASTEL_COLORS.Celebrate} label="Celebrate">
            <path d="M12 26l4-9 3 1.5-4 9-3-1.5Z" />
            <path d="M19 27l3-10 3 1-3 10-3-1Z" />
            <path d="M25 26l2.5-8 3 1-2.5 8-3-1Z" />
            <path d="M14 12l1 2" fill="none" />
            <path d="M20 10v2" fill="none" />
            <path d="M26 12l-1 2" fill="none" />
        </CircleIcon>
    );
}

export function SupportIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Support} innerFill={REACTION_PASTEL_COLORS.Support} label="Support">
            <path d="M11 27c1.5-2 3.8-3 6-3h6c2.2 0 4.5 1 6 3" fill="none" />
            <path d="M20 15c-1-2.2-3.1-3-4.7-2.2-1.8.9-2.4 3.2-1.1 5l5.8 6.7 5.8-6.7c1.3-1.8.7-4.1-1.1-5-1.6-.8-3.7 0-4.7 2.2Z" />
        </CircleIcon>
    );
}

export function LoveIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Love} innerFill={REACTION_PASTEL_COLORS.Love} label="Love">
            <path d="M20 29s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 28 18c0 6-8 11-8 11Z" />
        </CircleIcon>
    );
}

export function InsightfulIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Insightful} innerFill={REACTION_PASTEL_COLORS.Insightful} label="Insightful">
            <path d="M20 11a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 20 11Z" />
            <path d="M17.5 28.5h5" fill="none" />
            <path d="M18 30.5h4" fill="none" />
        </CircleIcon>
    );
}

export function FunnyIcon(props: IconProps) {
    return (
        <CircleIcon {...props} bg={REACTION_COLORS.Funny} innerFill={REACTION_PASTEL_COLORS.Funny} label="Funny">
            <circle cx="20" cy="20" r="8.5" fill="none" />
            <path d="M14.5 19.5c1.5 3.5 9.5 3.5 11 0" fill="#102A43" />
            <path d="M14 16.5c.8-.8 2.2-.8 3 0M23 16.5c.8-.8 2.2-.8 3 0" fill="none" />
        </CircleIcon>
    );
}

export const REACTION_ICONS: Record<ReactionType, React.ComponentType<IconProps>> = {
    Like: LikeIcon,
    Celebrate: CelebrateIcon,
    Support: SupportIcon,
    Love: LoveIcon,
    Insightful: InsightfulIcon,
    Funny: FunnyIcon,
};

export function isReactionType(value: string): value is ReactionType {
    return (REACTION_ORDER as string[]).includes(value);
}

export interface ReactionIconProps {
    type: ReactionType;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export function ReactionIcon({ type, size = 24, className = "", style }: ReactionIconProps) {
    const IconComponent = REACTION_ICONS[type];
    if (!IconComponent) return <span style={style} className={className}>❓</span>;
    return (
        <span style={style} className={`inline-flex shrink-0 ${className}`}>
            <IconComponent size={size} />
        </span>
    );
}