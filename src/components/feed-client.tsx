"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const VERCEL_BLOB_HOSTNAME = "public.blob.vercel-storage.com";

async function deleteBlobUrl(url: string) {
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith(VERCEL_BLOB_HOSTNAME)) return;
        await fetch("/api/delete-blob", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
    } catch {
        // Best-effort deletion; do not surface errors to the user
    }
}

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    MessageCircleIcon,
    MessageCircleOffIcon,
    SendIcon,
    TrashIcon,
    PenIcon,
    ImageIcon,
    VideoIcon,
    ThumbsUpIcon,
    ShareIcon,
    FlagIcon,
    XIcon,
    SmileIcon,
    ReplyIcon,
    PencilIcon,
    Loader2,
    LinkIcon,
    UsersIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { createPost, toggleLike, addComment, deletePost, getPostComments, toggleCommentLike, editComment, deleteComment, searchUsers, getAllUsers, getPostLikers, updatePost, togglePostComments } from "@/app/actions/feed";
import { createReport } from "@/app/actions/admin";
import ImageUpload from "@/components/image-upload";
import { CTA_LINK_TYPES, DEFAULT_LINK_TYPE } from "@/components/cta-link-button";
import LinkPreviewCard from "@/components/link-preview-card";
import {
    PostCard,
    PostContextBar,
    PostHeader,
    PostTextContent,
    PostTags,
    PostMediaContent,
    PostEngagementSummary,
    PostActionBar,
    PostCommentsSection,
    CommentReactionSummary,
    getInitials,
    formatRelativeDate,
    formatFullDate,
    renderPostContent,
    REACTIONS,
    getReactionEmoji,
    getReactionBg,
    postHasMedia,
} from "@/components/post-card";
import { ReactionsPicker } from "@/components/reactions-picker";

interface PostUser {
    id: string;
    name: string | null;
    image: string | null;
    role?: string | null;
    profession?: string | null;
}

interface CommentLikeData {
    userId: string;
    isDislike: boolean;
    reactionType: string;
}

interface CommentData {
    id: string;
    content: string;
    createdAt: Date;
    user: PostUser;
    _count?: { commentLikes: number; replies?: number };
    commentLikes?: CommentLikeData[];
    replies?: CommentData[];
}

interface PostData {
    id: string;
    content: string;
    image: string | null;
    video: string | null;
    images: string[];
    videos: string[];
    tags: string[];
    linkUrl: string | null;
    linkType: string | null;
    commentsEnabled?: boolean;
    createdAt: Date;
    user: PostUser;
    _count: { comments: number; likes: number };
    likes: { userId: string; reactionType: string; userName?: string | null }[];
    recentActivity?: {
        users: { id: string; name: string | null; image: string | null }[];
        likeCount: number;
        commentCount: number;
    };
}

interface FeedClientProps {
    initialPosts: PostData[];
    currentUserId: string;
    currentUserName?: string | null;
    currentUserImage?: string | null;
    isAdmin: boolean;
}

const EMOJI_LIST = [
    "😀", "😂", "😍", "🤔", "👍", "👎", "🎉", "🔥",
    "❤️", "💯", "🙏", "👏", "🤝", "💪", "✅", "⭐",
    "🚀", "💡", "📌", "🎯", "👀", "✨", "⚡", "🌟",

    // Faces & emotions
    "😁", "😅", "🤣", "😊", "😎", "😢", "😭", "😡",
    "😱", "🥶", "🥵", "😴", "🤯", "🥳", "😇", "🤗",

    // Gestures & people
    "👋", "👌", "✌️", "🤟", "🙌", "🤲", "🫶", "🙏",
    "💃", "🕺", "👨‍💻", "👩‍💻", "🧠", "🫡",

    // Love & reactions
    "💖", "💘", "💔", "❣️", "💕", "💞", "💓",

    // Objects & symbols
    "📢", "📣", "📷", "🎥", "🎵", "🎶", "🛠️", "⚙️",
    "🔒", "🔑", "💻", "📱", "🖥️", "🧾", "📊", "📈",

    // Nature & misc
    "🌍", "🌈", "☀️", "🌙", "⭐", "🌊", "🌴", "🍀",
    "🌸", "🌺", "🌻",

    // Food & fun
    "🍕", "🍔", "🍟", "🍿", "🍩", "🍎", "🍉", "🍻",
    "☕", "🍷",

    // Extra symbols
    "❗", "❓", "⭕", "❌", "✔️", "➕", "➖", "➰"
];

const MENTION_SEARCH_DEBOUNCE_MS = 200;

/** Collapsible comment text with "See more" for long comments */
function CommentTextWithSeeMore({ content, threshold, isReply = false }: { content: string; threshold: number; isReply?: boolean }) {
    const [expanded, setExpanded] = React.useState(false);
    const isLong = content.length > threshold;
    const displayText = isLong && !expanded ? content.slice(0, threshold) + "…" : content;

    return (
        <div className={`${isReply ? "text-xs" : "text-sm"} text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed whitespace-pre-wrap`}>
            {renderPostContent(displayText)}
            {isLong && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                    {expanded ? "See less" : "See more"}
                </button>
            )}
        </div>
    );
}

function VideoUploadInput({ onUpload }: { onUpload: (url: string) => void }) {
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("video/")) {
            toast.error("Please select a video file");
            return;
        }

        if (file.size > 200 * 1024 * 1024) {
            toast.error("Video must be less than 200MB");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                let errorMessage = "Upload failed";
                try {
                    const data = await res.json();
                    errorMessage = data.error || errorMessage;
                } catch {
                    if (res.status === 413) {
                        errorMessage = "Video file is too large for the server. Please try a smaller file.";
                    }
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();
            if (data.url) {
                onUpload(data.url);
            }
        } catch (err) {
            console.error("Video upload error:", err);
            toast.error(err instanceof Error ? err.message : "Video upload failed");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div>
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer p-6 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Uploading video...</span>
                    </>
                ) : (
                    <>
                        <VideoIcon className="h-8 w-8 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Drop or click to upload a video</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">Videos up to 200MB</span>
                    </>
                )}
            </button>
        </div>
    );
}

