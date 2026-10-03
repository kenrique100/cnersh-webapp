"use client";

import React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
    MessageCircleIcon,
    MessageCircleOffIcon,
    TrashIcon,
    FlagIcon,
    PencilIcon,
    ImageIcon,
    VideoIcon,
    LinkIcon,
    XIcon,
} from "lucide-react";
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
    postHasMedia,
} from "@/components/post-card";
import { ReactionsPicker } from "@/components/reactions-picker";
import { createReport } from "@/app/actions/admin";
import {
    getPostComments,
    addComment,
    toggleCommentLike,
    editComment,
    deleteComment,
} from "@/app/actions/feed";
import CommentThread, { type CommentData } from "./comment-thread";
import { cn } from "@/lib/utils";

/* Lazy: not needed until the user opens the video upload control. */
const VideoUploadInput = dynamic(() => import("./video-upload-input"), {
    ssr: false,
    loading: () => (
        <div className="h-24 animate-pulse rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
    ),
});

function extractUploadThingKey(url: string): string | null {
    const match = url.match(/\/f\/([^/?]+)/);
    return match ? match[1] : null;
}

async function deleteBlobUrl(url: string) {
    try {
        if (!url.includes(".ufs.sh/") && !url.includes(".utfs.io/")) return;
        const storageKey = extractUploadThingKey(url);
        if (!storageKey) return;
        await fetch("/api/delete-blob", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, storageKey }),
        });
    } catch {
        /* best effort */
    }
}

export interface PostUser {
    id: string;
    name: string | null;
    image: string | null;
    role?: string | null;
    profession?: string | null;
    professionOther?: string | null;
}

export interface PostData {
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
    createdAt: string;
    user: PostUser;
    _count: { comments: number; likes: number };
    likes: { userId: string; reactionType: string; userName?: string | null }[];
    recentActivity?: {
        users: { id: string; name: string | null; image: string | null }[];
        likeCount: number;
        commentCount: number;
    };
    isUnread?: boolean;
}

interface PostItemProps {
    post: PostData;
    shareCount: number;
    currentUser: {
        id: string;
        name: string | null;
        image: string | null;
        gender: string | null;
    };
    isAdmin: boolean;
    onLike: (postId: string, reactionType: string) => Promise<void>;
    onDelete: (postId: string) => Promise<void>;
    onUpdate: (postId: string, updates: Partial<PostData>) => void;
    onToggleCommentsEnabled: (postId: string) => Promise<void>;
    onCommentAdded: (postId: string) => void;
    onCommentDeleted: (postId: string) => void;
    onShowLikers: (postId: string) => void;
    onShare: (post: PostData) => void;
    onOpenImageModal: (post: PostData, imageIndex: number) => void;
}

