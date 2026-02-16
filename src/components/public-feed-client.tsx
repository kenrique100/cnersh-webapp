"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    MessageCircleIcon,
    ThumbsUpIcon,
    ShareIcon,
    LockIcon,
} from "lucide-react";

interface PostUser {
    id: string;
    name: string | null;
    image: string | null;
}

interface PublicPostData {
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
}

interface PublicFeedClientProps {
    posts: PublicPostData[];
}

export default function PublicFeedClient({ posts }: PublicFeedClientProps) {
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

    const renderPostContent = (content: string) => {
        const parts = content.split(/(@\w[\w\s]*?)(?=\s@|$|\s)|(\#\w+)/g);
        return parts.map((part, i) => {
            if (!part) return null;
            if (part.startsWith("@") && part.length > 1) {
                return (
                    <span key={i} className="text-blue-600 dark:text-blue-400 font-medium">
                        {part}
                    </span>
                );
            }
            if (part.startsWith("#") && part.length > 1) {
                return (
                    <span key={i} className="text-blue-600 dark:text-blue-400 font-medium">
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    if (posts.length === 0) {
        return (
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                <CardContent className="py-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No posts yet. Check back later!</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {posts.map((post) => {
                const userInitials = post.user.name
                    ? post.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                    : "U";

                return (
                    <Card
                        key={post.id}
                        className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl shadow-sm"
                    >
                        {/* Post Header */}
                        <div className="p-4 pb-0">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-gray-200 dark:border-gray-700">
                                    <AvatarImage src={post.user.image || undefined} alt={post.user.name || ""} />
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
                                        <div className={`grid gap-1 ${allImages.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
                                            {allImages.map((img, idx) => (
                                                <Image
                                                    key={idx}
                                                    src={img}
                                                    alt={`Post attachment ${idx + 1}`}
                                                    width={350}
                                                    height={250}
                                                    className={`w-full object-cover max-h-[250px] ${idx === 0 && allImages.length === 3 ? "col-span-2" : ""}`}
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
                                    <video src={post.video} controls className="w-full max-h-[500px] object-contain bg-black" />
                                )}
                                {(post.videos || []).map((vid, idx) => (
                                    <video key={idx} src={vid} controls className="w-full max-h-[500px] object-contain bg-black" />
                                ))}
                            </div>
                        )}

                        {/* Engagement Stats */}
                        {(post._count.likes > 0 || post._count.comments > 0) && (
                            <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1.5">
                                    {post._count.likes > 0 && (
                                        <span className="flex items-center gap-1.5">
                                            <span className="flex items-center justify-center w-4 h-4 bg-blue-600 rounded-full">
                                                <ThumbsUpIcon className="h-2.5 w-2.5 text-white" />
                                            </span>
                                            <span>{post._count.likes} {post._count.likes === 1 ? "like" : "likes"}</span>
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {post._count.comments > 0 && (
                                        <span>{post._count.comments} comment{post._count.comments !== 1 ? "s" : ""}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons - Disabled for unauthenticated */}
                        <div className="border-t border-gray-100 dark:border-gray-800 px-2 py-1">
                            <div className="flex items-center justify-around">
                                <Link href="/sign-in" className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center">
                                    <ThumbsUpIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">Like</span>
                                </Link>
                                <Link href="/sign-in" className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center">
                                    <MessageCircleIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">Comment</span>
                                </Link>
                                <Link href="/sign-in" className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center">
                                    <ShareIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">Share</span>
                                </Link>
                            </div>
                        </div>
                    </Card>
                );
            })}

            {/* Sign in CTA */}
            <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 rounded-xl">
                <CardContent className="py-6 text-center">
                    <LockIcon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Sign in to interact with the community
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                        Like, comment, share posts and create your own
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <Link href="/sign-in">
                            <Button variant="outline" size="sm">Sign In</Button>
                        </Link>
                        <Link href="/sign-up">
                            <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white">Sign Up</Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