export default function FeedClient({
    initialPosts,
    currentUserId,
    currentUserName,
    currentUserImage,
    isAdmin,
}: FeedClientProps) {
    const router = useRouter();
    const [posts, setPosts] = React.useState(initialPosts);
    const [newPostContent, setNewPostContent] = React.useState("");
    const [newPostImage, setNewPostImage] = React.useState<string | null>(null);
    const [newPostVideo, setNewPostVideo] = React.useState<string | null>(null);
    const [newPostImages, setNewPostImages] = React.useState<string[]>([]);
    const [newPostVideos, setNewPostVideos] = React.useState<string[]>([]);
    const [newPostTags, setNewPostTags] = React.useState<string[]>([]);
    const [tagInput, setTagInput] = React.useState("");
    const [showImageUpload, setShowImageUpload] = React.useState(false);
    const [showVideoUpload, setShowVideoUpload] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [expandedComments, setExpandedComments] = React.useState<Set<string>>(new Set());
    const [commentTexts, setCommentTexts] = React.useState<Record<string, string>>({});
    const [postComments, setPostComments] = React.useState<Record<string, CommentData[]>>({});
    const [reportingPostId, setReportingPostId] = React.useState<string | null>(null);
    const [reportReason, setReportReason] = React.useState("");
    const [reportCategory, setReportCategory] = React.useState("");
    const [replyingTo, setReplyingTo] = React.useState<Record<string, { id: string; name: string } | null>>({});
    const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
    const [editingCommentContent, setEditingCommentContent] = React.useState("");
    const [reportingCommentId, setReportingCommentId] = React.useState<string | null>(null);
    const [commentReportCategory, setCommentReportCategory] = React.useState("");
    const [commentReportDetails, setCommentReportDetails] = React.useState("");
    const [showCommentEmoji, setShowCommentEmoji] = React.useState<string | null>(null);
    const [newPostLinkUrl, setNewPostLinkUrl] = React.useState<string>("");
    const [newPostLinkType, setNewPostLinkType] = React.useState<string>(DEFAULT_LINK_TYPE);
    const [showLinkInput, setShowLinkInput] = React.useState(false);
    const [visibleCommentCount, setVisibleCommentCount] = React.useState<Record<string, number>>({});
    const [editingPostId, setEditingPostId] = React.useState<string | null>(null);
    const [editingPostContent, setEditingPostContent] = React.useState("");
    const [editingPostImages, setEditingPostImages] = React.useState<string[]>([]);
    const [editingPostVideos, setEditingPostVideos] = React.useState<string[]>([]);
    const [editingPostTags, setEditingPostTags] = React.useState<string[]>([]);
    const [editingPostTagInput, setEditingPostTagInput] = React.useState("");
    const [editingPostLinkUrl, setEditingPostLinkUrl] = React.useState("");
    const [editingPostLinkType, setEditingPostLinkType] = React.useState<string>(DEFAULT_LINK_TYPE);
    const [editingShowImageUpload, setEditingShowImageUpload] = React.useState(false);
    const [editingShowVideoUpload, setEditingShowVideoUpload] = React.useState(false);
    const [editingShowLinkInput, setEditingShowLinkInput] = React.useState(false);

    // @mention autocomplete state
    const [mentionResults, setMentionResults] = React.useState<{ id: string; name: string | null; image: string | null }[]>([]);
    const [showMentionDropdown, setShowMentionDropdown] = React.useState<string | null>(null); // postId or "new-post"
    const mentionSearchTimeout = React.useRef<NodeJS.Timeout | null>(null);

    // Likers dialog state
    const [likersPostId, setLikersPostId] = React.useState<string | null>(null);
    const [likersList, setLikersList] = React.useState<{ id: string; name: string | null; image: string | null; reactionType: string }[]>([]);
    const [loadingLikers, setLoadingLikers] = React.useState(false);

    // Image modal state
    const [imageModalOpen, setImageModalOpen] = React.useState(false);
    const [imageModalPost, setImageModalPost] = React.useState<PostData | null>(null);
    const [imageModalIndex, setImageModalIndex] = React.useState(0);

    // Reaction popup state (handled by ReactionsPicker component)
    const reactionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Clean up reaction timeout on unmount
    React.useEffect(() => {
        return () => {
            if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        };
    }, []);

    // Share counts (tracked in localStorage for persistence)
    const [shareCounts, setShareCounts] = React.useState<Record<string, number>>(() => {
        if (typeof window === "undefined") return {};
        try {
            const stored = localStorage.getItem("feed-share-counts");
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    React.useEffect(() => {
        try {
            localStorage.setItem("feed-share-counts", JSON.stringify(shareCounts));
        } catch {
            // localStorage may be unavailable
        }
    }, [shareCounts]);

    const currentUserInitials = getInitials(currentUserName);

    const handleMentionSearch = (text: string, source: string) => {
        // Check if user is typing @mention
        const lastAtIndex = text.lastIndexOf("@");
        if (lastAtIndex === -1) {
            setShowMentionDropdown(null);
            setMentionResults([]);
            return;
        }
        const afterAt = text.slice(lastAtIndex + 1);
        // Only search if we're at the end of text and there's no newline after query start
        const hasNewline = afterAt.includes("\n");
        if (hasNewline) {
            setShowMentionDropdown(null);
            setMentionResults([]);
            return;
        }
        setShowMentionDropdown(source);
        if (mentionSearchTimeout.current) clearTimeout(mentionSearchTimeout.current);
        mentionSearchTimeout.current = setTimeout(async () => {
            const results = await searchUsers(afterAt);
            setMentionResults(results);
        }, MENTION_SEARCH_DEBOUNCE_MS);
    };

    const insertMention = (name: string, source: string) => {
        if (source === "new-post") {
            const lastAtIndex = newPostContent.lastIndexOf("@");
            if (lastAtIndex !== -1) {
                setNewPostContent(newPostContent.slice(0, lastAtIndex) + `@${name} `);
            }
        } else {
            // It's a comment input
            const text = commentTexts[source] || "";
            const lastAtIndex = text.lastIndexOf("@");
            if (lastAtIndex !== -1) {
                setCommentTexts((prev) => ({
                    ...prev,
                    [source]: text.slice(0, lastAtIndex) + `@${name} `,
                }));
            }
        }
        setShowMentionDropdown(null);
        setMentionResults([]);
    };

    const handleMentionAll = async (source: string) => {
        try {
            const allUsers = await getAllUsers();
            const mentionText = allUsers
                .filter((u) => u.name)
                .map((u) => `@${u.name}`)
                .join(" ");
            if (source === "new-post") {
                setNewPostContent((prev) => (prev ? prev + " " + mentionText + " " : mentionText + " "));
            } else {
                setCommentTexts((prev) => ({
                    ...prev,
                    [source]: (prev[source] || "") + " " + mentionText + " ",
                }));
            }
            toast.success(`Mentioned ${allUsers.length} users`);
        } catch {
            toast.error("Failed to fetch users");
        }
    };

    const handleShowLikers = async (postId: string) => {
        setLikersPostId(postId);
        setLoadingLikers(true);
        try {
            const users = await getPostLikers(postId);
            setLikersList(users);
        } catch {
            toast.error("Failed to load likers");
        } finally {
            setLoadingLikers(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !newPostImage && !newPostVideo && newPostImages.length === 0 && newPostVideos.length === 0) return;
        setIsSubmitting(true);
        try {
            await createPost({
                content: newPostContent,
                image: newPostImage || undefined,
                video: newPostVideo || undefined,
                images: newPostImages.length > 0 ? newPostImages : undefined,
                videos: newPostVideos.length > 0 ? newPostVideos : undefined,
                tags: newPostTags.length > 0 ? newPostTags : undefined,
                linkUrl: newPostLinkUrl.trim() || undefined,
                linkType: newPostLinkUrl.trim() ? newPostLinkType : undefined,
            });
            setNewPostContent("");
            setNewPostImage(null);
            setNewPostVideo(null);
            setNewPostImages([]);
            setNewPostVideos([]);
            setNewPostTags([]);
            setTagInput("");
            setNewPostLinkUrl("");
            setNewPostLinkType(DEFAULT_LINK_TYPE);
            setShowLinkInput(false);
            setShowImageUpload(false);
            setShowVideoUpload(false);
            toast.success("Post published successfully");
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create post";
            toast.error(message === "Unauthorized" ? "Please sign in to create a post" : message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = async (postId: string, reactionType: string = "Like") => {
        try {
            const result = await toggleLike(postId, reactionType);
            setPosts((prev) =>
                prev.map((p) => {
                    if (p.id !== postId) return p;
                    if (result.liked) {
                        // Added or changed reaction
                        const existingIdx = p.likes.findIndex((l) => l.userId === currentUserId);
                        const newLikes = existingIdx >= 0
                            ? p.likes.map((l) => l.userId === currentUserId ? { ...l, reactionType: result.reactionType! } : l)
                            : [...p.likes, { userId: currentUserId, reactionType: result.reactionType!, userName: currentUserName }];
                        return {
                            ...p,
                            _count: {
                                ...p._count,
                                likes: existingIdx >= 0 ? p._count.likes : p._count.likes + 1,
                            },
                            likes: newLikes,
                        };
                    } else {
                        // Removed reaction
                        return {
                            ...p,
                            _count: { ...p._count, likes: p._count.likes - 1 },
                            likes: p.likes.filter((l) => l.userId !== currentUserId),
                        };
                    }
                })
            );
        } catch {
            toast.error("Failed to react to post");
        }
    };

    const handleComment = async (postId: string) => {
        const text = commentTexts[postId]?.trim();
        if (!text) return;
        const replyTarget = replyingTo[postId];
        try {
            const comment = await addComment(postId, text, replyTarget?.id || undefined);
            if (replyTarget) {
                // Add reply to the parent comment's replies
                setPostComments((prev) => ({
                    ...prev,
                    [postId]: (prev[postId] || []).map((c) =>
                        c.id === replyTarget.id
                            ? { ...c, replies: [...(c.replies || []), comment], _count: { ...c._count, commentLikes: c._count?.commentLikes || 0, replies: (c._count?.replies || 0) + 1 } }
                            : c
                    ),
                }));
            } else {
                setPostComments((prev) => ({
                    ...prev,
                    [postId]: [...(prev[postId] || []), { ...comment, replies: [], _count: { commentLikes: 0, replies: 0 }, commentLikes: [] }],
                }));
            }
            setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
            setReplyingTo((prev) => ({ ...prev, [postId]: null }));
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
                        : p
                )
            );
        } catch {
            toast.error("Failed to add comment");
        }
    };

    const handleDelete = async (postId: string) => {
        try {
            await deletePost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            toast.success("Post removed");
        } catch {
            toast.error("Failed to delete post");
        }
    };

    const handleEditPost = async (postId: string) => {
        if (!editingPostContent.trim()) return;
        try {
            await updatePost(postId, {
                content: editingPostContent,
                images: editingPostImages,
                videos: editingPostVideos,
                tags: editingPostTags,
                linkUrl: editingPostLinkUrl.trim() || null,
                linkType: editingPostLinkUrl.trim() ? editingPostLinkType : null,
            });
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId ? {
                        ...p,
                        content: editingPostContent,
                        images: editingPostImages,
                        videos: editingPostVideos,
                        tags: editingPostTags,
                        linkUrl: editingPostLinkUrl.trim() || null,
                        linkType: editingPostLinkUrl.trim() ? editingPostLinkType : null,
                    } : p
                )
            );
            setEditingPostId(null);
            setEditingPostContent("");
            setEditingPostImages([]);
            setEditingPostVideos([]);
            setEditingPostTags([]);
            setEditingPostTagInput("");
            setEditingPostLinkUrl("");
            setEditingPostLinkType(DEFAULT_LINK_TYPE);
            toast.success("Post updated");
        } catch {
            toast.error("Failed to update post");
        }
    };

    const handleReport = async () => {
        if (!reportingPostId || !reportCategory) return;
        const fullReason = reportCategory + (reportReason.trim() ? `: ${reportReason.trim()}` : "");
        try {
            await createReport({
                contentType: "POST",
                contentId: reportingPostId,
                reason: fullReason,
            });
            toast.success("Report submitted successfully");
            setReportingPostId(null);
            setReportReason("");
            setReportCategory("");
        } catch {
            toast.error("Failed to submit report");
        }
    };

    const handleCommentLike = async (postId: string, commentId: string, isDislike: boolean = false, reactionType: string = "Like") => {
        try {
            await toggleCommentLike(commentId, isDislike, reactionType);
            // Refresh comments
            const comments = await getPostComments(postId);
            setPostComments((prev) => ({ ...prev, [postId]: comments }));
        } catch {
            toast.error("Failed to react to comment");
        }
    };

    const handleEditComment = async (postId: string, commentId: string) => {
        if (!editingCommentContent.trim()) return;
        try {
            await editComment(commentId, editingCommentContent);
            setPostComments((prev) => ({
                ...prev,
                [postId]: (prev[postId] || []).map((c) =>
                    c.id === commentId ? { ...c, content: editingCommentContent } : {
                        ...c,
                        replies: (c.replies || []).map((r) =>
                            r.id === commentId ? { ...r, content: editingCommentContent } : r
                        ),
                    }
                ),
            }));
            setEditingCommentId(null);
            setEditingCommentContent("");
            toast.success("Comment updated");
        } catch {
            toast.error("Failed to edit comment");
        }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        try {
            await deleteComment(commentId);
            setPostComments((prev) => ({
                ...prev,
                [postId]: (prev[postId] || [])
                    .filter((c) => c.id !== commentId)
                    .map((c) => ({
                        ...c,
                        replies: (c.replies || []).filter((r) => r.id !== commentId),
                    })),
            }));
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? { ...p, _count: { ...p._count, comments: Math.max(0, p._count.comments - 1) } }
                        : p
                )
            );
            toast.success("Comment removed");
        } catch {
            toast.error("Failed to delete comment");
        }
    };

    const handleReportComment = async () => {
        if (!reportingCommentId || !commentReportCategory) return;
        const fullReason = commentReportCategory + (commentReportDetails.trim() ? `: ${commentReportDetails.trim()}` : "");
        try {
            await createReport({
                contentType: "COMMENT",
                contentId: reportingCommentId,
                reason: fullReason,
            });
            toast.success("Comment reported successfully");
            setReportingCommentId(null);
            setCommentReportCategory("");
            setCommentReportDetails("");
        } catch {
            toast.error("Failed to report comment");
        }
    };

    const insertEmoji = (postId: string, emoji: string) => {
        setCommentTexts((prev) => ({ ...prev, [postId]: (prev[postId] || "") + emoji }));
        setShowCommentEmoji(null);
    };

    const handleTogglePostComments = async (postId: string) => {
        try {
            const result = await togglePostComments(postId);
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId ? { ...p, commentsEnabled: result.commentsEnabled } : p
                )
            );
            toast.success(result.commentsEnabled ? "Comments enabled" : "Comments disabled");
        } catch {
            toast.error("Failed to toggle comments");
        }
    };

    const toggleComments = async (postId: string) => {
        const isExpanded = expandedComments.has(postId);
        if (!isExpanded && !postComments[postId]) {
            try {
                const comments = await getPostComments(postId);
                setPostComments((prev) => ({ ...prev, [postId]: comments }));
            } catch {
                toast.error("Failed to load comments");
            }
        }
        setExpandedComments((prev) => {
            const next = new Set(prev);
            if (isExpanded) next.delete(postId);
            else next.add(postId);
            return next;
        });
    };

    // Use formatRelativeDate as formatDate alias for backward compatibility in this file
    const formatDate = formatRelativeDate;

    const [sharePostId, setSharePostId] = React.useState<string | null>(null);

    const handleShare = (post: PostData) => {
        setSharePostId(post.id);
    };

    const handleShareTo = (platform: string, post: PostData) => {
        const shareUrl = typeof window !== "undefined" ? window.location.origin + "/feeds" : "";
        const shareText = encodeURIComponent(post.content.substring(0, 200));
        const encodedUrl = encodeURIComponent(shareUrl);

        // Increment share count
        setShareCounts((prev) => ({
            ...prev,
            [post.id]: (prev[post.id] || 0) + 1,
        }));

        let url = "";
        switch (platform) {
            case "whatsapp":
                url = `https://wa.me/?text=${shareText}%20${encodedUrl}`;
                break;
            case "facebook":
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case "twitter":
                url = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`;
                break;
            case "instagram":
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied! Paste it on Instagram.");
                setSharePostId(null);
                return;
            case "copy":
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied to clipboard!");
                setSharePostId(null);
                return;
        }
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        setSharePostId(null);
    };

    const openImageModal = (post: PostData, imageIndex: number = 0) => {
        setImageModalPost(post);
        setImageModalIndex(imageIndex);
        setImageModalOpen(true);
    };

    // Comment reaction hover state
    const [commentReactionHoverId, setCommentReactionHoverId] = React.useState<string | null>(null);
    const commentReactionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        return () => {
            if (commentReactionTimeoutRef.current) clearTimeout(commentReactionTimeoutRef.current);
        };
    }, []);

    const handleCommentReactionEnter = (commentId: string) => {
        if (commentReactionTimeoutRef.current) clearTimeout(commentReactionTimeoutRef.current);
        setCommentReactionHoverId(commentId);
    };

    const handleCommentReactionLeave = () => {
        commentReactionTimeoutRef.current = setTimeout(() => {
            setCommentReactionHoverId(null);
        }, 300);
    };

    const handleCommentReaction = (postId: string, commentId: string, reaction: string) => {
        setCommentReactionHoverId(null);
        handleCommentLike(postId, commentId, false, reaction);
    };

    return (
        <div className="w-full space-y-4">
            {/* Create Post Card - LinkedIn Style */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm rounded-xl">
                <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 border border-gray-200 dark:border-gray-700">
                            <AvatarImage src={currentUserImage || undefined} alt={currentUserName || ""} />
                            <AvatarFallback className="bg-blue-700 text-white text-sm font-semibold">
                                {currentUserInitials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                            <div className="relative">
                                <Textarea
                                    placeholder="Share an update with your community... (use @ to mention users)"
                                    value={newPostContent}
                                    onChange={(e) => {
                                        setNewPostContent(e.target.value);
                                        handleMentionSearch(e.target.value, "new-post");
                                    }}
                                    className="min-h-[60px] sm:min-h-[80px] resize-none border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-950 transition-colors text-sm sm:text-base"
                                />
                                {/* @Mention Dropdown for Post */}
                                {showMentionDropdown === "new-post" && mentionResults.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {mentionResults.map((user) => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => insertMention(user.name || "User", "new-post")}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                            >
                                                <Avatar className="h-7 w-7 shrink-0">
                                                    <AvatarImage src={user.image || undefined} />
                                                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{(user.name || "U")[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Images Preview (multiple) */}
                            {(newPostImages.length > 0 || newPostImage) && (
                                <div className="flex flex-wrap gap-2">
                                    {newPostImage && (
                                        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-full sm:w-[calc(50%-4px)]">
                                            <Image
                                                src={newPostImage}
                                                alt="Upload preview"
                                                width={300}
                                                height={200}
                                                className="w-full h-[120px] sm:h-[150px] object-cover"
                                                unoptimized
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { deleteBlobUrl(newPostImage!); setNewPostImage(null); }}
                                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors cursor-pointer"
                                                title="Remove image"
                                            >
                                                <XIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}
                                    {newPostImages.map((img, idx) => (
                                        <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-full sm:w-[calc(50%-4px)]">
                                            <Image
                                                src={img}
                                                alt={`Upload preview ${idx + 1}`}
                                                width={300}
                                                height={200}
                                                className="w-full h-[120px] sm:h-[150px] object-cover"
                                                unoptimized
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { deleteBlobUrl(img); setNewPostImages((prev) => prev.filter((_, i) => i !== idx)); }}
                                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors cursor-pointer"
                                                title="Remove image"
                                            >
                                                <XIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Videos Preview (multiple) */}
                            {(newPostVideos.length > 0 || newPostVideo) && (
                                <div className="space-y-2">
                                    {newPostVideo && (
                                        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                            <video src={newPostVideo} controls className="w-full max-h-[150px] sm:max-h-[200px] object-contain bg-black" />
                                            <button
                                                type="button"
                                                onClick={() => setNewPostVideo(null)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors cursor-pointer"
                                                title="Remove video"
                                            >
                                                <XIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                    {newPostVideos.map((vid, idx) => (
                                        <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                            <video src={vid} controls className="w-full max-h-[150px] sm:max-h-[200px] object-contain bg-black" />
                                            <button
                                                type="button"
                                                onClick={() => { deleteBlobUrl(vid); setNewPostVideos((prev) => prev.filter((_, i) => i !== idx)); }}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors cursor-pointer"
                                                title="Remove video"
                                            >
                                                <XIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Image Upload Dropzone */}
                            {showImageUpload && (
                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
                                    <ImageUpload
                                        variant="feed"
                                        onChange={(url) => {
                                            if (url) {
                                                setNewPostImages((prev) => [...prev, url]);
                                                setShowImageUpload(false);
                                            }
                                        }}
                                    />
                                </div>
                            )}
                            {/* Video Upload */}
                            {showVideoUpload && (
                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
                                    <VideoUploadInput
                                        onUpload={(url) => {
                                            setNewPostVideos((prev) => [...prev, url]);
                                            setShowVideoUpload(false);
                                        }}
                                    />
                                </div>
                            )}
                            {/* Link URL Input */}
                            {showLinkInput && (
                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-2 sm:p-3 bg-gray-50 dark:bg-gray-900 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <LinkIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                        <input
                                            type="url"
                                            placeholder="Paste a link URL (e.g. https://example.com)"
                                            value={newPostLinkUrl}
                                            onChange={(e) => setNewPostLinkUrl(e.target.value)}
                                            className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setShowLinkInput(false); setNewPostLinkUrl(""); setNewPostLinkType(DEFAULT_LINK_TYPE); }}
                                            className="p-1 text-gray-400 hover:text-red-500"
                                        >
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Button label:</span>
                                        <select
                                            value={newPostLinkType}
                                            onChange={(e) => setNewPostLinkType(e.target.value)}
                                            className="text-xs sm:text-sm px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            {CTA_LINK_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-0.5 sm:gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowVideoUpload(false);
                                            setShowImageUpload(!showImageUpload);
                                        }}
                                        className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 h-9 px-2 sm:px-3 rounded-lg"
                                    >
                                        <ImageIcon className="h-4 w-4 sm:mr-1.5" />
                                        <span className="hidden sm:inline text-sm font-medium">Photo</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowImageUpload(false);
                                            setShowVideoUpload(!showVideoUpload);
                                        }}
                                        className="text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 h-9 px-2 sm:px-3 rounded-lg"
                                    >
                                        <VideoIcon className="h-4 w-4 sm:mr-1.5" />
                                        <span className="hidden sm:inline text-sm font-medium">Video</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowLinkInput(!showLinkInput)}
                                        className="text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 h-9 px-2 sm:px-3 rounded-lg"
                                    >
                                        <LinkIcon className="h-4 w-4 sm:mr-1.5" />
                                        <span className="hidden sm:inline text-sm font-medium">Link</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleMentionAll("new-post")}
                                        className="text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 h-9 px-2 sm:px-3 rounded-lg"
                                        title="Mention all users"
                                    >
                                        <UsersIcon className="h-4 w-4 sm:mr-1.5" />
                                        <span className="hidden sm:inline text-sm font-medium">@All</span>
                                    </Button>
                                </div>
                                <Button
                                    onClick={handleCreatePost}
                                    disabled={isSubmitting || (!newPostContent.trim() && !newPostImage && !newPostVideo && newPostImages.length === 0 && newPostVideos.length === 0)}
                                    size="sm"
                                    className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-5 h-9 text-sm font-medium disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Posting...
                                        </span>
                                    ) : (
                                        <>
                                            <SendIcon className="h-3.5 w-3.5 mr-1.5" />
                                            Post
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Divider */}
            <div className="flex items-center gap-3 px-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Recent Activity</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            </div>

            {/* Posts Feed */}
            {posts.length === 0 ? (
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                    <CardContent className="py-10 sm:py-16 text-center">
                        <div className="flex flex-col items-center gap-2 sm:gap-3">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <PenIcon className="h-5 w-5 sm:h-7 sm:w-7 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-gray-800 dark:text-gray-200 font-semibold">No posts yet</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Be the first to share an update with the community!</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                posts.map((post) => {
                    const userReaction = post.likes.find((l) => l.userId === currentUserId)?.reactionType;

                    return (
                        <div key={post.id} className="space-y-0">
                            {/* Post Context Bar - LinkedIn-style Recent Activity */}
                            {post.recentActivity && post.recentActivity.users.length > 0 && (
                                <PostContextBar
                                    users={post.recentActivity.users}
                                    likeCount={post.recentActivity.likeCount}
                                    commentCount={post.recentActivity.commentCount}
                                />
                            )}

                        <PostCard>
                            {/* Post Header */}
                            <PostHeader
                                userName={post.user.name}
                                userImage={post.user.image}
                                userProfession={post.user.profession}
                                createdAt={post.createdAt}
                                actions={
                                    <>
                                        {post.user.id !== currentUserId && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 rounded-full"
                                                onClick={() => setReportingPostId(post.id)}
                                                title="Report post"
                                            >
                                                <FlagIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {post.user.id === currentUserId && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "h-8 w-8 rounded-full",
                                                    post.commentsEnabled === false
                                                        ? "text-orange-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950"
                                                        : "text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950"
                                                )}
                                                onClick={() => handleTogglePostComments(post.id)}
                                                title={post.commentsEnabled === false ? "Enable comments" : "Disable comments"}
                                            >
                                                {post.commentsEnabled === false ? <MessageCircleOffIcon className="h-4 w-4" /> : <MessageCircleIcon className="h-4 w-4" />}
                                            </Button>
                                        )}
                                        {post.user.id === currentUserId && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-full"
                                                onClick={() => {
                                                    setEditingPostId(post.id);
                                                    setEditingPostContent(post.content);
                                                    setEditingPostImages(post.images || []);
                                                    setEditingPostVideos(post.videos || []);
                                                    setEditingPostTags(post.tags || []);
                                                    setEditingPostLinkUrl(post.linkUrl || "");
                                                    setEditingPostLinkType(post.linkType || DEFAULT_LINK_TYPE);
                                                    setEditingShowImageUpload(false);
                                                    setEditingShowVideoUpload(false);
                                                    setEditingShowLinkInput(false);
                                                }}
                                                title="Edit post"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {(post.user.id === currentUserId || isAdmin) && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-full"
                                                onClick={() => handleDelete(post.id)}
                                                title="Delete post"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </>
                                }
                            />

                            {/* Post Text Content */}
                            {(post.content || editingPostId === post.id) && (
                                <PostTextContent
                                    content={post.content}
                                    customRender={editingPostId === post.id ? (
                                        <div className="space-y-3">
                                            <Textarea
                                                value={editingPostContent}
                                                onChange={(e) => setEditingPostContent(e.target.value)}
                                                className="min-h-[80px] resize-none border-gray-200 dark:border-gray-700 rounded-xl text-base"
                                            />
                                            {/* Editing: Existing images */}
                                            {editingPostImages.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {editingPostImages.map((img, idx) => (
                                                        <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                            <Image src={img} alt="" width={200} height={120} className="w-full h-[120px] object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => { deleteBlobUrl(img); setEditingPostImages((prev) => prev.filter((_, i) => i !== idx)); }}
                                                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white"
                                                                title="Remove image"
                                                            >
                                                                <XIcon className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Editing: Existing videos */}
                                            {editingPostVideos.length > 0 && (
                                                <div className="space-y-2">
                                                    {editingPostVideos.map((vid, idx) => (
                                                        <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                            <video src={vid} controls className="w-full max-h-[120px] sm:max-h-[150px] object-contain bg-black" />
                                                            <button
                                                                type="button"
                                                                onClick={() => { deleteBlobUrl(vid); setEditingPostVideos((prev) => prev.filter((_, i) => i !== idx)); }}
                                                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white"
                                                                title="Remove video"
                                                            >
                                                                <XIcon className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Editing: Image upload */}
                                            {editingShowImageUpload && (
                                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900">
                                                    <ImageUpload
                                                        variant="feed"
                                                        onChange={(url) => {
                                                            if (url) {
                                                                setEditingPostImages((prev) => [...prev, url]);
                                                                setEditingShowImageUpload(false);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {/* Editing: Video upload */}
                                            {editingShowVideoUpload && (
                                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900">
                                                    <VideoUploadInput
                                                        onUpload={(url) => {
                                                            setEditingPostVideos((prev) => [...prev, url]);
                                                            setEditingShowVideoUpload(false);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {/* Editing: Link URL */}
                                            {editingShowLinkInput && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="url"
                                                            placeholder="Enter URL..."
                                                            value={editingPostLinkUrl}
                                                            onChange={(e) => setEditingPostLinkUrl(e.target.value)}
                                                            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
                                                        />
                                                        <button type="button" onClick={() => setEditingShowLinkInput(false)} className="text-gray-400 hover:text-gray-600">
                                                            <XIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Button label:</span>
                                                        <select
                                                            value={editingPostLinkType}
                                                            onChange={(e) => setEditingPostLinkType(e.target.value)}
                                                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        >
                                                            {CTA_LINK_TYPES.map((t) => (
                                                                <option key={t.value} value={t.value}>{t.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                            {editingPostLinkUrl && !editingShowLinkInput && (
                                                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                                                    <LinkIcon className="h-3 w-3" />
                                                    <span className="truncate">{editingPostLinkUrl}</span>
                                                    <button type="button" onClick={() => { setEditingPostLinkUrl(""); setEditingPostLinkType(DEFAULT_LINK_TYPE); }} className="text-gray-400 hover:text-red-500 ml-auto">
                                                        <XIcon className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            )}
                                            {/* Editing: Tags */}
                                            {editingPostTags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {editingPostTags.map((tag) => (
                                                        <Badge key={tag} variant="secondary" className="text-xs gap-1">
                                                            #{tag}
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingPostTags((prev) => prev.filter((t) => t !== tag))}
                                                                className="hover:text-red-500"
                                                            >
                                                                <XIcon className="h-2.5 w-2.5" />
                                                            </button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Editing: Tag input */}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Add tag..."
                                                    value={editingPostTagInput}
                                                    onChange={(e) => setEditingPostTagInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && editingPostTagInput.trim()) {
                                                            e.preventDefault();
                                                            const tag = editingPostTagInput.trim().replace(/^#/, "");
                                                            if (tag && !editingPostTags.includes(tag)) {
                                                                setEditingPostTags((prev) => [...prev, tag]);
                                                            }
                                                            setEditingPostTagInput("");
                                                        }
                                                    }}
                                                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1 text-xs"
                                                />
                                            </div>
                                            {/* Editing: Media action bar */}
                                            <div className="flex items-center gap-1 border-t border-gray-100 dark:border-gray-800 pt-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setEditingShowImageUpload(!editingShowImageUpload); setEditingShowVideoUpload(false); }}
                                                    className="h-7 px-2 text-xs text-gray-500 hover:text-blue-600"
                                                >
                                                    <ImageIcon className="h-3.5 w-3.5 mr-1" /> Image
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setEditingShowVideoUpload(!editingShowVideoUpload); setEditingShowImageUpload(false); }}
                                                    className="h-7 px-2 text-xs text-gray-500 hover:text-blue-600"
                                                >
                                                    <VideoIcon className="h-3.5 w-3.5 mr-1" /> Video
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEditingShowLinkInput(!editingShowLinkInput)}
                                                    className="h-7 px-2 text-xs text-gray-500 hover:text-blue-600"
                                                >
                                                    <LinkIcon className="h-3.5 w-3.5 mr-1" /> Link
                                                </Button>
                                            </div>
                                            {/* Editing: Save/Cancel */}
                                            <div className="flex items-center gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingPostId(null);
                                                        setEditingPostContent("");
                                                        setEditingPostImages([]);
                                                        setEditingPostVideos([]);
                                                        setEditingPostTags([]);
                                                        setEditingPostTagInput("");
                                                        setEditingPostLinkUrl("");
                                                        setEditingShowImageUpload(false);
                                                        setEditingShowVideoUpload(false);
                                                        setEditingShowLinkInput(false);
                                                    }}
                                                    className="rounded-lg"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleEditPost(post.id)}
                                                    disabled={!editingPostContent.trim()}
                                                    className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
                                                >
                                                    Save
                                                </Button>
                                            </div>
                                        </div>
                                    ) : undefined}
                                />
                            )}

                            {/* Post Tags - hide when editing */}
                            {editingPostId !== post.id && <PostTags tags={post.tags} />}

                            {/* Post Media Content - hide when editing */}
                            {editingPostId !== post.id && (post.image || (post.images && post.images.length > 0) || post.video || (post.videos && post.videos.length > 0)) && (
                                <PostMediaContent
                                    image={post.image}
                                    images={post.images}
                                    video={post.video}
                                    videos={post.videos}
                                    onImageClick={(idx) => openImageModal(post, idx)}
                                />
                            )}

                            {/* Link Preview Card - hide when editing */}
                            {editingPostId !== post.id && post.linkUrl && (
                                <div className="px-3 sm:px-4 py-2">
                                    <LinkPreviewCard
                                        url={post.linkUrl}
                                        linkType={post.linkType}
                                        hasMedia={postHasMedia(post)}
                                    />
                                </div>
                            )}

                            {/* Engagement Summary */}
                            <PostEngagementSummary
                                likeCount={post._count.likes}
                                commentCount={post._count.comments}
                                shareCount={shareCounts[post.id] || 0}
                                reactionTypes={post.likes.map((l) => l.reactionType)}
                                reactionUsers={post.likes.map((l) => ({ userId: l.userId, reactionType: l.reactionType, userName: l.userName }))}
                                onLikeCountClick={() => handleShowLikers(post.id)}
                                onCommentCountClick={() => toggleComments(post.id)}
                            />

                            {/* Action Buttons - LinkedIn Style with Reaction Popup */}
                            <PostActionBar>
                                {/* Like button with reaction popup */}
                                <ReactionsPicker
                                    postId={post.id}
                                    initialReaction={userReaction || null}
                                    initialCount={post._count.likes}
                                    onReact={(pid, reaction) => handleLike(pid, reaction)}
                                />
                                <button
                                    onClick={() => post.commentsEnabled !== false && toggleComments(post.id)}
                                    className={cn(
                                        "flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors w-full justify-center",
                                        post.commentsEnabled === false
                                            ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                    disabled={post.commentsEnabled === false}
                                    title={post.commentsEnabled === false ? "Comments are disabled for this post" : "Comment"}
                                >
                                    {post.commentsEnabled === false ? <MessageCircleOffIcon className="h-4 w-4" /> : <MessageCircleIcon className="h-4 w-4" />}
                                    <span className="hidden sm:inline">Comment</span>
                                </button>
                                <button
                                    className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center"
                                    onClick={() => handleShare(post)}
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                                    <span className="hidden sm:inline">Repost</span>
                                </button>
                                <button
                                    className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center"
                                    onClick={() => {
                                        const postUrl = typeof window !== "undefined" ? `${window.location.origin}/feeds#post-${post.id}` : "";
                                        navigator.clipboard.writeText(postUrl);
                                        toast.success("Link copied — share it anywhere!");
                                    }}
                                >
                                    <SendIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">Send</span>
                                </button>
                            </PostActionBar>

                            {/* Comments Section */}
                            {expandedComments.has(post.id) && post.commentsEnabled !== false && (
                                <PostCommentsSection>
                                    {(() => {
                                        const allComments = postComments[post.id] || [];
                                        const INITIAL_COMMENTS = 3;
                                        const visibleCount = visibleCommentCount[post.id] || INITIAL_COMMENTS;
                                        const visibleItems = allComments.slice(0, visibleCount);
                                        const hasMore = allComments.length > visibleCount;
                                        const COMMENT_COLLAPSE_THRESHOLD = 200;

                                        return (
                                            <>
                                                {visibleItems.map((comment) => {
                                        const commentInitials = getInitials(comment.user.name);
                                        const isCommentAuthor = comment.user.id === currentUserId;
                                        const isPostAuthor = comment.user.id === post.user.id;
                                        const isCommentAdmin = comment.user.role === "admin" || comment.user.role === "superadmin";
                                        const commentLikes = (comment.commentLikes || []).filter((l) => !l.isDislike);
                                        const userCommentReaction = (comment.commentLikes || []).find((l) => l.userId === currentUserId && !l.isDislike);
                                        const userLiked = !!userCommentReaction;
                                        const userCommentReactionType = userCommentReaction?.reactionType;
                                        const userCommentReactionEmoji = userCommentReactionType ? getReactionEmoji(userCommentReactionType) : null;
                                        const isLongComment = comment.content.length > COMMENT_COLLAPSE_THRESHOLD;

                                        return (
                                            <div key={comment.id} className="space-y-1">
                                                {/* LinkedIn-style comment card */}
                                                <div className="flex gap-2.5">
                                                    <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                                                        <AvatarImage src={comment.user.image || undefined} />
                                                        <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 font-medium">
                                                            {commentInitials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="relative bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-800">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                    {comment.user.name || "Anonymous"}
                                                                </p>
                                                                {comment.user.profession && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">· {comment.user.profession}</span>
                                                                )}
                                                                {isPostAuthor && (
                                                                    <Badge className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 leading-4">Author</Badge>
                                                                )}
                                                                {isCommentAdmin && (
                                                                    <Badge className="text-xs px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 leading-4">Admin</Badge>
                                                                )}
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                                                                    {formatDate(comment.createdAt)}
                                                                </p>
                                                            </div>
                                                            {editingCommentId === comment.id ? (
                                                                <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editingCommentContent}
                                                                        onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                        onKeyDown={(e) => { if (e.key === "Enter") handleEditComment(post.id, comment.id); if (e.key === "Escape") { setEditingCommentId(null); setEditingCommentContent(""); } }}
                                                                        className="flex-1 text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        autoFocus
                                                                    />
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <button type="button" className="text-gray-400 hover:text-yellow-500 transition-colors p-1">
                                                                                <SmileIcon className="h-4 w-4" />
                                                                            </button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-2" align="end">
                                                                            <div className="grid grid-cols-8 gap-1">
                                                                                {EMOJI_LIST.map((emoji) => (
                                                                                    <button
                                                                                        key={emoji}
                                                                                        type="button"
                                                                                        onClick={() => setEditingCommentContent((prev) => prev + emoji)}
                                                                                        className="text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1 cursor-pointer"
                                                                                    >
                                                                                        {emoji}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleEditComment(post.id, comment.id)}>Save</Button>
                                                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditingCommentId(null); setEditingCommentContent(""); }}>Cancel</Button>
                                                                </div>
                                                            ) : (
                                                                <CommentTextWithSeeMore content={comment.content} threshold={COMMENT_COLLAPSE_THRESHOLD} />
                                                            )}
                                                            {/* Comment Reaction Indicator - LinkedIn style badge */}
                                                            {commentLikes.length > 0 && (
                                                                <span className="absolute -bottom-2.5 right-2 flex items-center gap-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-full px-1.5 py-0.5 shadow-sm">
                                                                    <CommentReactionSummary
                                                                        reactionTypes={commentLikes.map((l) => l.reactionType)}
                                                                        count={commentLikes.length}
                                                                    />
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Comment Actions - LinkedIn style with Reaction Popup */}
                                                        <div className="flex items-center gap-2 sm:gap-3 mt-1 px-1 flex-wrap">
                                                            <div
                                                                className="relative"
                                                                onMouseEnter={() => handleCommentReactionEnter(comment.id)}
                                                                onMouseLeave={handleCommentReactionLeave}
                                                            >
                                                                {commentReactionHoverId === comment.id && (
                                                                    <div
                                                                        className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-full shadow-xl px-2 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                                                                        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                                                                        onMouseEnter={() => handleCommentReactionEnter(comment.id)}
                                                                        onMouseLeave={handleCommentReactionLeave}
                                                                    >
                                                                        {REACTIONS.map((reaction) => (
                                                                            <button
                                                                                key={reaction.label}
                                                                                onClick={() => handleCommentReaction(post.id, comment.id, reaction.label)}
                                                                                className="group relative flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 hover:scale-[1.35] hover:-translate-y-1 cursor-pointer"
                                                                                title={reaction.label}
                                                                            >
                                                                                <span className="text-lg drop-shadow-sm">{getReactionEmoji(reaction.label)}</span>
                                                                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
                                                                                    {reaction.label}
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <button onClick={() => handleCommentLike(post.id, comment.id, false, userCommentReactionType || "Like")} className={`flex items-center gap-1 text-xs font-medium transition-colors ${userLiked ? "text-blue-600" : "text-gray-500 hover:text-blue-600"}`}>
                                                                    {userLiked && userCommentReactionEmoji ? (
                                                                        <span className="text-sm leading-none">{userCommentReactionEmoji}</span>
                                                                    ) : (
                                                                        <ThumbsUpIcon className={`h-3 w-3 ${userLiked ? "fill-current" : ""}`} />
                                                                    )}
                                                                    {userLiked && userCommentReactionType ? userCommentReactionType : "Like"}{commentLikes.length > 0 && <span className="ml-0.5">· {commentLikes.length}</span>}
                                                                </button>
                                                            </div>
                                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                                            <button onClick={() => {
                                                                const userName = comment.user.name || "Anonymous";
                                                                setReplyingTo((prev) => ({ ...prev, [post.id]: { id: comment.id, name: userName } }));
                                                                setCommentTexts((prev) => ({ ...prev, [post.id]: `@${userName.replace(/\s+/g, "")} ` }));
                                                            }} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors">
                                                                <ReplyIcon className="h-3 w-3" />
                                                                Reply{comment.replies && comment.replies.length > 0 ? ` · ${comment.replies.length}` : ""}
                                                            </button>
                                                            {isCommentAuthor && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                                                    <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentContent(comment.content); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors">
                                                                        <PencilIcon className="h-3 w-3" />
                                                                        Edit
                                                                    </button>
                                                                </>
                                                            )}
                                                            {(isCommentAuthor || isAdmin) && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                                                    <button onClick={() => handleDeleteComment(post.id, comment.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors">
                                                                        <TrashIcon className="h-3 w-3" />
                                                                        Delete
                                                                    </button>
                                                                </>
                                                            )}
                                                            {!isCommentAuthor && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                                                    <button onClick={() => setReportingCommentId(comment.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition-colors">
                                                                        <FlagIcon className="h-3 w-3" />
                                                                        Report
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Replies - LinkedIn-style with vertical line */}
                                                        {(comment.replies || []).length > 0 && (
                                                            <div className="relative mt-2 ml-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                                                                {(comment.replies || []).map((reply) => {
                                                                    const replyInitials = getInitials(reply.user.name);
                                                                    const isReplyAuthor = reply.user.id === currentUserId;
                                                                    const isReplyPostAuthor = reply.user.id === post.user.id;
                                                                    const isReplyAdmin = reply.user.role === "admin" || reply.user.role === "superadmin";
                                                                    const rLikes = (reply.commentLikes || []).filter((l) => !l.isDislike);
                                                                    const rUserReaction = (reply.commentLikes || []).find((l) => l.userId === currentUserId && !l.isDislike);
                                                                    const rUserLiked = !!rUserReaction;
                                                                    const rUserReactionType = rUserReaction?.reactionType;
                                                                    const rUserReactionEmoji = rUserReactionType ? getReactionEmoji(rUserReactionType) : null;

                                                                    return (
                                                                        <div key={reply.id} className="flex gap-2 mb-2">
                                                                            <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                                                                                <AvatarImage src={reply.user.image || undefined} />
                                                                                <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 font-medium">{replyInitials}</AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg px-2.5 py-1.5 border border-gray-100 dark:border-gray-800">
                                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{reply.user.name || "Anonymous"}</p>
                                                                                        {reply.user.profession && (
                                                                                            <span className="text-xs text-gray-500 dark:text-gray-400">· {reply.user.profession}</span>
                                                                                        )}
                                                                                        {isReplyPostAuthor && <Badge className="text-xs px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 leading-3">Author</Badge>}
                                                                                        {isReplyAdmin && <Badge className="text-xs px-1 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 leading-3">Admin</Badge>}
                                                                                        <span className="text-xs text-gray-400 ml-auto">{formatDate(reply.createdAt)}</span>
                                                                                    </div>
                                                                                    {editingCommentId === reply.id ? (
                                                                                        <div className="mt-1 flex gap-1">
                                                                                            <input type="text" value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleEditComment(post.id, reply.id); if (e.key === "Escape") { setEditingCommentId(null); setEditingCommentContent(""); } }} className="flex-1 text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                                                                                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => handleEditComment(post.id, reply.id)}>Save</Button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <CommentTextWithSeeMore content={reply.content} threshold={COMMENT_COLLAPSE_THRESHOLD} isReply />
                                                                                    )}
                                                                                    {/* Reply Reaction Indicator - LinkedIn style badge */}
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
                                                                                        onMouseEnter={() => handleCommentReactionEnter(reply.id)}
                                                                                        onMouseLeave={handleCommentReactionLeave}
                                                                                    >
                                                                                        {commentReactionHoverId === reply.id && (
                                                                                            <div
                                                                                                className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-full shadow-xl px-2 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                                                                                                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                                                                                                onMouseEnter={() => handleCommentReactionEnter(reply.id)}
                                                                                                onMouseLeave={handleCommentReactionLeave}
                                                                                            >
                                                                                                {REACTIONS.map((reaction) => (
                                                                                                    <button
                                                                                                        key={reaction.label}
                                                                                                        onClick={() => handleCommentReaction(post.id, reply.id, reaction.label)}
                                                                                                        className="group relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 hover:scale-[1.35] hover:-translate-y-1 cursor-pointer"
                                                                                                        title={reaction.label}
                                                                                                    >
                                                                                                        <span className="text-base drop-shadow-sm">{getReactionEmoji(reaction.label)}</span>
                                                                                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
                                                                                                            {reaction.label}
                                                                                                        </span>
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                        <button onClick={() => handleCommentLike(post.id, reply.id, false, rUserReactionType || "Like")} className={`flex items-center gap-0.5 text-xs font-medium ${rUserLiked ? "text-blue-600" : "text-gray-500 hover:text-blue-600"}`}>
                                                                                            {rUserLiked && rUserReactionEmoji ? (
                                                                                                <span className="text-sm leading-none">{rUserReactionEmoji}</span>
                                                                                            ) : (
                                                                                                <ThumbsUpIcon className={`h-2.5 w-2.5 ${rUserLiked ? "fill-current" : ""}`} />
                                                                                            )}
                                                                                            {rUserLiked && rUserReactionType ? rUserReactionType : "Like"}{rLikes.length > 0 && <span className="ml-0.5">· {rLikes.length}</span>}
                                                                                        </button>
                                                                                    </div>
                                                                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                                                                    <button onClick={() => {
                                                                                        const replyUserName = reply.user.name || "Anonymous";
                                                                                        setReplyingTo((prev) => ({ ...prev, [post.id]: { id: comment.id, name: replyUserName } }));
                                                                                        setCommentTexts((prev) => ({ ...prev, [post.id]: `@${replyUserName.replace(/\s+/g, "")} ` }));
                                                                                    }} className="flex items-center gap-0.5 text-xs font-medium text-gray-500 hover:text-blue-600">
                                                                                        <ReplyIcon className="h-2.5 w-2.5" />
                                                                                        Reply
                                                                                    </button>
                                                                                    {isReplyAuthor && (
                                                                                        <>
                                                                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                                                                            <button onClick={() => { setEditingCommentId(reply.id); setEditingCommentContent(reply.content); }} className="text-xs text-gray-500 hover:text-green-600">Edit</button>
                                                                                        </>
                                                                                    )}
                                                                                    {(isReplyAuthor || isAdmin) && (
                                                                                        <>
                                                                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                                                                            <button onClick={() => handleDeleteComment(post.id, reply.id)} className="text-xs text-gray-500 hover:text-red-600">Delete</button>
                                                                                        </>
                                                                                    )}
                                                                                    {!isReplyAuthor && (
                                                                                        <>
                                                                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                                                                            <button onClick={() => setReportingCommentId(reply.id)} className="text-xs text-gray-500 hover:text-orange-600">Report</button>
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
                                                {hasMore && visibleItems.length > 0 && (
                                                    <button
                                                        onClick={() => setVisibleCommentCount((prev) => ({
                                                            ...prev,
                                                            [post.id]: visibleCount + 5,
                                                        }))}
                                                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        Load more comments ({allComments.length - visibleCount} remaining)
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}

                                    {/* Reply indicator */}
                                    {replyingTo[post.id] && (
                                        <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                                            <ReplyIcon className="h-3 w-3" />
                                            Replying to <strong>{replyingTo[post.id]?.name}</strong>
                                            <button onClick={() => setReplyingTo((prev) => ({ ...prev, [post.id]: null }))} className="ml-auto text-gray-400 hover:text-gray-600">
                                                <XIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Comment Input */}
                                    <div className="flex gap-2.5 pt-1">
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage src={currentUserImage || undefined} />
                                            <AvatarFallback className="text-xs bg-blue-700 text-white font-medium">
                                                {currentUserInitials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 relative">
                                            <div className="flex items-center gap-1">
                                                <Popover open={showCommentEmoji === post.id} onOpenChange={(open) => setShowCommentEmoji(open ? post.id : null)}>
                                                    <PopoverTrigger asChild>
                                                        <button className="h-9 w-9 flex items-center justify-center rounded-full text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950 transition-colors shrink-0" title="Add emoji">
                                                            <SmileIcon className="h-4 w-4" />
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-64 p-2" side="top">
                                                        <div className="grid grid-cols-8 gap-1">
                                                            {EMOJI_LIST.map((emoji) => (
                                                                <button key={emoji} className="text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1 transition-colors" onClick={() => insertEmoji(post.id, emoji)}>
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <input
                                                    type="text"
                                                    placeholder={replyingTo[post.id] ? `Reply to ${replyingTo[post.id]?.name}...` : "Write a comment... (use @ to mention)"}
                                                    value={commentTexts[post.id] || ""}
                                                    onChange={(e) => {
                                                        setCommentTexts((prev) => ({
                                                            ...prev,
                                                            [post.id]: e.target.value,
                                                        }));
                                                        handleMentionSearch(e.target.value, post.id);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && showMentionDropdown !== post.id) handleComment(post.id);
                                                    }}
                                                    className="flex-1 h-9 px-4 text-base rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleComment(post.id)}
                                                    className="h-9 w-9 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 shrink-0"
                                                    disabled={!commentTexts[post.id]?.trim()}
                                                >
                                                    <SendIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {/* @Mention Dropdown for Comment */}
                                            {showMentionDropdown === post.id && mentionResults.length > 0 && (
                                                <div className="absolute z-50 left-0 right-0 bottom-full mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                    {mentionResults.map((user) => (
                                                        <button
                                                            key={user.id}
                                                            type="button"
                                                            onClick={() => insertMention(user.name || "User", post.id)}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                                        >
                                                            <Avatar className="h-6 w-6 shrink-0">
                                                                <AvatarImage src={user.image || undefined} />
                                                                <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{(user.name || "U")[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </PostCommentsSection>
                            )}
                        </PostCard>
                        </div>
                    );
                })
            )}

            {/* Report Dialog */}
            <Dialog open={reportingPostId !== null} onOpenChange={(open) => {
                if (!open) {
                    setReportingPostId(null);
                    setReportReason("");
                    setReportCategory("");
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Report Post</DialogTitle>
                        <DialogDescription>
                            Select a reason for reporting this post.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Select value={reportCategory} onValueChange={setReportCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a reason..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Spam">Spam</SelectItem>
                                <SelectItem value="Harassment or Bullying">Harassment or Bullying</SelectItem>
                                <SelectItem value="Hate Speech">Hate Speech</SelectItem>
                                <SelectItem value="Misinformation">Misinformation</SelectItem>
                                <SelectItem value="Violence or Threats">Violence or Threats</SelectItem>
                                <SelectItem value="Inappropriate Content">Inappropriate Content</SelectItem>
                                <SelectItem value="Copyright Violation">Copyright Violation</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Textarea
                            placeholder="Additional details (optional)..."
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            className="min-h-[80px] resize-none"
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setReportingPostId(null);
                                    setReportReason("");
                                    setReportCategory("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleReport}
                                disabled={!reportCategory}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Submit Report
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Repost Dialog */}
            <Dialog open={sharePostId !== null} onOpenChange={(open) => {
                if (!open) setSharePostId(null);
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Repost</DialogTitle>
                        <DialogDescription>Choose a platform to share this post.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-4">
                        {(() => {
                            const post = posts.find(p => p.id === sharePostId);
                            if (!post) return null;
                            return (
                                <>
                                    <button
                                        onClick={() => handleShareTo("whatsapp", post)}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-lg font-bold">W</div>
                                        <span className="text-sm font-medium">WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={() => handleShareTo("facebook", post)}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">f</div>
                                        <span className="text-sm font-medium">Facebook</span>
                                    </button>
                                    <button
                                        onClick={() => handleShareTo("twitter", post)}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-lg font-bold">𝕏</div>
                                        <span className="text-sm font-medium">X (Twitter)</span>
                                    </button>
                                    <button
                                        onClick={() => handleShareTo("instagram", post)}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-pink-50 dark:hover:bg-pink-950 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">I</div>
                                        <span className="text-sm font-medium">Instagram</span>
                                    </button>
                                    <button
                                        onClick={() => handleShareTo("copy", post)}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors col-span-2"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white">
                                            <ShareIcon className="h-5 w-5" />
                                        </div>
                                        <span className="text-sm font-medium">Copy Link</span>
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Comment Report Dialog */}
            <Dialog open={reportingCommentId !== null} onOpenChange={(open) => {
                if (!open) { setReportingCommentId(null); setCommentReportCategory(""); setCommentReportDetails(""); }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Report Comment</DialogTitle>
                        <DialogDescription>Select a reason for reporting this comment.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Select value={commentReportCategory} onValueChange={setCommentReportCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a reason..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Spam">Spam</SelectItem>
                                <SelectItem value="Harassment or Bullying">Harassment or Bullying</SelectItem>
                                <SelectItem value="Hate Speech">Hate Speech</SelectItem>
                                <SelectItem value="Misinformation">Misinformation</SelectItem>
                                <SelectItem value="Inappropriate Content">Inappropriate Content</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Textarea placeholder="Additional details (optional)..." value={commentReportDetails} onChange={(e) => setCommentReportDetails(e.target.value)} className="min-h-[80px] resize-none" />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setReportingCommentId(null); setCommentReportCategory(""); setCommentReportDetails(""); }}>Cancel</Button>
                            <Button onClick={handleReportComment} disabled={!commentReportCategory} className="bg-red-600 hover:bg-red-700 text-white">Submit Report</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Likers Dialog */}
            <Dialog open={likersPostId !== null} onOpenChange={(open) => {
                if (!open) { setLikersPostId(null); setLikersList([]); }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reactions</DialogTitle>
                        <DialogDescription>
                            {likersList.length} {likersList.length === 1 ? "person" : "people"} reacted to this post
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto space-y-1 py-2">
                        {loadingLikers ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                            </div>
                        ) : likersList.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 py-4">No reactions yet</p>
                        ) : (
                            likersList.map((user) => (
                                <div key={user.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div className="relative">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user.image || undefined} />
                                            <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full ${getReactionBg(user.reactionType)} text-[8px] border border-white dark:border-gray-950`} title={user.reactionType}>
                                            {getReactionEmoji(user.reactionType)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name || "Anonymous"}</p>
                                        <p className="text-xs text-gray-500 capitalize">{user.reactionType}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Image Modal - Shows full image, post info, and links */}
            <Dialog open={imageModalOpen} onOpenChange={(open) => {
                if (!open) { setImageModalOpen(false); setImageModalPost(null); }
            }}>
                <DialogContent className="max-w-[98vw] sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] p-0 overflow-hidden">
                    {imageModalPost && (() => {
                        const allImages = [
                            ...(imageModalPost.image ? [imageModalPost.image] : []),
                            ...(imageModalPost.images || []),
                        ];
                        const currentImage = allImages[imageModalIndex] || allImages[0];
                        const hasMultiple = allImages.length > 1;

                        return (
                            <div className="flex flex-col md:flex-row h-full max-h-[93vh] sm:max-h-[85vh]">
                                {/* Image Section */}
                                <div className="relative flex-1 bg-black flex items-center justify-center min-h-[200px] sm:min-h-[300px] md:min-h-[400px]">
                                    {currentImage && (
                                        <Image
                                            src={currentImage}
                                            alt="Post attachment"
                                            width={800}
                                            height={600}
                                            className="max-w-full max-h-[50vh] sm:max-h-[60vh] md:max-h-[80vh] object-contain"
                                            unoptimized
                                        />
                                    )}
                                    {/* Navigation arrows */}
                                    {hasMultiple && (
                                        <>
                                            <button
                                                onClick={() => setImageModalIndex((prev) => (prev - 1 + allImages.length) % allImages.length)}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                                            >
                                                <ChevronLeftIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setImageModalIndex((prev) => (prev + 1) % allImages.length)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                                            >
                                                <ChevronRightIcon className="h-5 w-5" />
                                            </button>
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                                                {imageModalIndex + 1} / {allImages.length}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Post Info Sidebar */}
                                <div className="w-full md:w-[280px] lg:w-[320px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-y-auto max-h-[35vh] sm:max-h-[40vh] md:max-h-none">
                                    {/* Author Header */}
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700">
                                                <AvatarImage src={imageModalPost.user.image || undefined} alt={imageModalPost.user.name || ""} />
                                                <AvatarFallback className="bg-blue-700 text-white text-sm font-semibold">
                                                    {getInitials(imageModalPost.user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                    {imageModalPost.user.name || "Anonymous"}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {imageModalPost.user.profession || "Community Member"}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    {formatDate(imageModalPost.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Post Content */}
                                    {imageModalPost.content && (
                                        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                                {renderPostContent(imageModalPost.content)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Tags */}
                                    {imageModalPost.tags && imageModalPost.tags.length > 0 && (
                                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5">
                                            {imageModalPost.tags.map((tag, idx) => (
                                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-medium">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Link Preview Card */}
                                    {imageModalPost.linkUrl && (
                                        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                                            <LinkPreviewCard
                                                url={imageModalPost.linkUrl}
                                                linkType={imageModalPost.linkType}
                                                hasMedia={postHasMedia(imageModalPost)}
                                            />
                                        </div>
                                    )}

                                    {/* Engagement Stats */}
                                    <div className="p-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                        {imageModalPost._count.likes > 0 && (
                                            <span className="flex items-center gap-1">
                                                <ThumbsUpIcon className="h-3.5 w-3.5 text-blue-600" />
                                                {imageModalPost._count.likes} {imageModalPost._count.likes === 1 ? "like" : "likes"}
                                            </span>
                                        )}
                                        {imageModalPost._count.comments > 0 && (
                                            <span>{imageModalPost._count.comments} comment{imageModalPost._count.comments !== 1 ? "s" : ""}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
