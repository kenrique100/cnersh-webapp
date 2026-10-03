"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    PenIcon,
    RefreshCw,
    ShareIcon,
    ThumbsUpIcon,
    Loader2,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "lucide-react";
import {
    getPosts,
    markPostsAsRead,
    getUnreadPostCount,
    getPostLikers,
} from "@/app/actions/feed";
import {
    getInitials,
    formatRelativeDate,
    renderPostContent,
    getReactionEmoji,
    getReactionBg,
    postHasMedia,
} from "@/components/post-card";
import LinkPreviewCard from "@/components/link-preview-card";
import { cn } from "@/lib/utils";
import { readUserJson, writeUserJson, type UserStorageKey } from "@/lib/browser-storage";

import PostComposer, { type CreatedPost } from "@/components/feed/post-composer";
import PostItem, { type PostData } from "@/components/feed/post-item";

const SHARE_COUNTS_KEY: UserStorageKey = "feed:share-counts";

const PULL_REFRESH_THRESHOLD = 60;
const MARK_READ_FLUSH_MS = 700;
const OBSERVER_ARM_DELAY_MS = 2500;

export type { PostData };

interface FeedClientProps {
    initialPosts: PostData[];
    initialUnreadCount?: number;
    currentUserId: string;
    currentUserName?: string | null;
    currentUserImage?: string | null;
    currentUserGender?: string | null;
    isAdmin: boolean;
}

