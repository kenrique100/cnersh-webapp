"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    MessageCircleIcon,
    SendIcon,
    TrashIcon,
    PenIcon,
    ImageIcon,
    ThumbsUpIcon,
    ShareIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createPost, toggleLike, addComment, deletePost, getPostComments } from "@/app/actions/feed";
import ImageUpload from "@/components/image-upload";

interface PostUser {
    id: string;
    name: string | null;
    image: string | null;
}

interface PostData {
    id: string;
    content: string;
    image: string | null;
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
    const [showImageUpload, setShowImageUpload] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [expandedComments, setExpandedComments] = React.useState<Set<string>>(new Set());
    const [commentTexts, setCommentTexts] = React.useState<Record<string, string>>({});
    const [postComments, setPostComments] = React.useState<Record<string, Array<{
        id: string;
        content: string;
        createdAt: Date;
        user: PostUser;
    }>>>({});

    const currentUserInitials = currentUserName
        ? currentUserName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        setIsSubmitting(true);
        try {
            await createPost({ content: newPostContent, image: newPostImage || undefined });
            setNewPostContent("");
            setNewPostImage(null);
            setShowImageUpload(false);
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
        try {
            const comment = await addComment(postId, text);
            setPostComments((prev) => ({
                ...prev,
                [postId]: [...(prev[postId] || []), comment],
            }));
            setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
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

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4">
            {/* Create Post Card - LinkedIn Style */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm rounded-xl">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 shrink-0 border border-gray-200 dark:border-gray-700">
                            <AvatarImage src={currentUserImage || undefined} alt={currentUserName || ""} />
                            <AvatarFallback className="bg-blue-700 text-white text-sm font-semibold">
                                {currentUserInitials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                            <Textarea
                                placeholder="Share an update with your community..."
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                className="min-h-[80px] resize-none border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-950 transition-colors text-sm"
                            />
                            {showImageUpload && (
                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
                                    <ImageUpload
                                        endpoint="imageUploader"
                                        defaultUrl={newPostImage}
                                        onChange={(url) => setNewPostImage(url)}
                                    />
                                </div>
                            )}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowImageUpload(!showImageUpload)}
                                        className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 h-9 px-3 rounded-lg"
                                    >
                                        <ImageIcon className="h-4 w-4 mr-1.5" />
                                        <span className="text-xs font-medium">Photo</span>
                                    </Button>
                                </div>
                                <Button
                                    onClick={handleCreatePost}
                                    disabled={isSubmitting || !newPostContent.trim()}
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
                                        <Avatar className="h-12 w-12 border border-gray-200 dark:border-gray-700">
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
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                {formatDate(post.createdAt)}
                                            </p>
                                        </div>
                                    </div>
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

                            {/* Post Content */}
                            <div className="px-4 py-3">
                                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                    {post.content}
                                </p>
                            </div>

                            {/* Post Image */}
                            {post.image && (
                                <div className="border-t border-b border-gray-100 dark:border-gray-800">
                                    <Image
                                        src={post.image}
                                        alt="Post attachment"
                                        width={700}
                                        height={400}
                                        className="w-full object-cover max-h-[500px]"
                                    />
                                </div>
                            )}

                            {/* Engagement Stats */}
                            {(post._count.likes > 0 || post._count.comments > 0) && (
                                <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        {post._count.likes > 0 && (
                                            <>
                                                <span className="flex items-center justify-center w-4 h-4 bg-blue-600 rounded-full">
                                                    <ThumbsUpIcon className="h-2.5 w-2.5 text-white" />
                                                </span>
                                                <span>{post._count.likes}</span>
                                            </>
                                        )}
                                    </div>
                                    {post._count.comments > 0 && (
                                        <button
                                            onClick={() => toggleComments(post.id)}
                                            className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                                        >
                                            {post._count.comments} comment{post._count.comments !== 1 ? "s" : ""}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons - LinkedIn Style */}
                            <div className="border-t border-gray-100 dark:border-gray-800 px-2 py-1">
                                <div className="flex items-center justify-around">
                                    <button
                                        onClick={() => handleLike(post.id)}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full justify-center ${
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
                                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center"
                                    >
                                        <MessageCircleIcon className="h-4 w-4" />
                                        <span className="hidden sm:inline">Comment</span>
                                    </button>
                                    <button
                                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center"
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            toast.success("Link copied!");
                                        }}
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
                                        return (
                                            <div key={comment.id} className="flex gap-2.5">
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarImage src={comment.user.image || undefined} />
                                                    <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 font-medium">
                                                        {commentInitials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2">
                                                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                                        {comment.user.name || "Anonymous"}
                                                    </p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
                                                        {comment.content}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Comment Input */}
                                    <div className="flex gap-2.5 pt-1">
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage src={currentUserImage || undefined} />
                                            <AvatarFallback className="text-xs bg-blue-700 text-white font-medium">
                                                {currentUserInitials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Write a comment..."
                                                value={commentTexts[post.id] || ""}
                                                onChange={(e) =>
                                                    setCommentTexts((prev) => ({
                                                        ...prev,
                                                        [post.id]: e.target.value,
                                                    }))
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleComment(post.id);
                                                }}
                                                className="flex-1 h-9 px-4 text-sm rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleComment(post.id)}
                                                className="h-9 w-9 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                                disabled={!commentTexts[post.id]?.trim()}
                                            >
                                                <SendIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })
            )}
        </div>
    );
}
