import React from "react";

export type ReactionType = "Like" | "Celebrate" | "Love" | "Insightful" | "Funny" | "Support" | "Wow";

interface IconProps {
    size?: number;
    className?: string;
}

function EmojiIcon({ emoji, label, size = 24, className = "" }: IconProps & { emoji: string; label: string }) {
    return (
        <span
            className={className}
            style={{ fontSize: `${size}px`, lineHeight: 1 }}
            role="img"
            aria-label={label}
        >
            {emoji}
        </span>
    );
}

export function LikeIcon(props: IconProps) {
    return <EmojiIcon {...props} emoji="👍" label="Like" />;
}

export function CelebrateIcon(props: IconProps) {
    return <EmojiIcon {...props} emoji="🎉" label="Celebrate" />;
}

export function LoveIcon(props: IconProps) {
    return <EmojiIcon {...props} emoji="❤️" label="Love" />;
}

export function InsightfulIcon(props: IconProps) {
    return <EmojiIcon {...props} emoji="💡" label="Insightful" />;
}

export function FunnyIcon(props: IconProps) {
    return <EmojiIcon {...props} emoji="😂" label="Funny" />;
}

export function SupportIcon(props: IconProps) {
    return <EmojiIcon {...props} emoji="🤝" label="Support" />;
}

export function WowIcon(props: IconProps) {
    return <EmojiIcon {...props} emoji="😮" label="Wow" />;
}

export const REACTION_ICONS: Record<ReactionType, React.ComponentType<{ size?: number; className?: string }>> = {
    Like: LikeIcon,
    Celebrate: CelebrateIcon,
    Love: LoveIcon,
    Insightful: InsightfulIcon,
    Funny: FunnyIcon,
    Support: SupportIcon,
    Wow: WowIcon,
};

export interface ReactionIconProps {
    type: ReactionType;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export function ReactionIcon({ type, size = 24, className = "", style }: ReactionIconProps) {
    const IconComponent = REACTION_ICONS[type];
    if (!IconComponent) {
        if (process.env.NODE_ENV === "development") {
            console.warn(`Unknown reaction type: "${type}"`);
        }
        return null;
    }
    return (
        <span style={style} className="inline-flex shrink-0">
            <IconComponent size={size} className={className} />
        </span>
    );
}
