"use client";

import React from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ReplyIcon,
    PencilIcon,
    TrashIcon,
    FlagIcon,
    SmileIcon,
    SendIcon,
    ThumbsUpIcon,
    XIcon,
} from "lucide-react";
import {
    CommentReactionSummary,
    getInitials,
    formatRelativeDate,
    renderPostContent,
    REACTIONS,
    getReactionEmoji,
} from "@/components/post-card";
import { createReport } from "@/app/actions/admin";
import { searchUsers } from "@/app/actions/feed";
import { cn } from "@/lib/utils";

/* Lazy: the emoji grid is small but only needed when the popover opens. */
const EmojiPicker = dynamic(() => import("./emoji-picker"), {
    ssr: false,
    loading: () => (
        <div className="h-32 w-56 animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />
    ),
});

export interface CommentLikeData {
    userId: string;
    isDislike: boolean;
    reactionType: string;
}

export interface CommentUser {
    id: string;
    name: string | null;
    image: string | null;
    role?: string | null;
    profession?: string | null;
    professionTitle?: string | null;
}

export interface CommentData {
    id: string;
    content: string;
    createdAt: string;
    user: CommentUser;
    _count?: { commentLikes: number; replies?: number };
    commentLikes?: CommentLikeData[];
    replies?: CommentData[];
}

interface CommentThreadProps {
    postId: string;
    postAuthorId: string;
    commentsEnabled: boolean;
    comments: CommentData[];
    currentUser: {
        id: string;
        name: string | null;
        image: string | null;
        gender: string | null;
    };
    isAdmin: boolean;
    onSubmit: (postId: string, content: string, parentId?: string) => Promise<void>;
    onEdit: (postId: string, commentId: string, content: string) => Promise<void>;
    onDelete: (postId: string, commentId: string) => Promise<void>;
    onLike: (
        postId: string,
        commentId: string,
        isDislike: boolean,
        reactionType: string,
    ) => Promise<void>;
}

const COMMENT_COLLAPSE_THRESHOLD = 200;
const INITIAL_COMMENTS = 3;
const MENTION_SEARCH_DEBOUNCE_MS = 200;

function CommentTextWithSeeMore({
                                    content,
                                    threshold,
                                    isReply = false,
                                }: {
    content: string;
    threshold: number;
    isReply?: boolean;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const isLong = content.length > threshold;
    const displayText = isLong && !expanded ? content.slice(0, threshold) + "…" : content;

    return (
        <div
            className={`${
                isReply ? "text-xs" : "text-sm"
            } text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed whitespace-pre-wrap`}
        >
            {renderPostContent(displayText)}
            {isLong && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="notranslate ml-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    translate="no"
                >
                    {expanded ? "See less" : "See more"}
                </button>
            )}
        </div>
    );
}