export default function FeedClient({
                                       initialPosts,
                                       initialUnreadCount = 0,
                                       currentUserId,
                                       currentUserName,
                                       currentUserImage,
                                       currentUserGender,
                                       isAdmin,
                                   }: FeedClientProps) {
    const router = useRouter();
    const [posts, setPosts] = React.useState<PostData[]>(initialPosts);
    const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [pullDistance, setPullDistance] = React.useState(0);
    const [observerArmed, setObserverArmed] = React.useState(false);

    const [shareCounts, setShareCounts] = React.useState<Record<string, number>>(
        () => readUserJson<Record<string, number>>(currentUserId, SHARE_COUNTS_KEY, {}),
    );

    const [likersPostId, setLikersPostId] = React.useState<string | null>(null);
    const [likersList, setLikersList] = React.useState<
        { id: string; name: string | null; image: string | null; reactionType: string }[]
    >([]);
    const [loadingLikers, setLoadingLikers] = React.useState(false);

    const [sharePostId, setSharePostId] = React.useState<string | null>(null);

    const [imageModalOpen, setImageModalOpen] = React.useState(false);
    const [imageModalPost, setImageModalPost] = React.useState<PostData | null>(null);
    const [imageModalIndex, setImageModalIndex] = React.useState(0);

    const postsRef = React.useRef<PostData[]>(initialPosts);
    const touchStartYRef = React.useRef(0);
    const isPullingRef = React.useRef(false);
    const pendingReadIdsRef = React.useRef<Set<string>>(new Set());
    const readFlushTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshLockRef = React.useRef(false);

    React.useEffect(() => {
        writeUserJson(currentUserId, SHARE_COUNTS_KEY, shareCounts);
    }, [currentUserId, shareCounts]);

    React.useEffect(() => {
        postsRef.current = posts;
    }, [posts]);

    React.useEffect(() => {
        const t = setTimeout(() => setObserverArmed(true), OBSERVER_ARM_DELAY_MS);
        return () => clearTimeout(t);
    }, []);

    const flushPendingReads = React.useCallback(() => {
        const ids = Array.from(pendingReadIdsRef.current);
        pendingReadIdsRef.current.clear();
        if (ids.length === 0) return;

        void markPostsAsRead(ids)
            .then(() => {
                setPosts((prev) =>
                    prev.map((p) => (ids.includes(p.id) ? { ...p, isUnread: false } : p)),
                );
                setUnreadCount((prev) => Math.max(0, prev - ids.length));
            })
            .catch(() => {
                /* swallow — next flush retries */
            });
    }, []);

    const scheduleMarkRead = React.useCallback(
        (postId: string) => {
            pendingReadIdsRef.current.add(postId);
            if (readFlushTimeoutRef.current) clearTimeout(readFlushTimeoutRef.current);
            readFlushTimeoutRef.current = setTimeout(flushPendingReads, MARK_READ_FLUSH_MS);
        },
        [flushPendingReads],
    );

    React.useEffect(() => {
        if (!observerArmed || typeof window === "undefined") return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const el = entry.target as HTMLElement;
                    const id = el.dataset.postId;
                    if (!id) continue;
                    const post = postsRef.current.find((p) => p.id === id);
                    if (post?.isUnread) scheduleMarkRead(id);
                }
            },
            { threshold: 0.6 },
        );
        const els = document.querySelectorAll<HTMLElement>("[data-post-id]");
        els.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [observerArmed, posts.length, scheduleMarkRead]);

    React.useEffect(() => {
        const pending = readFlushTimeoutRef.current;
        return () => {
            if (pending) clearTimeout(pending);
        };
    }, []);

    const handleRefresh = React.useCallback(async () => {
        if (refreshLockRef.current) return;
        refreshLockRef.current = true;
        setIsRefreshing(true);
        try {
            const result = await getPosts(1, 20);
            setPosts(result.posts as unknown as PostData[]);
            const freshUnread = await getUnreadPostCount();
            setUnreadCount(freshUnread);
        } catch {
            toast.error("Failed to refresh feed");
        } finally {
            setIsRefreshing(false);
            refreshLockRef.current = false;
        }
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (typeof window === "undefined") return;
        if (window.scrollY > 4) return;
        touchStartYRef.current = e.touches[0].clientY;
        isPullingRef.current = false;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (typeof window === "undefined") return;
        if (window.scrollY > 4 || isRefreshing) return;
        const diff = e.touches[0].clientY - touchStartYRef.current;
        if (diff <= 0) {
            if (pullDistance !== 0) setPullDistance(0);
            return;
        }
        if (diff > 8) {
            isPullingRef.current = true;
            setPullDistance(Math.min(diff * 0.45, 90));
        }
    };

    const handleTouchEnd = async () => {
        const wasPulling = isPullingRef.current;
        const distance = pullDistance;
        isPullingRef.current = false;
        setPullDistance(0);
        if (wasPulling && distance >= PULL_REFRESH_THRESHOLD) {
            await handleRefresh();
        }
    };

    /* ---- Post mutations -------------------------------------------------- */

    const handlePostCreated = (created: CreatedPost) => {
        const normalized: PostData = {
            id: created.id,
            content: created.content,
            image: created.image,
            video: created.video,
            images: created.images,
            videos: created.videos,
            tags: created.tags,
            linkUrl: created.linkUrl,
            linkType: created.linkType,
            commentsEnabled: created.commentsEnabled,
            createdAt: created.createdAt,
            user: {
                id: created.user.id,
                name: created.user.name,
                image: created.user.image,
                profession: created.user.profession,
                professionOther: null,
            },
            _count: created._count,
            likes: [],
            isUnread: false,
            recentActivity: { users: [], likeCount: 0, commentCount: 0 },
        };
        setPosts((prev) => [normalized, ...prev]);
    };

    const handleLike = async (postId: string, reactionType: string) => {
        try {
            const { toggleLike } = await import("@/app/actions/feed");
            const result = await toggleLike(postId, reactionType);
            setPosts((prev) =>
                prev.map((p) => {
                    if (p.id !== postId) return p;
                    if (result.liked) {
                        const existingIdx = p.likes.findIndex(
                            (l) => l.userId === currentUserId,
                        );
                        const newLikes =
                            existingIdx >= 0
                                ? p.likes.map((l) =>
                                    l.userId === currentUserId
                                        ? { ...l, reactionType: result.reactionType! }
                                        : l,
                                )
                                : [
                                    ...p.likes,
                                    {
                                        userId: currentUserId,
                                        reactionType: result.reactionType!,
                                        userName: currentUserName ?? null,
                                    },
                                ];
                        return {
                            ...p,
                            _count: {
                                ...p._count,
                                likes:
                                    existingIdx >= 0 ? p._count.likes : p._count.likes + 1,
                            },
                            likes: newLikes,
                        };
                    } else {
                        return {
                            ...p,
                            _count: { ...p._count, likes: p._count.likes - 1 },
                            likes: p.likes.filter((l) => l.userId !== currentUserId),
                        };
                    }
                }),
            );
        } catch {
            toast.error("Failed to react to post");
        }
    };

    const handleDelete = async (postId: string) => {
        try {
            const { deletePost } = await import("@/app/actions/feed");
            await deletePost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            toast.success("Post removed");
        } catch {
            toast.error("Failed to delete post");
        }
    };

    const handleUpdate = (postId: string, updates: Partial<PostData>) => {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updates } : p)));
    };

    const handleToggleCommentsEnabled = async (postId: string) => {
        try {
            const { togglePostComments } = await import("@/app/actions/feed");
            const result = await togglePostComments(postId);
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId ? { ...p, commentsEnabled: result.commentsEnabled } : p,
                ),
            );
            toast.success(result.commentsEnabled ? "Comments enabled" : "Comments disabled");
        } catch {
            toast.error("Failed to toggle comments");
        }
    };

    const handleCommentAdded = (postId: string) => {
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
                    : p,
            ),
        );
    };

    const handleCommentDeleted = (postId: string) => {
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        _count: {
                            ...p._count,
                            comments: Math.max(0, p._count.comments - 1),
                        },
                    }
                    : p,
            ),
        );
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

    const handleShare = (post: PostData) => {
        setSharePostId(post.id);
    };

    const handleShareTo = (platform: string, post: PostData) => {
        const shareUrl =
            typeof window !== "undefined" ? window.location.origin + "/feeds" : "";
        const shareText = encodeURIComponent(post.content.substring(0, 200));
        const encodedUrl = encodeURIComponent(shareUrl);

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
            case "x":
                url = `https://x.com/intent/tweet?text=${shareText}&url=${encodedUrl}`;
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

    const pullIndicatorHeight = isRefreshing ? Math.max(pullDistance, 56) : pullDistance;
    const pullReady = pullDistance >= PULL_REFRESH_THRESHOLD;

    const currentUser = {
        id: currentUserId,
        name: currentUserName ?? null,
        image: currentUserImage ?? null,
        gender: currentUserGender ?? null,
    };

    return (
        <div
            className="w-full space-y-3"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            <div
                className="flex items-center justify-center overflow-hidden transition-[height,opacity] duration-200 lg:hidden"
                style={{
                    height: pullIndicatorHeight,
                    opacity: pullIndicatorHeight > 0 ? 1 : 0,
                }}
                aria-hidden={pullIndicatorHeight === 0}
            >
                {pullIndicatorHeight > 0 && (
                    <div className="flex flex-col items-center gap-1">
                        <RefreshCw
                            className={cn(
                                "h-5 w-5 text-blue-600 transition-transform",
                                isRefreshing
                                    ? "animate-spin"
                                    : pullReady
                                        ? "rotate-180"
                                        : "rotate-0",
                            )}
                        />
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            {isRefreshing
                                ? "Refreshing…"
                                : pullReady
                                    ? "Release to refresh"
                                    : "Pull to refresh"}
                        </span>
                    </div>
                )}
            </div>

            <PostComposer currentUser={currentUser} onPostCreated={handlePostCreated} />

            <div className="flex items-center gap-2 px-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Recent Activity
                    </span>
                    {unreadCount > 0 && (
                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] px-1.5 py-0 rounded-full">
                            {unreadCount} new
                        </Badge>
                    )}
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 transition-colors"
                        title="Refresh feed"
                        aria-label="Refresh feed"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            </div>

            {posts.length === 0 ? (
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                    <CardContent className="py-10 sm:py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <PenIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-gray-800 dark:text-gray-200 font-semibold">
                                    No posts yet
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Be the first to share an update with the community!
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                posts.map((post) => (
                    <PostItem
                        key={post.id}
                        post={post}
                        shareCount={shareCounts[post.id] || 0}
                        currentUser={currentUser}
                        isAdmin={isAdmin}
                        onLike={handleLike}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                        onToggleCommentsEnabled={handleToggleCommentsEnabled}
                        onCommentAdded={handleCommentAdded}
                        onCommentDeleted={handleCommentDeleted}
                        onShowLikers={handleShowLikers}
                        onShare={handleShare}
                        onOpenImageModal={openImageModal}
                    />
                ))
            )}

            {/* Repost Dialog */}
            <Dialog
                open={sharePostId !== null}
                onOpenChange={(open) => {
                    if (!open) setSharePostId(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Repost</DialogTitle>
                        <DialogDescription>
                            Choose a platform to share this post.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2 py-3">
                        {(() => {
                            const post = posts.find((p) => p.id === sharePostId);
                            if (!post) return null;
                            return (
                                <>
                                    <button
                                        onClick={() => handleShareTo("whatsapp", post)}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white text-lg font-bold">
                                            W
                                        </div>
                                        <span className="text-sm font-medium">WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={() => handleShareTo("facebook", post)}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
                                            f
                                        </div>
                                        <span className="text-sm font-medium">Facebook</span>
                                    </button>
                                    <button
                                        onClick={() => handleShareTo("x", post)}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-lg font-bold">
                                            𝕏
                                        </div>
                                        <span className="text-sm font-medium">X (Twitter)</span>
                                    </button>
                                    <button
                                        onClick={() => handleShareTo("instagram", post)}
                                        className="flex items-center gap-2.5 rounded-md border border-gray-200 p-2.5 transition-colors hover:bg-pink-50 dark:border-gray-700 dark:hover:bg-pink-950"
                                    >
                                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-pink-600 text-lg font-bold text-white">
                                            I
                                        </div>
                                        <span className="text-sm font-medium">Instagram</span>
                                    </button>
                                    <button
                                        onClick={() => handleShareTo("copy", post)}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors col-span-2"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-gray-500 flex items-center justify-center text-white">
                                            <ShareIcon className="h-4.5 w-4.5" />
                                        </div>
                                        <span className="text-sm font-medium">Copy Link</span>
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Likers Dialog */}
            <Dialog
                open={likersPostId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setLikersPostId(null);
                        setLikersList([]);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reactions</DialogTitle>
                        <DialogDescription>
                            {likersList.length} {likersList.length === 1 ? "person" : "people"}{" "}
                            reacted to this post
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto space-y-1 py-2">
                        {loadingLikers ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                            </div>
                        ) : likersList.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 py-4">
                                No reactions yet
                            </p>
                        ) : (
                            likersList.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    <div className="relative">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user.image ?? undefined} />
                                            <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span
                                            className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full ${getReactionBg(user.reactionType)} text-[8px] border border-white dark:border-gray-950`}
                                            title={user.reactionType}
                                        >
                                            {getReactionEmoji(user.reactionType)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {user.name || "Anonymous"}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">
                                            {user.reactionType}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Image Modal */}
            <Dialog
                open={imageModalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setImageModalOpen(false);
                        setImageModalPost(null);
                    }
                }}
            >
                <DialogContent className="max-w-[98vw] sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] p-0 overflow-hidden">
                    {imageModalPost &&
                        (() => {
                            const allImages = [
                                ...(imageModalPost.image ? [imageModalPost.image] : []),
                                ...(imageModalPost.images || []),
                            ];
                            const currentImage =
                                allImages[imageModalIndex] || allImages[0];
                            const hasMultiple = allImages.length > 1;
                            return (
                                <div className="flex flex-col md:flex-row h-full max-h-[93vh] sm:max-h-[85vh]">
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
                                        {hasMultiple && (
                                            <>
                                                <button
                                                    onClick={() =>
                                                        setImageModalIndex(
                                                            (prev) =>
                                                                (prev - 1 + allImages.length) %
                                                                allImages.length,
                                                        )
                                                    }
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                                                >
                                                    <ChevronLeftIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setImageModalIndex(
                                                            (prev) =>
                                                                (prev + 1) % allImages.length,
                                                        )
                                                    }
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
                                    <div className="w-full md:w-[280px] lg:w-[320px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-y-auto max-h-[35vh] sm:max-h-[40vh] md:max-h-none">
                                        <div className="p-3.5 border-b border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700">
                                                    <AvatarImage
                                                        src={imageModalPost.user.image ?? undefined}
                                                        alt={imageModalPost.user.name || ""}
                                                    />
                                                    <AvatarFallback className="bg-blue-700 text-white text-sm font-semibold">
                                                        {getInitials(imageModalPost.user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                        {imageModalPost.user.name || "Anonymous"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {imageModalPost.user.profession ||
                                                            "Community Member"}
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                                        {formatRelativeDate(imageModalPost.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {imageModalPost.content && (
                                            <div className="p-3.5 border-b border-gray-100 dark:border-gray-800">
                                                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                                    {renderPostContent(imageModalPost.content)}
                                                </p>
                                            </div>
                                        )}
                                        {imageModalPost.tags &&
                                            imageModalPost.tags.length > 0 && (
                                                <div className="px-3.5 py-1.5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5">
                                                    {imageModalPost.tags.map((tag, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-medium"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        {imageModalPost.linkUrl && (
                                            <div className="p-3.5 border-b border-gray-100 dark:border-gray-800">
                                                <LinkPreviewCard
                                                    url={imageModalPost.linkUrl ?? undefined}
                                                    linkType={imageModalPost.linkType ?? undefined}
                                                    hasMedia={postHasMedia(imageModalPost)}
                                                />
                                            </div>
                                        )}
                                        <div className="p-3.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                            {imageModalPost._count.likes > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <ThumbsUpIcon className="h-3.5 w-3.5 text-blue-600" />
                                                    {imageModalPost._count.likes}{" "}
                                                    {imageModalPost._count.likes === 1
                                                        ? "like"
                                                        : "likes"}
                                                </span>
                                            )}
                                            {imageModalPost._count.comments > 0 && (
                                                <span>
                                                    {imageModalPost._count.comments} comment
                                                    {imageModalPost._count.comments !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
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