export default function PostItem({
                                     post,
                                     shareCount,
                                     currentUser,
                                     isAdmin,
                                     onLike,
                                     onDelete,
                                     onUpdate,
                                     onToggleCommentsEnabled,
                                     onCommentAdded,
                                     onCommentDeleted,
                                     onShowLikers,
                                     onShare,
                                     onOpenImageModal,
                                 }: PostItemProps) {
    const [expanded, setExpanded] = React.useState(false);
    const [comments, setComments] = React.useState<CommentData[]>([]);
    const [loadingComments, setLoadingComments] = React.useState(false);
    /**
     * Tracks whether the comments for this post have already been fetched
     * (successfully) at least once. `comments.length === 0` is not a reliable
     * signal — a post legitimately has zero comments, and we must not refetch
     * on every expand in that case.
     */
    const [hasLoadedComments, setHasLoadedComments] = React.useState(false);

    const [editingPost, setEditingPost] = React.useState(false);
    const [editContent, setEditContent] = React.useState("");
    const [editImages, setEditImages] = React.useState<string[]>([]);
    const [editVideos, setEditVideos] = React.useState<string[]>([]);
    const [editTags, setEditTags] = React.useState<string[]>([]);
    const [editTagInput, setEditTagInput] = React.useState("");
    const [editLinkUrl, setEditLinkUrl] = React.useState("");
    const [editLinkType, setEditLinkType] = React.useState<string>(DEFAULT_LINK_TYPE);
    const [editShowImageUpload, setEditShowImageUpload] = React.useState(false);
    const [editShowVideoUpload, setEditShowVideoUpload] = React.useState(false);
    const [editShowLinkInput, setEditShowLinkInput] = React.useState(false);

    const [reportingPost, setReportingPost] = React.useState(false);
    const [reportCategory, setReportCategory] = React.useState("");
    const [reportReason, setReportReason] = React.useState("");

    const userReaction = post.likes.find((l) => l.userId === currentUser.id)?.reactionType;
    const isOwnPost = post.user.id === currentUser.id;

    /**
     * Compute once. `post.commentsEnabled` is `boolean | undefined`; a `true`
     * value means comments are open. Reading the field directly inside nested
     * JSX branches would narrow it to `true | undefined` and make later
     * comparisons against `false` fail with TS2367.
     */
    const commentsEnabled = post.commentsEnabled !== false;

    const toggleComments = async () => {
        const isExpanded = expanded;

        // Flip `expanded` *before* the await so that the loading state renders
        // on the same tick as the click. Doing this after the await would keep
        // the comment section hidden while the fetch is in flight.
        setExpanded((prev) => !prev);

        if (!isExpanded && !hasLoadedComments) {
            setLoadingComments(true);
            try {
                const fetched = (await getPostComments(post.id)) as unknown as CommentData[];
                setComments(fetched);
                setHasLoadedComments(true);
            } catch {
                toast.error("Failed to load comments");
            } finally {
                setLoadingComments(false);
            }
        }
    };

    const handleStartEdit = () => {
        setEditingPost(true);
        setEditContent(post.content);
        setEditImages(post.images || []);
        setEditVideos(post.videos || []);
        setEditTags(post.tags || []);
        setEditLinkUrl(post.linkUrl || "");
        setEditLinkType(post.linkType || DEFAULT_LINK_TYPE);
        setEditShowImageUpload(false);
        setEditShowVideoUpload(false);
        setEditShowLinkInput(false);
    };

    const handleCancelEdit = () => {
        setEditingPost(false);
        setEditContent("");
        setEditImages([]);
        setEditVideos([]);
        setEditTags([]);
        setEditTagInput("");
        setEditLinkUrl("");
        setEditShowImageUpload(false);
        setEditShowVideoUpload(false);
        setEditShowLinkInput(false);
    };

    const handleSaveEdit = async () => {
        if (!editContent.trim()) return;
        try {
            const { updatePost } = await import("@/app/actions/feed");
            await updatePost(post.id, {
                content: editContent,
                images: editImages,
                videos: editVideos,
                tags: editTags,
                linkUrl: editLinkUrl.trim() || undefined,
                linkType: editLinkUrl.trim() ? editLinkType : undefined,
            });
            onUpdate(post.id, {
                content: editContent,
                images: editImages,
                videos: editVideos,
                tags: editTags,
                linkUrl: editLinkUrl.trim() || null,
                linkType: editLinkUrl.trim() ? editLinkType : null,
            });
            handleCancelEdit();
            toast.success("Post updated");
        } catch {
            toast.error("Failed to update post");
        }
    };

    const submitReport = async () => {
        if (!reportCategory) return;
        const fullReason =
            reportCategory + (reportReason.trim() ? `: ${reportReason.trim()}` : "");
        try {
            await createReport({
                contentType: "POST",
                contentId: post.id,
                reason: fullReason,
            });
            toast.success("Report submitted successfully");
            setReportingPost(false);
            setReportCategory("");
            setReportReason("");
        } catch {
            toast.error("Failed to submit report");
        }
    };

    /* ---- Comment thread handlers ---------------------------------------- */

    const handleAddComment = async (postId: string, content: string, parentId?: string) => {
        try {
            const created = (await addComment(postId, content, parentId)) as unknown as CommentData;
            if (parentId) {
                setComments((prev) =>
                    prev.map((c) =>
                        c.id === parentId
                            ? {
                                ...c,
                                replies: [
                                    ...(c.replies || []),
                                    {
                                        ...created,
                                        replies: [],
                                        commentLikes: [],
                                        _count: { commentLikes: 0, replies: 0 },
                                    },
                                ],
                                _count: {
                                    commentLikes: c._count?.commentLikes || 0,
                                    replies: (c._count?.replies || 0) + 1,
                                },
                            }
                            : c,
                    ),
                );
            } else {
                setComments((prev) => [
                    ...prev,
                    {
                        ...created,
                        replies: [],
                        commentLikes: [],
                        _count: { commentLikes: 0, replies: 0 },
                    },
                ]);
            }
            onCommentAdded(postId);
        } catch {
            toast.error("Failed to add comment");
        }
    };

    const handleEditComment = async (postId: string, commentId: string, content: string) => {
        try {
            await editComment(commentId, content);
            setComments((prev) =>
                prev.map((c) =>
                    c.id === commentId
                        ? { ...c, content }
                        : {
                            ...c,
                            replies: (c.replies || []).map((r) =>
                                r.id === commentId ? { ...r, content } : r,
                            ),
                        },
                ),
            );
            toast.success("Comment updated");
        } catch {
            toast.error("Failed to edit comment");
        }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        try {
            await deleteComment(commentId);
            setComments((prev) =>
                prev
                    .filter((c) => c.id !== commentId)
                    .map((c) => ({
                        ...c,
                        replies: (c.replies || []).filter((r) => r.id !== commentId),
                    })),
            );
            onCommentDeleted(postId);
            toast.success("Comment removed");
        } catch {
            toast.error("Failed to delete comment");
        }
    };

    const handleCommentLike = async (
        postId: string,
        commentId: string,
        isDislike: boolean,
        reactionType: string,
    ) => {
        try {
            await toggleCommentLike(commentId, isDislike, reactionType);
            const fetched = (await getPostComments(postId)) as unknown as CommentData[];
            setComments(fetched);
        } catch {
            toast.error("Failed to react to comment");
        }
    };

    return (
        <div data-post-id={post.id} className="space-y-0">
            {post.recentActivity && post.recentActivity.users.length > 0 && (
                <PostContextBar
                    users={post.recentActivity.users}
                    likeCount={post.recentActivity.likeCount}
                    commentCount={post.recentActivity.commentCount}
                />
            )}
            <PostCard isUnread={post.isUnread}>
                <PostHeader
                    userName={post.user.name}
                    userImage={post.user.image}
                    userProfession={post.user.profession}
                    userProfessionOther={post.user.professionOther}
                    createdAt={post.createdAt}
                    actions={
                        <div className="flex items-center gap-0.5 -mr-1">
                            {!isOwnPost && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 rounded-full"
                                    onClick={() => setReportingPost(true)}
                                    title="Report post"
                                >
                                    <FlagIcon className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            {isOwnPost && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 rounded-full",
                                        !commentsEnabled
                                            ? "text-orange-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950"
                                            : "text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950",
                                    )}
                                    onClick={() => void onToggleCommentsEnabled(post.id)}
                                    title={
                                        !commentsEnabled
                                            ? "Enable comments"
                                            : "Disable comments"
                                    }
                                >
                                    {!commentsEnabled ? (
                                        <MessageCircleOffIcon className="h-3.5 w-3.5" />
                                    ) : (
                                        <MessageCircleIcon className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            )}
                            {isOwnPost && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-full"
                                    onClick={handleStartEdit}
                                    title="Edit post"
                                >
                                    <PencilIcon className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            {(isOwnPost || isAdmin) && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-full"
                                    onClick={() => void onDelete(post.id)}
                                    title="Delete post"
                                >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    }
                />

                {(post.content || editingPost) && (
                    <PostTextContent
                        content={post.content}
                        customRender={
                            editingPost ? (
                                <div className="space-y-2.5">
                                    <Textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="min-h-[72px] resize-none border-gray-200 dark:border-gray-700 rounded-xl text-base"
                                    />
                                    {editImages.length > 0 && (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {editImages.map((img, idx) => (
                                                <div
                                                    key={idx}
                                                    className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                                                >
                                                    <Image
                                                        src={img}
                                                        alt=""
                                                        width={200}
                                                        height={120}
                                                        className="w-full h-[110px] object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void deleteBlobUrl(img);
                                                            setEditImages((prev) =>
                                                                prev.filter((_, i) => i !== idx),
                                                            );
                                                        }}
                                                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white"
                                                    >
                                                        <XIcon className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {editVideos.length > 0 && (
                                        <div className="space-y-1.5">
                                            {editVideos.map((vid, idx) => (
                                                <div
                                                    key={idx}
                                                    className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                                                >
                                                    <video
                                                        src={vid}
                                                        controls
                                                        className="w-full max-h-[110px] sm:max-h-[140px] object-contain bg-black"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void deleteBlobUrl(vid);
                                                            setEditVideos((prev) =>
                                                                prev.filter((_, i) => i !== idx),
                                                            );
                                                        }}
                                                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white"
                                                    >
                                                        <XIcon className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {editShowImageUpload && (
                                        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900">
                                            <ImageUpload
                                                variant="feed"
                                                onChange={(url) => {
                                                    if (url) {
                                                        setEditImages((prev) => [...prev, url]);
                                                        setEditShowImageUpload(false);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                    {editShowVideoUpload && (
                                        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900">
                                            <VideoUploadInput
                                                onUpload={(url) => {
                                                    setEditVideos((prev) => [...prev, url]);
                                                    setEditShowVideoUpload(false);
                                                }}
                                            />
                                        </div>
                                    )}
                                    {editShowLinkInput && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="url"
                                                    placeholder="Enter URL..."
                                                    value={editLinkUrl}
                                                    onChange={(e) => setEditLinkUrl(e.target.value)}
                                                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setEditShowLinkInput(false)}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <XIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                                    Button label:
                                                </span>
                                                <select
                                                    value={editLinkType}
                                                    onChange={(e) => setEditLinkType(e.target.value)}
                                                    className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    {CTA_LINK_TYPES.map((t) => (
                                                        <option key={t.value} value={t.value}>
                                                            {t.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                    {editLinkUrl && !editShowLinkInput && (
                                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                                            <LinkIcon className="h-3 w-3" />
                                            <span className="truncate">{editLinkUrl}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditLinkUrl("");
                                                    setEditLinkType(DEFAULT_LINK_TYPE);
                                                }}
                                                className="text-gray-400 hover:text-red-500 ml-auto"
                                            >
                                                <XIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}
                                    {editTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {editTags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-xs gap-1">
                                                    #{tag}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditTags((prev) => prev.filter((t) => t !== tag))
                                                        }
                                                        className="hover:text-red-500"
                                                    >
                                                        <XIcon className="h-2.5 w-2.5" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add tag..."
                                            value={editTagInput}
                                            onChange={(e) => setEditTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && editTagInput.trim()) {
                                                    e.preventDefault();
                                                    const tag = editTagInput.trim().replace(/^#/, "");
                                                    if (tag && !editTags.includes(tag))
                                                        setEditTags((prev) => [...prev, tag]);
                                                    setEditTagInput("");
                                                }
                                            }}
                                            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="flex items-center gap-0.5 border-t border-gray-100 dark:border-gray-800 pt-1.5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditShowImageUpload(!editShowImageUpload);
                                                setEditShowVideoUpload(false);
                                            }}
                                            className="h-7 px-1.5 text-xs text-gray-500 hover:text-blue-600"
                                        >
                                            <ImageIcon className="h-3.5 w-3.5 mr-1" /> Image
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditShowVideoUpload(!editShowVideoUpload);
                                                setEditShowImageUpload(false);
                                            }}
                                            className="h-7 px-1.5 text-xs text-gray-500 hover:text-blue-600"
                                        >
                                            <VideoIcon className="h-3.5 w-3.5 mr-1" /> Video
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditShowLinkInput(!editShowLinkInput)}
                                            className="h-7 px-1.5 text-xs text-gray-500 hover:text-blue-600"
                                        >
                                            <LinkIcon className="h-3.5 w-3.5 mr-1" /> Link
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCancelEdit}
                                            className="rounded-lg h-8"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveEdit}
                                            disabled={!editContent.trim()}
                                            className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg h-8"
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            ) : undefined
                        }
                    />
                )}

                {!editingPost && <PostTags tags={post.tags} />}

                {!editingPost &&
                    (post.image ||
                        (post.images && post.images.length > 0) ||
                        post.video ||
                        (post.videos && post.videos.length > 0)) && (
                        <PostMediaContent
                            image={post.image}
                            images={post.images}
                            video={post.video}
                            videos={post.videos}
                            onImageClick={(idx) => onOpenImageModal(post, idx)}
                        />
                    )}

                {!editingPost && post.linkUrl && (
                    <div className="px-3 sm:px-4 py-1.5">
                        <LinkPreviewCard
                            url={post.linkUrl ?? undefined}
                            linkType={post.linkType ?? undefined}
                            hasMedia={postHasMedia(post)}
                        />
                    </div>
                )}

                <PostEngagementSummary
                    likeCount={post._count.likes}
                    commentCount={post._count.comments}
                    shareCount={shareCount}
                    reactionTypes={post.likes.map((l) => l.reactionType)}
                    reactionUsers={post.likes.map((l) => ({
                        userId: l.userId,
                        reactionType: l.reactionType,
                        userName: l.userName,
                    }))}
                    onLikeCountClick={() => onShowLikers(post.id)}
                    onCommentCountClick={() => void toggleComments()}
                />

                <PostActionBar>
                    <ReactionsPicker
                        postId={post.id}
                        initialReaction={userReaction || null}
                        initialCount={post._count.likes}
                        onReact={(pid, reaction) => void onLike(pid, reaction ?? "Like")}
                    />
                    <button
                        onClick={() => commentsEnabled && void toggleComments()}
                        className={cn(
                            "flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors w-full justify-center",
                            !commentsEnabled
                                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
                        )}
                        disabled={!commentsEnabled}
                        title={
                            !commentsEnabled
                                ? "Comments are disabled for this post"
                                : "Comment"
                        }
                    >
                        {!commentsEnabled ? (
                            <MessageCircleOffIcon className="h-4 w-4" />
                        ) : (
                            <MessageCircleIcon className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Comment</span>
                    </button>
                    <button
                        className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center"
                        onClick={() => onShare(post)}
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m17 2 4 4-4 4" />
                            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                            <path d="m7 22-4-4 4-4" />
                            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                        </svg>
                        <span className="hidden sm:inline">Repost</span>
                    </button>
                    <button
                        className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center"
                        onClick={() => {
                            const postUrl =
                                typeof window !== "undefined"
                                    ? `${window.location.origin}/feeds#post-${post.id}`
                                    : "";
                            navigator.clipboard.writeText(postUrl);
                            toast.success("Link copied - share it anywhere!");
                        }}
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m22 2-7 20-4-9-9-4Z" />
                            <path d="M22 2 11 13" />
                        </svg>
                        <span className="hidden sm:inline">Send</span>
                    </button>
                </PostActionBar>

                {expanded && commentsEnabled && (
                    <PostCommentsSection>
                        {loadingComments ? (
                            <div className="py-4 text-center text-sm text-gray-500">
                                Loading comments…
                            </div>
                        ) : (
                            <CommentThread
                                postId={post.id}
                                postAuthorId={post.user.id}
                                commentsEnabled={commentsEnabled}
                                comments={comments}
                                currentUser={currentUser}
                                isAdmin={isAdmin}
                                onSubmit={handleAddComment}
                                onEdit={handleEditComment}
                                onDelete={handleDeleteComment}
                                onLike={handleCommentLike}
                            />
                        )}
                    </PostCommentsSection>
                )}
            </PostCard>

            {/* Report Post Dialog */}
            <Dialog
                open={reportingPost}
                onOpenChange={(open) => {
                    if (!open) {
                        setReportingPost(false);
                        setReportCategory("");
                        setReportReason("");
                    }
                }}
            >
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
                                <SelectItem value="Harassment or Bullying">
                                    Harassment or Bullying
                                </SelectItem>
                                <SelectItem value="Hate Speech">Hate Speech</SelectItem>
                                <SelectItem value="Misinformation">Misinformation</SelectItem>
                                <SelectItem value="Violence or Threats">
                                    Violence or Threats
                                </SelectItem>
                                <SelectItem value="Inappropriate Content">
                                    Inappropriate Content
                                </SelectItem>
                                <SelectItem value="Copyright Violation">
                                    Copyright Violation
                                </SelectItem>
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
                                    setReportingPost(false);
                                    setReportCategory("");
                                    setReportReason("");
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
        </div>
    );
}