export default function CommentThread({
                                          postId,
                                          postAuthorId,
                                          commentsEnabled,
                                          comments,
                                          currentUser,
                                          isAdmin,
                                          onSubmit,
                                          onEdit,
                                          onDelete,
                                          onLike,
                                      }: CommentThreadProps) {
    const [commentText, setCommentText] = React.useState("");
    const [replyingTo, setReplyingTo] = React.useState<{ id: string; name: string } | null>(null);
    const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
    const [editingContent, setEditingContent] = React.useState("");
    const [visibleCount, setVisibleCount] = React.useState(INITIAL_COMMENTS);
    const [reactionHoverId, setReactionHoverId] = React.useState<string | null>(null);
    const reactionTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [emojiOpen, setEmojiOpen] = React.useState(false);

    const [reportingCommentId, setReportingCommentId] = React.useState<string | null>(null);
    const [reportCategory, setReportCategory] = React.useState("");
    const [reportDetails, setReportDetails] = React.useState("");

    /* ---- Mention search state (restored from the original feed-client) ---- */
    const [mentionResults, setMentionResults] = React.useState<
        { id: string; name: string | null; image: string | null }[]
    >([]);
    const [showMentionDropdown, setShowMentionDropdown] = React.useState(false);
    const mentionSearchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        const current = reactionTimeoutRef.current;
        const mention = mentionSearchTimeout.current;
        return () => {
            if (current) clearTimeout(current);
            if (mention) clearTimeout(mention);
        };
    }, []);

    const handleReactionEnter = (commentId: string) => {
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        setReactionHoverId(commentId);
    };

    const handleReactionLeave = () => {
        reactionTimeoutRef.current = setTimeout(() => setReactionHoverId(null), 300);
    };

    const handleCommentReaction = (commentId: string, reaction: string) => {
        setReactionHoverId(null);
        void onLike(postId, commentId, false, reaction);
    };

    /**
     * Fires on every keystroke of the comment input. Detects the last `@`
     * occurrence and, when the user is still typing that token, schedules a
     * debounced `searchUsers` call.
     *
     * The dropdown only stays open while the token after `@` contains no
     * whitespace and no additional `@`. As soon as the user types a space —
     * including the trailing space the Reply button pre-fills — the mention
     * is considered complete and the dropdown closes. This is what allows
     * `Enter` to submit the reply instead of being swallowed by the open
     * dropdown guard on the input's `onKeyDown`.
     */
    const handleMentionSearch = (text: string) => {
        const lastAtIndex = text.lastIndexOf("@");
        if (lastAtIndex === -1) {
            setShowMentionDropdown(false);
            setMentionResults([]);
            return;
        }
        const afterAt = text.slice(lastAtIndex + 1);
        if (/[\s@]/.test(afterAt)) {
            setShowMentionDropdown(false);
            setMentionResults([]);
            return;
        }
        setShowMentionDropdown(true);
        if (mentionSearchTimeout.current) clearTimeout(mentionSearchTimeout.current);
        mentionSearchTimeout.current = setTimeout(async () => {
            const results = await searchUsers(afterAt);
            setMentionResults(results);
        }, MENTION_SEARCH_DEBOUNCE_MS);
    };

    /** Replaces the trailing `@partial` with `@FullName ` and closes the dropdown. */
    const insertMention = (name: string) => {
        const lastAtIndex = commentText.lastIndexOf("@");
        if (lastAtIndex !== -1) {
            setCommentText(commentText.slice(0, lastAtIndex) + `@${name} `);
        }
        setShowMentionDropdown(false);
        setMentionResults([]);
    };

    const handleSubmit = async () => {
        const text = commentText.trim();
        if (!text) return;
        await onSubmit(postId, text, replyingTo?.id);
        setCommentText("");
        setReplyingTo(null);
        setShowMentionDropdown(false);
        setMentionResults([]);
    };

    const handleEdit = async (commentId: string) => {
        if (!editingContent.trim()) return;
        await onEdit(postId, commentId, editingContent);
        setEditingCommentId(null);
        setEditingContent("");
    };

    const submitReport = async () => {
        if (!reportingCommentId || !reportCategory) return;
        const fullReason =
            reportCategory + (reportDetails.trim() ? `: ${reportDetails.trim()}` : "");
        try {
            await createReport({
                contentType: "COMMENT",
                contentId: reportingCommentId,
                reason: fullReason,
            });
            toast.success("Comment reported successfully");
            setReportingCommentId(null);
            setReportCategory("");
            setReportDetails("");
        } catch {
            toast.error("Failed to report comment");
        }
    };

    if (commentsEnabled === false) return null;

    const visibleItems = comments.slice(0, visibleCount);
    const hasMore = comments.length > visibleCount;

    return (
        <>
            {visibleItems.map((comment) => {
                const commentInitials = getInitials(comment.user.name);
                const isCommentAuthor = comment.user.id === currentUser.id;
                const isPostAuthor = comment.user.id === postAuthorId;
                const isCommentAdmin =
                    comment.user.role === "admin" || comment.user.role === "superadmin";
                const commentLikes = (comment.commentLikes || []).filter((l) => !l.isDislike);
                const userCommentReaction = (comment.commentLikes || []).find(
                    (l) => l.userId === currentUser.id && !l.isDislike,
                );
                const userLiked = !!userCommentReaction;
                const userReactionEmoji = userCommentReaction
                    ? getReactionEmoji(userCommentReaction.reactionType)
                    : null;

                return (
                    <div key={comment.id} className="space-y-1">
                        <div className="flex gap-2">
                            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                                <AvatarImage src={comment.user.image ?? undefined} />
                                <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 font-medium">
                                    {commentInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="relative bg-gray-50 dark:bg-gray-900 rounded-xl px-2.5 py-1.5 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {comment.user.name || "Anonymous"}
                                        </p>
                                        {comment.user.profession && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                · {comment.user.profession}
                                            </span>
                                        )}
                                        {isPostAuthor && (
                                            <Badge className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 leading-4">
                                                Author
                                            </Badge>
                                        )}
                                        {isCommentAdmin && (
                                            <Badge className="text-xs px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 leading-4">
                                                Admin
                                            </Badge>
                                        )}
                                        <p className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                                            {formatRelativeDate(comment.createdAt)}
                                        </p>
                                    </div>
                                    {editingCommentId === comment.id ? (
                                        <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2">
                                            <input
                                                type="text"
                                                value={editingContent}
                                                onChange={(e) => setEditingContent(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") void handleEdit(comment.id);
                                                    if (e.key === "Escape") {
                                                        setEditingCommentId(null);
                                                        setEditingContent("");
                                                    }
                                                }}
                                                className="flex-1 text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                autoFocus
                                            />
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="text-gray-400 hover:text-yellow-500 transition-colors p-1"
                                                    >
                                                        <SmileIcon className="h-4 w-4" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-2" align="end">
                                                    <EmojiPicker
                                                        onSelect={(emoji) =>
                                                            setEditingContent((prev) => prev + emoji)
                                                        }
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => void handleEdit(comment.id)}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => {
                                                    setEditingCommentId(null);
                                                    setEditingContent("");
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <CommentTextWithSeeMore
                                            content={comment.content}
                                            threshold={COMMENT_COLLAPSE_THRESHOLD}
                                        />
                                    )}
                                    {commentLikes.length > 0 && (
                                        <span className="absolute -bottom-2.5 right-2 flex items-center gap-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-full px-1.5 py-0.5 shadow-sm">
                                            <CommentReactionSummary
                                                reactionTypes={commentLikes.map((l) => l.reactionType)}
                                                count={commentLikes.length}
                                            />
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 sm:gap-2.5 mt-0.5 px-1 flex-wrap">
                                    <div
                                        className="relative"
                                        onMouseEnter={() => handleReactionEnter(comment.id)}
                                        onMouseLeave={handleReactionLeave}
                                    >
                                        {reactionHoverId === comment.id && (
                                            <div
                                                className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-full shadow-xl px-2 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                                                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                                                onMouseEnter={() => handleReactionEnter(comment.id)}
                                                onMouseLeave={handleReactionLeave}
                                            >
                                                {REACTIONS.map((reaction) => (
                                                    <button
                                                        key={reaction.label}
                                                        onClick={() =>
                                                            handleCommentReaction(comment.id, reaction.label)
                                                        }
                                                        className="group relative flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 hover:scale-[1.35] hover:-translate-y-1 cursor-pointer"
                                                        title={reaction.label}
                                                    >
                                                        <span className="text-lg drop-shadow-sm">
                                                            {getReactionEmoji(reaction.label)}
                                                        </span>
                                                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
                                                            {reaction.label}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <button
                                            onClick={() =>
                                                void onLike(
                                                    postId,
                                                    comment.id,
                                                    false,
                                                    userCommentReaction?.reactionType || "Like",
                                                )
                                            }
                                            className={cn(
                                                "flex items-center gap-1 text-xs font-medium transition-colors",
                                                userLiked ? "text-blue-600" : "text-gray-500 hover:text-blue-600",
                                            )}
                                        >
                                            {userLiked && userReactionEmoji ? (
                                                <span className="text-sm leading-none">{userReactionEmoji}</span>
                                            ) : (
                                                <ThumbsUpIcon className={cn("h-3 w-3", userLiked && "fill-current")} />
                                            )}
                                            {userLiked && userCommentReaction
                                                ? userCommentReaction.reactionType
                                                : "Like"}
                                            {commentLikes.length > 0 && (
                                                <span className="ml-0.5">· {commentLikes.length}</span>
                                            )}
                                        </button>
                                    </div>
                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                    <button
                                        onClick={() => {
                                            const userName = comment.user.name || "Anonymous";
                                            setReplyingTo({ id: comment.id, name: userName });
                                            setCommentText(`@${userName.replace(/\s+/g, "")} `);
                                        }}
                                        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
                                    >
                                        <ReplyIcon className="h-3 w-3" />
                                        Reply
                                        {comment.replies && comment.replies.length > 0
                                            ? ` · ${comment.replies.length}`
                                            : ""}
                                    </button>
                                    {isCommentAuthor && (
                                        <>
                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                            <button
                                                onClick={() => {
                                                    setEditingCommentId(comment.id);
                                                    setEditingContent(comment.content);
                                                }}
                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors"
                                            >
                                                <PencilIcon className="h-3 w-3" />
                                                Edit
                                            </button>
                                        </>
                                    )}
                                    {(isCommentAuthor || isAdmin) && (
                                        <>
                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                            <button
                                                onClick={() => void onDelete(postId, comment.id)}
                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
                                            >
                                                <TrashIcon className="h-3 w-3" />
                                                Delete
                                            </button>
                                        </>
                                    )}
                                    {!isCommentAuthor && (
                                        <>
                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                            <button
                                                onClick={() => setReportingCommentId(comment.id)}
                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition-colors"
                                            >
                                                <FlagIcon className="h-3 w-3" />
                                                Report
                                            </button>
                                        </>
                                    )}
                                </div>

                                {(comment.replies || []).length > 0 && (
                                    <div className="relative mt-1.5 ml-2 pl-3.5 border-l-2 border-gray-200 dark:border-gray-700">
                                        {(comment.replies || []).map((reply) => {
                                            const replyInitials = getInitials(reply.user.name);
                                            const isReplyAuthor = reply.user.id === currentUser.id;
                                            const isReplyPostAuthor = reply.user.id === postAuthorId;
                                            const isReplyAdmin =
                                                reply.user.role === "admin" || reply.user.role === "superadmin";
                                            const rLikes = (reply.commentLikes || []).filter((l) => !l.isDislike);
                                            const rUserReaction = (reply.commentLikes || []).find(
                                                (l) => l.userId === currentUser.id && !l.isDislike,
                                            );
                                            const rUserLiked = !!rUserReaction;
                                            const rUserReactionEmoji = rUserReaction
                                                ? getReactionEmoji(rUserReaction.reactionType)
                                                : null;

                                            return (
                                                <div key={reply.id} className="flex gap-2 mb-1.5">
                                                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                                                        <AvatarImage src={reply.user.image ?? undefined} />
                                                        <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 font-medium">
                                                            {replyInitials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg px-2.5 py-1.5 border border-gray-100 dark:border-gray-800">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                    {reply.user.name || "Anonymous"}
                                                                </p>
                                                                {reply.user.profession && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                        · {reply.user.profession}
                                                                    </span>
                                                                )}
                                                                {isReplyPostAuthor && (
                                                                    <Badge className="text-xs px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 leading-3">
                                                                        Author
                                                                    </Badge>
                                                                )}
                                                                {isReplyAdmin && (
                                                                    <Badge className="text-xs px-1 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 leading-3">
                                                                        Admin
                                                                    </Badge>
                                                                )}
                                                                <span className="text-xs text-gray-400 ml-auto">
                                                                    {formatRelativeDate(reply.createdAt)}
                                                                </span>
                                                            </div>
                                                            {editingCommentId === reply.id ? (
                                                                <div className="mt-1 flex gap-1">
                                                                    <input
                                                                        type="text"
                                                                        value={editingContent}
                                                                        onChange={(e) => setEditingContent(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") void handleEdit(reply.id);
                                                                            if (e.key === "Escape") {
                                                                                setEditingCommentId(null);
                                                                                setEditingContent("");
                                                                            }
                                                                        }}
                                                                        className="flex-1 text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        autoFocus
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-6 px-1.5 text-xs"
                                                                        onClick={() => void handleEdit(reply.id)}
                                                                    >
                                                                        Save
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <CommentTextWithSeeMore
                                                                    content={reply.content}
                                                                    threshold={COMMENT_COLLAPSE_THRESHOLD}
                                                                    isReply
                                                                />
                                                            )}
                                                            {rLikes.length > 0 && (
                                                                <span className="absolute -bottom-2 right-2 flex items-center gap-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-full px-1 py-0.5 shadow-sm">
                                                                    <CommentReactionSummary
                                                                        reactionTypes={rLikes.map((l) => l.reactionType)}
                                                                        count={rLikes.length}
                                                                    />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 px-1">
                                                            <div
                                                                className="relative"
                                                                onMouseEnter={() => handleReactionEnter(reply.id)}
                                                                onMouseLeave={handleReactionLeave}
                                                            >
                                                                {reactionHoverId === reply.id && (
                                                                    <div
                                                                        className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-full shadow-xl px-2 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                                                                        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                                                                        onMouseEnter={() => handleReactionEnter(reply.id)}
                                                                        onMouseLeave={handleReactionLeave}
                                                                    >
                                                                        {REACTIONS.map((reaction) => (
                                                                            <button
                                                                                key={reaction.label}
                                                                                onClick={() =>
                                                                                    handleCommentReaction(reply.id, reaction.label)
                                                                                }
                                                                                className="group relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 hover:scale-[1.35] hover:-translate-y-1 cursor-pointer"
                                                                                title={reaction.label}
                                                                            >
                                                                                <span className="text-base drop-shadow-sm">
                                                                                    {getReactionEmoji(reaction.label)}
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <button
                                                                    onClick={() =>
                                                                        void onLike(
                                                                            postId,
                                                                            reply.id,
                                                                            false,
                                                                            rUserReaction?.reactionType || "Like",
                                                                        )
                                                                    }
                                                                    className={cn(
                                                                        "flex items-center gap-0.5 text-xs font-medium",
                                                                        rUserLiked ? "text-blue-600" : "text-gray-500 hover:text-blue-600",
                                                                    )}
                                                                >
                                                                    {rUserLiked && rUserReactionEmoji ? (
                                                                        <span className="text-sm leading-none">{rUserReactionEmoji}</span>
                                                                    ) : (
                                                                        <ThumbsUpIcon className={cn("h-2.5 w-2.5", rUserLiked && "fill-current")} />
                                                                    )}
                                                                    {rUserLiked && rUserReaction
                                                                        ? rUserReaction.reactionType
                                                                        : "Like"}
                                                                    {rLikes.length > 0 && (
                                                                        <span className="ml-0.5">· {rLikes.length}</span>
                                                                    )}
                                                                </button>
                                                            </div>
                                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                                            <button
                                                                onClick={() => {
                                                                    const replyUserName = reply.user.name || "Anonymous";
                                                                    setReplyingTo({ id: comment.id, name: replyUserName });
                                                                    setCommentText(`@${replyUserName.replace(/\s+/g, "")} `);
                                                                }}
                                                                className="flex items-center gap-0.5 text-xs font-medium text-gray-500 hover:text-blue-600"
                                                            >
                                                                <ReplyIcon className="h-2.5 w-2.5" />
                                                                Reply
                                                            </button>
                                                            {isReplyAuthor && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingCommentId(reply.id);
                                                                            setEditingContent(reply.content);
                                                                        }}
                                                                        className="text-xs text-gray-500 hover:text-green-600"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                </>
                                                            )}
                                                            {(isReplyAuthor || isAdmin) && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                                                    <button
                                                                        onClick={() => void onDelete(postId, reply.id)}
                                                                        className="text-xs text-gray-500 hover:text-red-600"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </>
                                                            )}
                                                            {!isReplyAuthor && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                                                    <button
                                                                        onClick={() => setReportingCommentId(reply.id)}
                                                                        className="text-xs text-gray-500 hover:text-orange-600"
                                                                    >
                                                                        Report
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {hasMore && (
                <button
                    onClick={() => setVisibleCount((c) => c + 5)}
                    className="notranslate text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    translate="no"
                >
                    Load more comments ({comments.length - visibleCount} remaining)
                </button>
            )}

            {replyingTo && (
                <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                    <ReplyIcon className="h-3 w-3" />
                    Replying to <strong>{replyingTo.name}</strong>
                    <button
                        onClick={() => setReplyingTo(null)}
                        className="ml-auto text-gray-400 hover:text-gray-600"
                    >
                        <XIcon className="h-3 w-3" />
                    </button>
                </div>
            )}

            <div className="flex gap-2 pt-0.5">
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={currentUser.image ?? undefined} />
                    <AvatarFallback className="text-xs font-medium bg-blue-700 text-white">
                        {getInitials(currentUser.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                    <div className="flex items-center gap-1">
                        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    className="h-9 w-9 flex items-center justify-center rounded-full text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950 transition-colors shrink-0"
                                    title="Add emoji"
                                >
                                    <SmileIcon className="h-4 w-4" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2" side="top">
                                <EmojiPicker
                                    onSelect={(emoji) => {
                                        setCommentText((prev) => prev + emoji);
                                        setEmojiOpen(false);
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                        <input
                            type="text"
                            placeholder={
                                replyingTo
                                    ? `Reply to ${replyingTo.name}...`
                                    : "Write a comment... (use @ to mention)"
                            }
                            value={commentText}
                            onChange={(e) => {
                                const next = e.target.value;
                                setCommentText(next);
                                handleMentionSearch(next);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !showMentionDropdown) {
                                    void handleSubmit();
                                }
                            }}
                            className="flex-1 h-9 px-4 text-base rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => void handleSubmit()}
                            className="h-9 w-9 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 shrink-0"
                            disabled={!commentText.trim()}
                        >
                            <SendIcon className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Mention dropdown — positioned above the input row */}
                    {showMentionDropdown && mentionResults.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 bottom-full mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {mentionResults.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => insertMention(user.name || "User")}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                >
                                    <Avatar className="h-6 w-6 shrink-0">
                                        <AvatarImage src={user.image ?? undefined} />
                                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                            {(user.name || "U")[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {user.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Dialog
                open={reportingCommentId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setReportingCommentId(null);
                        setReportCategory("");
                        setReportDetails("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Report Comment</DialogTitle>
                        <DialogDescription>
                            Select a reason for reporting this comment.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Select value={reportCategory} onValueChange={setReportCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a reason..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Spam">Spam</SelectItem>
                                <SelectItem value="Harassment or Bullying">
                                    Harassment or Bullying
                                </SelectItem>
                                <SelectItem value="Hate Speech">Hate Speech</SelectItem>
                                <SelectItem value="Misinformation">Misinformation</SelectItem>
                                <SelectItem value="Inappropriate Content">
                                    Inappropriate Content
                                </SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Textarea
                            placeholder="Additional details (optional)..."
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                            className="min-h-[80px] resize-none"
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setReportingCommentId(null);
                                    setReportCategory("");
                                    setReportDetails("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={submitReport}
                                disabled={!reportCategory}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Submit Report
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}