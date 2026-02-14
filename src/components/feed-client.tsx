"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    HeartIcon,
    MessageCircleIcon,
    SendIcon,
    TrashIcon,
    PenIcon,
    ImageIcon,
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
    isAdmin: boolean;
}

export default function FeedClient({
    initialPosts,
    currentUserId,
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

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        setIsSubmitting(true);
        try {
            await createPost({ content: newPostContent, image: newPostImage || undefined });
            setNewPostContent("");
            setNewPostImage(null);
            setShowImageUpload(false);
            toast.success("Post created!");
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
            toast.error("Failed to like post");
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
            toast.success("Post deleted");
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
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            {/* Create Post */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <CardContent className="pt-6">
                    <Textarea
                        placeholder="What's on your mind?"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="min-h-[100px] resize-none"
                    />
                    {showImageUpload && (
                        <div className="mt-3">
                            <ImageUpload
                                endpoint="imageUploader"
                                defaultUrl={newPostImage}
                                onChange={(url) => setNewPostImage(url)}
                            />
                        </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowImageUpload(!showImageUpload)}
                        >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Image
                        </Button>
                        <Button
                            onClick={handleCreatePost}
                            disabled={isSubmitting || !newPostContent.trim()}
                            size="sm"
                        >
                            <SendIcon className="h-4 w-4 mr-2" />
                            Post
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Posts */}
            {posts.length === 0 ? (
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                    <CardContent className="py-12 text-center">
                        <PenIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No posts yet. Be the first to share!</p>
                    </CardContent>
                </Card>
            ) : (
                posts.map((post) => (
                    <Card
                        key={post.id}
                        className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage
                                            src={post.user.image || undefined}
                                            alt={post.user.name || ""}
                                        />
                                        <AvatarFallback className="bg-blue-700 text-white">
                                            {post.user.name?.charAt(0)?.toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                            {post.user.name || "Anonymous"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatDate(post.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                {(post.user.id === currentUserId || isAdmin) && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-700"
                                        onClick={() => handleDelete(post.id)}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                {post.content}
                            </p>
                            {post.image && (
                                <div className="relative rounded-lg overflow-hidden max-h-96 w-full">
                                    <Image
                                        src={post.image}
                                        alt="Post image"
                                        width={600}
                                        height={400}
                                        className="rounded-lg w-full object-cover"
                                    />
                                </div>
                            )}
                            {/* Actions */}
                            <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleLike(post.id)}
                                    className={
                                        post.likes.some((l) => l.userId === currentUserId)
                                            ? "text-red-500"
                                            : ""
                                    }
                                >
                                    <HeartIcon
                                        className={`h-4 w-4 mr-1 ${
                                            post.likes.some((l) => l.userId === currentUserId)
                                                ? "fill-current"
                                                : ""
                                        }`}
                                    />
                                    {post._count.likes}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleComments(post.id)}
                                >
                                    <MessageCircleIcon className="h-4 w-4 mr-1" />
                                    {post._count.comments}
                                </Button>
                            </div>

                            {/* Comments section */}
                            {expandedComments.has(post.id) && (
                                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                    {(postComments[post.id] || []).map((comment) => (
                                        <div key={comment.id} className="flex gap-2">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage
                                                    src={comment.user.image || undefined}
                                                />
                                                <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700">
                                                    {comment.user.name?.charAt(0)?.toUpperCase() || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                                    {comment.user.name}
                                                </p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
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
                                            className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                        />
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleComment(post.id)}
                                        >
                                            <SendIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
