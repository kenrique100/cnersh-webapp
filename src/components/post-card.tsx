"use client";

import React, {JSX} from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionIcon, REACTION_ICONS, type ReactionType } from "@/components/reaction-icons";

// ─── Utility ────────────────────────────────────────────────────────────────

/** Get uppercase initials from a name, e.g. "John Doe" → "JD" */
export function getInitials(name: string | null | undefined): string {
    if (!name) return "U";
    return name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

/** Relative time label – "Just now", "5m ago", "3h ago", etc. */
export function formatRelativeDate(date: Date): string {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now.getTime() - postDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return postDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: postDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

/** Full date for tooltips */
export function formatFullDate(date: Date): string {
    const postDate = new Date(date);
    return postDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Check if a post has user-uploaded media (photos or videos) */
export function postHasMedia(post: { image?: string | null; images?: string[]; video?: string | null; videos?: string[] }): boolean {
    return !!(post.image || (post.images && post.images.length > 0) || post.video || (post.videos && post.videos.length > 0));
}

/** Render post content with clickable links, @mentions, and #hashtags */
export function renderPostContent(content: string): React.ReactNode {
    const combinedRegex = /(https?:\/\/[^\s]+)|(@\w[\w]*)|(\#\w+)/g;
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let hasSpecial = false;

    while ((match = combinedRegex.exec(content)) !== null) {
        hasSpecial = true;
        if (match.index > lastIndex) {
            result.push(content.slice(lastIndex, match.index));
        }
        const matchStr = match[0];
        if (matchStr.startsWith("http")) {
            result.push(
                <a
                    key={match.index}
                    href={matchStr}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline break-all"
                >
                    {matchStr}
                </a>
            );
        } else if (matchStr.startsWith("@")) {
            result.push(
                <span key={match.index} className="text-blue-600 dark:text-blue-400 font-medium">
                    {matchStr}
                </span>
            );
        } else if (matchStr.startsWith("#")) {
            result.push(
                <span key={match.index} className="text-blue-600 dark:text-blue-400 font-medium">
                    {matchStr}
                </span>
            );
        }
        lastIndex = match.index + matchStr.length;
    }
    if (lastIndex < content.length) {
        result.push(content.slice(lastIndex));
    }
    // Return a plain string when no special elements (links/mentions/hashtags) were found
    return hasSpecial ? result : content;
}

// ─── PostCard Container ─────────────────────────────────────────────────────

interface PostCardProps {
    children: React.ReactNode;
}

/** Card wrapper for a single post — white background, rounded corners, shadow */
export function PostCard({ children }: PostCardProps) {
    return (
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            {children}
        </Card>
    );
}

// ─── Post Context Bar ───────────────────────────────────────────────────────

interface ActivityUser {
    id: string;
    name: string | null;
    image: string | null;
}

interface PostContextBarProps {
    users: ActivityUser[];
    likeCount: number;
    commentCount: number;
}

/** Small bar above the card showing recent engagement ("User X likes this") */
export function PostContextBar({ users, likeCount, commentCount }: PostContextBarProps) {
    if (users.length === 0) return null;

    const names = users.slice(0, 2).map((u) => u.name || "Someone");
    const totalEngaged = likeCount + commentCount;
    const remaining = totalEngaged - names.length;
    const actions: string[] = [];
    if (likeCount > 0) actions.push("liked");
    if (commentCount > 0) actions.push("commented on");
    const actionText = actions.join(" and ") || "engaged with";

    let label: string;
    if (names.length === 1 && remaining <= 0) {
        label = `${names[0]} ${actionText} this`;
    } else if (names.length === 2 && remaining <= 0) {
        label = `${names[0]} and ${names[1]} ${actionText} this`;
    } else if (remaining > 0) {
        label = `${names[0]}${names.length > 1 ? `, ${names[1]}` : ""} and ${remaining} other${remaining !== 1 ? "s" : ""} ${actionText} this`;
    } else {
        label = `${names.join(", ")} ${actionText} this`;
    }

    return (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex -space-x-2">
                {users.slice(0, 3).map((user) => (
                    <Avatar key={user.id} className="h-5 w-5 border-2 border-white dark:border-gray-950 ring-0">
                        <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                        <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 font-medium">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                ))}
            </div>
            <span className="truncate">{label}</span>
        </div>
    );
}

// ─── Post Header ────────────────────────────────────────────────────────────

interface PostHeaderProps {
    userName: string | null;
    userImage: string | null;
    userProfession?: string | null;
    createdAt: Date;
    /** Slot for action buttons (edit, delete, report, etc.) */
    actions?: React.ReactNode;
}

/** Author avatar, name, profession, timestamp, and optional action buttons */
export function PostHeader({ userName, userImage, userProfession, createdAt, actions }: PostHeaderProps) {
    const initials = getInitials(userName);

    return (
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-0">
            <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-gray-200 dark:border-gray-700">
                        <AvatarImage src={userImage || undefined} alt={userName || ""} />
                        <AvatarFallback className="bg-blue-700 text-white text-sm font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <p className="font-semibold text-base text-gray-900 dark:text-gray-100 leading-tight">
                            {userName || "Anonymous"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {userProfession || "Community Member"}
                        </p>
                        <p
                            className="text-sm text-gray-400 dark:text-gray-500 mt-0.5"
                            title={formatFullDate(createdAt)}
                        >
                            {formatRelativeDate(createdAt)}
                        </p>
                    </div>
                </div>
                {actions && <div className="flex items-center gap-1">{actions}</div>}
            </div>
        </div>
    );
}

// ─── Post Text Content ──────────────────────────────────────────────────────

const SEE_MORE_THRESHOLD = 300;

interface PostTextContentProps {
    content: string;
    /** Override the default content renderer (e.g. for inline editing) */
    customRender?: React.ReactNode;
}

/** Main text body with a "See more" toggle for long posts */
export function PostTextContent({ content, customRender }: PostTextContentProps) {
    const [expanded, setExpanded] = React.useState(false);
    const isLong = content.length > SEE_MORE_THRESHOLD;

    if (customRender) {
        return <div className="px-3 sm:px-4 py-3">{customRender}</div>;
    }

    const displayText = !expanded && isLong ? content.slice(0, SEE_MORE_THRESHOLD) : content;

    return (
        <div className="px-3 sm:px-4 py-3">
            <p className="text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {renderPostContent(displayText)}
                {!expanded && isLong && (
                    <>
                        {"… "}
                        <button
                            onClick={() => setExpanded(true)}
                            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm"
                        >
                            See more
                        </button>
                    </>
                )}
            </p>
            {expanded && isLong && (
                <button
                    onClick={() => setExpanded(false)}
                    className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm mt-1"
                >
                    See less
                </button>
            )}
        </div>
    );
}

// ─── Post Tags ──────────────────────────────────────────────────────────────

interface PostTagsProps {
    tags?: string[];
}

export function PostTags({ tags }: PostTagsProps) {
    if (!tags || tags.length === 0) return null;

    return (
        <div className="px-3 sm:px-4 pb-2 flex flex-wrap gap-1.5">
            {tags.map((tag, idx) => (
                <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-medium"
                >
                    #{tag}
                </span>
            ))}
        </div>
    );
}

// ─── Post Media Content ─────────────────────────────────────────────────────

interface PostMediaContentProps {
    image?: string | null;
    images?: string[];
    video?: string | null;
    videos?: string[];
    onImageClick?: (index: number) => void;
}

/** Renders images (with click-to-expand) and videos */
export function PostMediaContent({ image, images, video, videos, onImageClick }: PostMediaContentProps) {
    const allImages = [
        ...(image ? [image] : []),
        ...(images || []),
    ];

    const allVideos = [
        ...(video ? [video] : []),
        ...(videos || []),
    ];

    return (
        <>
            {allImages.length > 0 && (
                <div className="border-t border-b border-gray-100 dark:border-gray-800">
                    {allImages.length === 1 ? (
                        <button
                            type="button"
                            className="w-full cursor-pointer focus:outline-none"
                            onClick={() => onImageClick?.(0)}
                        >
                            <Image
                                src={allImages[0]}
                                alt="Post attachment"
                                width={700}
                                height={400}
                                className="w-full object-contain max-h-[500px] bg-gray-50 dark:bg-gray-900"
                                unoptimized
                            />
                        </button>
                    ) : (
                        <div className="grid gap-1 grid-cols-1 sm:grid-cols-2">
                            {allImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className="cursor-pointer focus:outline-none"
                                    onClick={() => onImageClick?.(idx)}
                                >
                                    <Image
                                        src={img}
                                        alt={`Post attachment ${idx + 1}`}
                                        width={350}
                                        height={250}
                                        className={`w-full object-contain max-h-[250px] bg-gray-50 dark:bg-gray-900 ${idx === 0 && allImages.length === 3 ? "col-span-2" : ""}`}
                                        unoptimized
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {allVideos.length > 0 && (
                <div className="border-t border-b border-gray-100 dark:border-gray-800 space-y-1">
                    {allVideos.map((vid, idx) => (
                        <video
                            key={idx}
                            src={vid}
                            controls
                            className="w-full max-h-[500px] object-contain bg-black"
                        />
                    ))}
                </div>
            )}
        </>
    );
}

// ─── Reaction definitions — must stay in sync with reactions-picker.tsx ──────

export const REACTIONS = [
    { label: "Like"       as const, color: "#0A66C2" },
    { label: "Celebrate"  as const, color: "#57C27D" },
    { label: "Support"    as const, color: "#9B6DD6" },
    { label: "Love"       as const, color: "#F5666C" },
    { label: "Insightful" as const, color: "#F5A623" },
    { label: "Funny"      as const, color: "#7FD1F6" },
    { label: "Wow"        as const, color: "#F59E0B" },
] as const;

export function getReactionIcon(label: string): typeof ReactionIcon | null {
    const validLabel = label as ReactionType;
    return REACTION_ICONS[validLabel] ? () => <ReactionIcon type={validLabel} size={14} /> : null;
}

export function getReactionColor(label: string): string {
    return REACTIONS.find((r) => r.label === label)?.color || "#0A66C2";
}

// Backward compatibility
export function getReactionEmoji(label: string): JSX.Element {
    const validLabel = label as ReactionType;
    if (!REACTION_ICONS[validLabel]) {
        return <span className="text-sm">👍</span>;
    }
    return <ReactionIcon type={validLabel} size={14} />;
}

export function getReactionBg(_label?: string): string {
    return "";
}

// ─── Post Engagement Summary ────────────────────────────────────────────────

interface ReactionUser {
    userId: string;
    reactionType: string;
    userName?: string | null;
}

interface PostEngagementSummaryProps {
    likeCount: number;
    commentCount: number;
    shareCount?: number;
    reactionTypes?: string[];
    reactionUsers?: ReactionUser[];
    onLikeCountClick?: () => void;
    onCommentCountClick?: () => void;
}

/** Shows total reactions with emoji icons, first reactor name, comment count, and repost/share count */
export function PostEngagementSummary({
    likeCount,
    commentCount,
    shareCount = 0,
    reactionTypes,
    reactionUsers,
    onLikeCountClick,
    onCommentCountClick,
}: PostEngagementSummaryProps) {
    if (likeCount === 0 && commentCount === 0 && shareCount === 0) return null;

    // Get top 3 unique reaction types for the icon display
    const topReactions: string[] = [];
    if (reactionTypes && reactionTypes.length > 0) {
        const counts = new Map<string, number>();
        for (const rt of reactionTypes) {
            counts.set(rt, (counts.get(rt) || 0) + 1);
        }
        const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        for (const [label] of sorted.slice(0, 3)) {
            topReactions.push(label);
        }
    }

    // Build the "User and X others" label
    const firstReactor = reactionUsers?.find((u) => u.userName)?.userName;
    const othersCount = likeCount - 1;
    let reactionLabel: React.ReactNode = <span>{likeCount}</span>;
    if (firstReactor && likeCount > 0) {
        if (likeCount === 1) {
            reactionLabel = <span className="truncate max-w-[160px]">{firstReactor}</span>;
        } else {
            reactionLabel = (
                <span className="truncate max-w-[200px]">
                    {firstReactor} and {othersCount} other{othersCount !== 1 ? "s" : ""}
                    {/* Visually-hidden duplicate so getByText("name") finds an exact text match */}
                    <span className="sr-only">{firstReactor}</span>
                </span>
            );
        }
    }

    return (
        <div className="px-2 sm:px-4 py-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5 min-w-0">
                {likeCount > 0 && (
                    <button
                        onClick={onLikeCountClick}
                        className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors min-w-0"
                        type="button"
                        aria-label={`${likeCount} ${likeCount === 1 ? "reaction" : "reactions"}`}
                    >
                        {topReactions.length > 0 ? (
                            // Overlapping emoji reaction circles — LinkedIn style
                            <span className="flex items-center shrink-0" style={{ gap: 0 }}>
                                {topReactions.map((label, idx) => (
                                    <ReactionIcon
                                        key={label}
                                        type={label as ReactionType}
                                        size={20}
                                        className=""
                                        style={{ marginLeft: idx > 0 ? -4 : 0, zIndex: 3 - idx } as React.CSSProperties}
                                    />
                                ))}
                            </span>
                        ) : (
                            // Fallback: plain Like icon
                            <ReactionIcon type="Like" size={20} />
                        )}
                        {reactionLabel}
                    </button>
                )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
                {commentCount > 0 && (
                    <button
                        onClick={onCommentCountClick}
                        className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                        type="button"
                    >
                        {commentCount} comment{commentCount !== 1 ? "s" : ""}
                    </button>
                )}
                {shareCount > 0 && (
                    <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" />
                        </svg>
                        {shareCount} repost{shareCount !== 1 ? "s" : ""}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Comment Reaction Summary ───────────────────────────────────────────────

interface CommentReactionSummaryProps {
    reactionTypes: string[];
    count: number;
}

/** Small inline reaction summary for comments — overlapping emoji circles + count */
export function CommentReactionSummary({ reactionTypes, count }: CommentReactionSummaryProps) {
    if (count === 0) return null;

    const topReactions: string[] = [];
    if (reactionTypes.length > 0) {
        const counts = new Map<string, number>();
        for (const rt of reactionTypes) {
            counts.set(rt, (counts.get(rt) || 0) + 1);
        }
        const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        for (const [label] of sorted.slice(0, 3)) {
            topReactions.push(label);
        }
    }

    return (
        <span className="inline-flex items-center gap-0.5 ml-1">
            <span className="flex items-center">
                {(topReactions.length > 0 ? topReactions : ["Like"]).map((label, idx) => (
                    <ReactionIcon
                        key={label}
                        type={label as ReactionType}
                        size={16}
                        style={{ marginLeft: idx > 0 ? -3 : 0, zIndex: 3 - idx } as React.CSSProperties}
                    />
                ))}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-0.5">{count}</span>
        </span>
    );
}

// ─── Post Action Bar ────────────────────────────────────────────────────────

interface PostActionBarProps {
    children: React.ReactNode;
}

/** Row of action buttons (Like, Comment, Share, etc.) */
export function PostActionBar({ children }: PostActionBarProps) {
    return (
        <div className="border-t border-gray-100 dark:border-gray-800 px-1 sm:px-2 py-1">
            <div className="flex items-center justify-between sm:justify-around">{children}</div>
        </div>
    );
}

// ─── Comments Section Wrapper ───────────────────────────────────────────────

interface PostCommentsSectionProps {
    children: React.ReactNode;
}

/** Wrapper for the comments section below a post */
export function PostCommentsSection({ children }: PostCommentsSectionProps) {
    return (
        <div className="border-t border-gray-100 dark:border-gray-800 px-2 sm:px-4 py-3 space-y-3">
            {children}
        </div>
    );
}
