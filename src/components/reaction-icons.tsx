import React from "react";

// LinkedIn-style reaction icons with gradients and 3D effects

interface ReactionIconProps {
    size?: number;
    className?: string;
}

export function LikeIcon({ size = 24, className = "" }: ReactionIconProps) {
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
                    <stop offset="0%" stopColor="#0A66C2" />
                    <stop offset="100%" stopColor="#004182" />
                </linearGradient>
                <filter id="likeShadow">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
                </filter>
            </defs>
            <circle
                cx="12"
                cy="12"
                r="11"
                fill="url(#likeGradient)"
                filter="url(#likeShadow)"
            />
            <circle cx="12" cy="9" r="8" fill="url(#likeGradient)" opacity="0.1" />
            <path
                d="M7 11.5V19.5C7 19.7761 7.22386 20 7.5 20H8.5C8.77614 20 9 19.7761 9 19.5V11.5C9 11.2239 8.77614 11 8.5 11H7.5C7.22386 11 7 11.2239 7 11.5Z"
                fill="white"
            />
            <path
                d="M10 12C10 11.4477 10.4477 11 11 11H14.5858L15.7071 9.87868C16.0976 9.48816 16.0976 8.85499 15.7071 8.46447C15.3166 8.07394 14.6834 8.07394 14.2929 8.46447L12.5 10.2574V6C12.5 5.44772 12.9477 5 13.5 5C14.0523 5 14.5 5.44772 14.5 6V8.5H16C16.5523 8.5 17 8.94772 17 9.5V12C17 12.5523 16.5523 13 16 13H11C10.4477 13 10 12.5523 10 12Z"
                fill="white"
            />
            <path
                d="M10 14H16C16.5523 14 17 14.4477 17 15V18.5C17 19.0523 16.5523 19.5 16 19.5H11C10.4477 19.5 10 19.0523 10 18.5V15C10 14.4477 10.4477 14 11 14H10Z"
                fill="white"
            />
        </svg>
    );
}

export function CelebrateIcon({ size = 24, className = "" }: ReactionIconProps) {
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
                    <stop offset="0%" stopColor="#57C27D" />
                    <stop offset="100%" stopColor="#3A9B5C" />
                </linearGradient>
                <filter id="celebrateShadow">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
                </filter>
            </defs>
            <circle
                cx="12"
                cy="12"
                r="11"
                fill="url(#celebrateGradient)"
                filter="url(#celebrateShadow)"
            />
            <circle cx="12" cy="9" r="8" fill="url(#celebrateGradient)" opacity="0.1" />
            <path
                d="M8 10C8 10 8.5 11.5 9 12.5C9.5 13.5 10 14 11 14C12 14 12.5 13.5 13 12.5C13.5 11.5 14 10 14 10"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M10 14.5C10 14.5 10.5 16 11 17C11.5 18 12 18.5 13 18.5C14 18.5 14.5 18 15 17C15.5 16 16 14.5 16 14.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M6 14C6 14 6.5 15.5 7 16.5C7.5 17.5 8 18 9 18C10 18 10.5 17.5 11 16.5C11.5 15.5 12 14 12 14"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function LoveIcon({ size = 24, className = "" }: ReactionIconProps) {
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
                    <stop offset="0%" stopColor="#F5666C" />
                    <stop offset="100%" stopColor="#D4424B" />
                </linearGradient>
                <filter id="loveShadow">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
                </filter>
            </defs>
            <circle
                cx="12"
                cy="12"
                r="11"
                fill="url(#loveGradient)"
                filter="url(#loveShadow)"
            />
            <circle cx="12" cy="9" r="8" fill="url(#loveGradient)" opacity="0.1" />
            <path
                d="M12 8.5C10.5 6.5 7.5 6.5 6.5 8.5C5.5 10.5 6 12.5 8 14.5C10 16.5 12 17.5 12 17.5C12 17.5 14 16.5 16 14.5C18 12.5 18.5 10.5 17.5 8.5C16.5 6.5 13.5 6.5 12 8.5Z"
                fill="white"
            />
        </svg>
    );
}

