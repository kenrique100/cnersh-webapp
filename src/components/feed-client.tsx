"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    MessageCircleIcon,
    SendIcon,
    TrashIcon,
    PenIcon,
    ImageIcon,
    VideoIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    ShareIcon,
    FlagIcon,
    XIcon,
    SmileIcon,
    ReplyIcon,
    PencilIcon,
    Loader2,
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
import { createPost, toggleLike, addComment, deletePost, getPostComments, toggleCommentLike, editComment, deleteComment, searchUsers, getPostLikers } from "@/app/actions/feed";
import { createReport } from "@/app/actions/admin";
import ImageUpload from "@/components/image-upload";

interface PostUser {
    id: string;
    name: string | null;
    image: string | null;
    role?: string | null;
}

interface CommentLikeData {
    userId: string;
    isDislike: boolean;
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
    createdAt: Date;
    user: PostUser;
    _count: { comments: number; likes: number };
    likes: { userId: string }[];
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
];

const MENTION_SEARCH_DEBOUNCE_MS = 200;

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

        if (file.size > 32 * 1024 * 1024) {
            toast.error("Video must be less than 32MB");
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
                const data = await res.json();
                throw new Error(data.error || "Upload failed");
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
                        <span className="text-xs text-gray-400 dark:text-gray-500">Videos up to 32MB</span>
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

    // @mention autocomplete state
    const [mentionResults, setMentionResults] = React.useState<{ id: string; name: string | null; image: string | null }[]>([]);
    const [showMentionDropdown, setShowMentionDropdown] = React.useState<string | null>(null); // postId or "new-post"
    const mentionSearchTimeout = React.useRef<NodeJS.Timeout | null>(null);

    // Likers dialog state
    const [likersPostId, setLikersPostId] = React.useState<string | null>(null);
    const [likersList, setLikersList] = React.useState<{ id: string; name: string | null; image: string | null }[]>([]);
    const [loadingLikers, setLoadingLikers] = React.useState(false);

    const currentUserInitials = currentUserName
        ? currentUserName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

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
            });
            setNewPostContent("");
            setNewPostImage(null);
            setNewPostVideo(null);
            setNewPostImages([]);
            setNewPostVideos([]);
            setNewPostTags([]);
            setTagInput("");
            setShowImageUpload(false);
            setShowVideoUpload(false);
            toast.success("Post published successfully");
            router.refresh();
        } catch {
            toast.error("Failed to create post");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = async (postId: string) => {
        try {
            const result = await toggleLike(postId);
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? {
                              ...p,
                              _count: {
                                  ...p._count,
                                  likes: result.liked
                                      ? p._count.likes + 1
                                      : p._count.likes - 1,
                              },
                              likes: result.liked
                                  ? [...p.likes, { userId: currentUserId }]
                                  : p.likes.filter((l) => l.userId !== currentUserId),
                          }
                        : p
                )
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

    const handleCommentLike = async (postId: string, commentId: string, isDislike: boolean = false) => {
        try {
            await toggleCommentLike(commentId, isDislike);
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

    const formatDate = (date: Date) => {
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
    };

    const formatFullDate = (date: Date) => {
        const postDate = new Date(date);
        return postDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const [sharePostId, setSharePostId] = React.useState<string | null>(null);

    const renderPostContent = (content: string) => {
        // Split on URLs, @mentions, and #hashtags
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const combinedRegex = /(https?:\/\/[^\s]+)|(@\w[\w]*)|(\#\w+)/g;
        const result: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        while ((match = combinedRegex.exec(content)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                result.push(content.slice(lastIndex, match.index));
            }
            const matchStr = match[0];
            if (matchStr.match(urlRegex)) {
                result.push(
                    <a key={match.index} href={matchStr} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-medium hover:underline break-all">
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
                    <span key={match.index} className="text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline">
                        {matchStr}
                    </span>
                );
            }
            lastIndex = match.index + matchStr.length;
        }
        if (lastIndex < content.length) {
            result.push(content.slice(lastIndex));
        }
        return result.length > 0 ? result : content;
    };

    const handleShare = (post: PostData) => {
        setSharePostId(post.id);
    };

    const handleShareTo = (platform: string, post: PostData) => {
        const shareUrl = typeof window !== "undefined" ? window.location.origin + "/feeds" : "";
        const shareText = encodeURIComponent(post.content.substring(0, 200));
        const encodedUrl = encodeURIComponent(shareUrl);

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

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4">
            {/* Create Post Card - LinkedIn Style */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm rounded-xl">
                <CardContent className="p-4">
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
                                    className="min-h-[80px] resize-none border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-950 transition-colors text-sm"
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
                                        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-[calc(50%-4px)]">
                                            <Image
                                                src={newPostImage}
                                                alt="Upload preview"
                                                width={300}
                                                height={200}
                                                className="w-full h-[150px] object-cover"
                                                unoptimized
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setNewPostImage(null)}
                                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors cursor-pointer"
                                                title="Remove image"
                                            >
                                                <XIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}
                                    {newPostImages.map((img, idx) => (
                                        <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-[calc(50%-4px)]">
                                            <Image
                                                src={img}
                                                alt={`Upload preview ${idx + 1}`}
                                                width={300}
                                                height={200}
                                                className="w-full h-[150px] object-cover"
                                                unoptimized
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setNewPostImages((prev) => prev.filter((_, i) => i !== idx))}
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
                                            <video src={newPostVideo} controls className="w-full max-h-[200px] object-contain bg-black" />
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
                                            <video src={vid} controls className="w-full max-h-[200px] object-contain bg-black" />
                                            <button
                                                type="button"
                                                onClick={() => setNewPostVideos((prev) => prev.filter((_, i) => i !== idx))}
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
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowVideoUpload(false);
                                            setShowImageUpload(!showImageUpload);
                                        }}
                                        className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 h-9 px-3 rounded-lg"
                                    >
                                        <ImageIcon className="h-4 w-4 mr-1.5" />
                                        <span className="text-xs font-medium">Photo</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowImageUpload(false);
                                            setShowVideoUpload(!showVideoUpload);
                                        }}
                                        className="text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 h-9 px-3 rounded-lg"
                                    >
                                        <VideoIcon className="h-4 w-4 mr-1.5" />
                                        <span className="text-xs font-medium">Video</span>
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
                    <CardContent className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <PenIcon className="h-7 w-7 text-gray-400" />
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
                    const isLiked = post.likes.some((l) => l.userId === currentUserId);
                    const userInitials = post.user.name
                        ? post.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                        : "U";

                    return (
                        <Card
                            key={post.id}
                            className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Post Header */}
                            <div className="p-4 pb-0">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-gray-200 dark:border-gray-700">
                                            <AvatarImage
                                                src={post.user.image || undefined}
                                                alt={post.user.name || ""}
                                            />
                                            <AvatarFallback className="bg-blue-700 text-white text-sm font-semibold">
                                                {userInitials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                                                {post.user.name || "Anonymous"}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                Community Member
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5" title={formatFullDate(post.createdAt)}>
                                                {formatDate(post.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
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
                                    </div>
                                </div>
                            </div>

                            {/* Post Content */}
                            {post.content && (
                                <div className="px-4 py-3">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                        {renderPostContent(post.content)}
                                    </p>
                                </div>
                            )}

                            {/* Post Tags */}
                            {post.tags && post.tags.length > 0 && (
                                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                                    {post.tags.map((tag, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-medium">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Post Image(s) */}
                            {(post.image || (post.images && post.images.length > 0)) && (
                                <div className="border-t border-b border-gray-100 dark:border-gray-800">
                                    {(() => {
                                        const allImages = [
                                            ...(post.image ? [post.image] : []),
                                            ...(post.images || []),
                                        ];
                                        if (allImages.length === 1) {
                                            return (
                                                <Image
                                                    src={allImages[0]}
                                                    alt="Post attachment"
                                                    width={700}
                                                    height={400}
                                                    className="w-full object-cover max-h-[500px]"
                                                    unoptimized
                                                />
                                            );
                                        }
                                        return (
                                            <div className="grid gap-1 grid-cols-2">
                                                {allImages.map((img, idx) => (
                                                    <Image
                                                        key={idx}
                                                        src={img}
                                                        alt={`Post attachment ${idx + 1}`}
                                                        width={350}
                                                        height={250}
                                                        className={`w-full object-cover ${allImages.length > 1 ? "max-h-[250px]" : "max-h-[500px]"} ${idx === 0 && allImages.length === 3 ? "col-span-2" : ""}`}
                                                        unoptimized
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Post Video(s) */}
                            {(post.video || (post.videos && post.videos.length > 0)) && (
                                <div className="border-t border-b border-gray-100 dark:border-gray-800 space-y-1">
                                    {post.video && (
                                        <video
                                            src={post.video}
                                            controls
                                            className="w-full max-h-[500px] object-contain bg-black"
                                        />
                                    )}
                                    {(post.videos || []).map((vid, idx) => (
                                        <video
                                            key={idx}
                                            src={vid}
                                            controls
                                            className="w-full max-h-[500px] object-contain bg-black"
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Engagement Stats */}
                            {(post._count.likes > 0 || post._count.comments > 0) && (
                                <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        {post._count.likes > 0 && (
                                            <button
                                                onClick={() => handleShowLikers(post.id)}
                                                className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                                            >
                                                <span className="flex items-center justify-center w-4 h-4 bg-blue-600 rounded-full">
                                                    <ThumbsUpIcon className="h-2.5 w-2.5 text-white" />
                                                </span>
                                                <span>{post._count.likes} {post._count.likes === 1 ? "like" : "likes"}</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {post._count.comments > 0 && (
                                            <button
                                                onClick={() => toggleComments(post.id)}
                                                className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                                            >
                                                {post._count.comments} comment{post._count.comments !== 1 ? "s" : ""}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons - LinkedIn Style */}
                            <div className="border-t border-gray-100 dark:border-gray-800 px-2 py-1">
                                <div className="flex items-center justify-around">
                                    <button
                                        onClick={() => handleLike(post.id)}
                                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full justify-center ${
                                            isLiked
                                                ? "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        <ThumbsUpIcon className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                                        <span className="hidden sm:inline">Like</span>
                                    </button>
                                    <button
                                        onClick={() => toggleComments(post.id)}
                                        className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center"
                                    >
                                        <MessageCircleIcon className="h-4 w-4" />
                                        <span className="hidden sm:inline">Comment</span>
                                    </button>
                                    <button
                                        className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center"
                                        onClick={() => handleShare(post)}
                                    >
                                        <ShareIcon className="h-4 w-4" />
                                        <span className="hidden sm:inline">Share</span>
                                    </button>
                                </div>
                            </div>

                            {/* Comments Section */}
                            {expandedComments.has(post.id) && (
                                <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-3">
                                    {(postComments[post.id] || []).map((comment) => {
                                        const commentInitials = comment.user.name
                                            ? comment.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                                            : "U";
                                        const isCommentAuthor = comment.user.id === currentUserId;
                                        const isPostAuthor = comment.user.id === post.user.id;
                                        const isCommentAdmin = comment.user.role === "admin" || comment.user.role === "superadmin";
                                        const likes = (comment.commentLikes || []).filter((l) => !l.isDislike);
                                        const dislikes = (comment.commentLikes || []).filter((l) => l.isDislike);
                                        const userLiked = likes.some((l) => l.userId === currentUserId);
                                        const userDisliked = dislikes.some((l) => l.userId === currentUserId);

                                        return (
                                            <div key={comment.id} className="space-y-2">
                                                <div className="flex gap-2.5">
                                                    <Avatar className="h-8 w-8 shrink-0">
                                                        <AvatarImage src={comment.user.image || undefined} />
                                                        <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 font-medium">
                                                            {commentInitials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                                                    {comment.user.name || "Anonymous"}
                                                                </p>
                                                                {isPostAuthor && (
                                                                    <Badge className="text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 leading-4">Author</Badge>
                                                                )}
                                                                {isCommentAdmin && (
                                                                    <Badge className="text-[9px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 leading-4">Admin</Badge>
                                                                )}
                                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                                                                    {formatDate(comment.createdAt)}
                                                                </p>
                                                            </div>
                                                            {editingCommentId === comment.id ? (
                                                                <div className="mt-1 flex items-center gap-2">
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
                                                                                    <button key={emoji} type="button" onClick={() => setEditingCommentContent((prev) => prev + emoji)} className="text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1 cursor-pointer">{emoji}</button>
                                                                                ))}
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleEditComment(post.id, comment.id)}>Save</Button>
                                                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditingCommentId(null); setEditingCommentContent(""); }}>Cancel</Button>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed whitespace-pre-wrap">
                                                                    {renderPostContent(comment.content)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {/* Comment Actions */}
                                                        <div className="flex items-center gap-3 mt-1 px-1">
                                                            <button onClick={() => handleCommentLike(post.id, comment.id, false)} className={`flex items-center gap-1 text-xs transition-colors ${userLiked ? "text-blue-600" : "text-gray-500 hover:text-blue-600"}`}>
                                                                <ThumbsUpIcon className={`h-3 w-3 ${userLiked ? "fill-current" : ""}`} />
                                                                {likes.length > 0 && <span>{likes.length}</span>}
                                                            </button>
                                                            <button onClick={() => handleCommentLike(post.id, comment.id, true)} className={`flex items-center gap-1 text-xs transition-colors ${userDisliked ? "text-red-600" : "text-gray-500 hover:text-red-600"}`}>
                                                                <ThumbsDownIcon className={`h-3 w-3 ${userDisliked ? "fill-current" : ""}`} />
                                                                {dislikes.length > 0 && <span>{dislikes.length}</span>}
                                                            </button>
                                                            <button onClick={() => {
                                                                const userName = comment.user.name || "Anonymous";
                                                                setReplyingTo((prev) => ({ ...prev, [post.id]: { id: comment.id, name: userName } }));
                                                                setCommentTexts((prev) => ({ ...prev, [post.id]: `@${userName.replace(/\s+/g, "")} ` }));
                                                            }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                                                                <ReplyIcon className="h-3 w-3" />
                                                                Reply{comment.replies && comment.replies.length > 0 ? ` (${comment.replies.length})` : ""}
                                                            </button>
                                                            {isCommentAuthor && (
                                                                <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentContent(comment.content); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors">
                                                                    <PencilIcon className="h-3 w-3" />
                                                                    Edit
                                                                </button>
                                                            )}
                                                            {(isCommentAuthor || isAdmin) && (
                                                                <button onClick={() => handleDeleteComment(post.id, comment.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors">
                                                                    <TrashIcon className="h-3 w-3" />
                                                                    Delete
                                                                </button>
                                                            )}
                                                            {!isCommentAuthor && (
                                                                <button onClick={() => setReportingCommentId(comment.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition-colors">
                                                                    <FlagIcon className="h-3 w-3" />
                                                                    Report
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Replies */}
                                                        {(comment.replies || []).map((reply) => {
                                                            const replyInitials = reply.user.name
                                                                ? reply.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                                                                : "U";
                                                            const isReplyAuthor = reply.user.id === currentUserId;
                                                            const isReplyPostAuthor = reply.user.id === post.user.id;
                                                            const isReplyAdmin = reply.user.role === "admin" || reply.user.role === "superadmin";
                                                            const rLikes = (reply.commentLikes || []).filter((l) => !l.isDislike);
                                                            const rDislikes = (reply.commentLikes || []).filter((l) => l.isDislike);
                                                            const rUserLiked = rLikes.some((l) => l.userId === currentUserId);
                                                            const rUserDisliked = rDislikes.some((l) => l.userId === currentUserId);

                                                            return (
                                                                <div key={reply.id} className="flex gap-2 mt-2 ml-6">
                                                                    <Avatar className="h-6 w-6 shrink-0">
                                                                        <AvatarImage src={reply.user.image || undefined} />
                                                                        <AvatarFallback className="text-[10px] bg-gray-200 dark:bg-gray-700 font-medium">{replyInitials}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-2.5 py-1.5">
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100">{reply.user.name || "Anonymous"}</p>
                                                                                {isReplyPostAuthor && <Badge className="text-[8px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 leading-3">Author</Badge>}
                                                                                {isReplyAdmin && <Badge className="text-[8px] px-1 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 leading-3">Admin</Badge>}
                                                                                <span className="text-[9px] text-gray-400 ml-auto">{formatDate(reply.createdAt)}</span>
                                                                            </div>
                                                                            {editingCommentId === reply.id ? (
                                                                                <div className="mt-1 flex gap-1">
                                                                                    <input type="text" value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleEditComment(post.id, reply.id); if (e.key === "Escape") { setEditingCommentId(null); setEditingCommentContent(""); } }} className="flex-1 text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                                                                                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => handleEditComment(post.id, reply.id)}>Save</Button>
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">{renderPostContent(reply.content)}</p>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-0.5 px-1">
                                                                            <button onClick={() => handleCommentLike(post.id, reply.id, false)} className={`flex items-center gap-0.5 text-[10px] ${rUserLiked ? "text-blue-600" : "text-gray-500 hover:text-blue-600"}`}>
                                                                                <ThumbsUpIcon className={`h-2.5 w-2.5 ${rUserLiked ? "fill-current" : ""}`} />
                                                                                {rLikes.length > 0 && rLikes.length}
                                                                            </button>
                                                                            <button onClick={() => handleCommentLike(post.id, reply.id, true)} className={`flex items-center gap-0.5 text-[10px] ${rUserDisliked ? "text-red-600" : "text-gray-500 hover:text-red-600"}`}>
                                                                                <ThumbsDownIcon className={`h-2.5 w-2.5 ${rUserDisliked ? "fill-current" : ""}`} />
                                                                                {rDislikes.length > 0 && rDislikes.length}
                                                                            </button>
                                                                            {isReplyAuthor && <button onClick={() => { setEditingCommentId(reply.id); setEditingCommentContent(reply.content); }} className="text-[10px] text-gray-500 hover:text-green-600">Edit</button>}
                                                                            {(isReplyAuthor || isAdmin) && <button onClick={() => handleDeleteComment(post.id, reply.id)} className="text-[10px] text-gray-500 hover:text-red-600">Delete</button>}
                                                                            {!isReplyAuthor && <button onClick={() => setReportingCommentId(reply.id)} className="text-[10px] text-gray-500 hover:text-orange-600">Report</button>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

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
                                                    className="flex-1 h-9 px-4 text-sm rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
                                                                <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{(user.name || "U")[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
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

            {/* Share Dialog */}
            <Dialog open={sharePostId !== null} onOpenChange={(open) => {
                if (!open) setSharePostId(null);
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Share Post</DialogTitle>
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
                        <DialogTitle>People who liked this</DialogTitle>
                        <DialogDescription>
                            {likersList.length} {likersList.length === 1 ? "person" : "people"} liked this post
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto space-y-1 py-2">
                        {loadingLikers ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                            </div>
                        ) : likersList.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 py-4">No likes yet</p>
                        ) : (
                            likersList.map((user) => (
                                <div key={user.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={user.image || undefined} />
                                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                            {(user.name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name || "Anonymous"}</p>
                                        <p className="text-xs text-gray-500">Member</p>
                                    </div>
                                    <div className="ml-auto">
                                        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full">
                                            <ThumbsUpIcon className="h-3 w-3 text-white" />
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