export function InsightfulIcon({ size = 24, className = "" }: ReactionIconProps) {
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
                    <stop offset="0%" stopColor="#F5A623" />
                    <stop offset="100%" stopColor="#D68910" />
                </linearGradient>
                <filter id="insightfulShadow">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
                </filter>
            </defs>
            <circle
                cx="12"
                cy="12"
                r="11"
                fill="url(#insightfulGradient)"
                filter="url(#insightfulShadow)"
            />
            <circle cx="12" cy="9" r="8" fill="url(#insightfulGradient)" opacity="0.1" />
            <path
                d="M12 6C10.3431 6 9 7.34315 9 9C9 10.3062 9.83481 11.4175 11 11.8293V14C11 14.5523 11.4477 15 12 15C12.5523 15 13 14.5523 13 14V11.8293C14.1652 11.4175 15 10.3062 15 9C15 7.34315 13.6569 6 12 6Z"
                fill="white"
            />
            <path
                d="M10.5 16.5C10.5 16.2239 10.7239 16 11 16H13C13.2761 16 13.5 16.2239 13.5 16.5C13.5 16.7761 13.2761 17 13 17H11C10.7239 17 10.5 16.7761 10.5 16.5Z"
                fill="white"
            />
            <path
                d="M10.5 18C10.5 17.7239 10.7239 17.5 11 17.5H13C13.2761 17.5 13.5 17.7239 13.5 18C13.5 18.2761 13.2761 18.5 13 18.5H11C10.7239 18.5 10.5 18.2761 10.5 18Z"
                fill="white"
            />
        </svg>
    );
}

export function FunnyIcon({ size = 24, className = "" }: ReactionIconProps) {
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
                    <stop offset="0%" stopColor="#7FD1F6" />
                    <stop offset="100%" stopColor="#5AB3D9" />
                </linearGradient>
                <filter id="funnyShadow">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
                </filter>
            </defs>
            <circle
                cx="12"
                cy="12"
                r="11"
                fill="url(#funnyGradient)"
                filter="url(#funnyShadow)"
            />
            <circle cx="12" cy="9" r="8" fill="url(#funnyGradient)" opacity="0.1" />
            <circle cx="9" cy="10" r="1.5" fill="white" />
            <circle cx="15" cy="10" r="1.5" fill="white" />
            <path
                d="M8 13C8 13 9 16 12 16C15 16 16 13 16 13"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function SupportIcon({ size = 24, className = "" }: ReactionIconProps) {
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
                    <stop offset="0%" stopColor="#9B6DD6" />
                    <stop offset="100%" stopColor="#7B4FB8" />
                </linearGradient>
                <filter id="supportShadow">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
                </filter>
            </defs>
            <circle
                cx="12"
                cy="12"
                r="11"
                fill="url(#supportGradient)"
                filter="url(#supportShadow)"
            />
            <circle cx="12" cy="9" r="8" fill="url(#supportGradient)" opacity="0.1" />
            <path
                d="M8 11L10 13L12 11L14 13L16 11"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M10 13C10 13 10 14 10 15C10 16 10.5 17 12 17C13.5 17 14 16 14 15C14 14 14 13 14 13"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

// Map of reaction types to their components
export const REACTION_ICONS = {
    Like: LikeIcon,
    Celebrate: CelebrateIcon,
    Love: LoveIcon,
    Insightful: InsightfulIcon,
    Funny: FunnyIcon,
    Support: SupportIcon,
} as const;

export type ReactionType = keyof typeof REACTION_ICONS;

interface ReactionIconComponentProps {
    type: ReactionType;
    size?: number;
    className?: string;
}

export function ReactionIcon({ type, size = 24, className = "" }: ReactionIconComponentProps) {
    const IconComponent = REACTION_ICONS[type];
    return <IconComponent size={size} className={className} />;
}
