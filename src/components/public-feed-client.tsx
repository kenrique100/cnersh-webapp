"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import LinkPreview from "@/components/link-preview";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import {
    MessageCircleIcon,
    ThumbsUpIcon,
    ShareIcon,
    LockIcon,
    ExternalLinkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "lucide-react";
import {
    PostCard,
    PostHeader,
    PostTextContent,
    PostTags,
    PostMediaContent,
    PostEngagementSummary,
    PostActionBar,
    getInitials,
    formatRelativeDate,
    renderPostContent,
} from "@/components/post-card";

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
    linkUrl: string | null;
    createdAt: Date;
    user: PostUser;
    _count: { comments: number; likes: number };
    likes: { reactionType: string }[];
}

interface PublicFeedClientProps {
    posts: PublicPostData[];
}

export default function PublicFeedClient({ posts }: PublicFeedClientProps) {
    // Image modal state
    const [imageModalOpen, setImageModalOpen] = React.useState(false);
    const [imageModalPost, setImageModalPost] = React.useState<PublicPostData | null>(null);
    const [imageModalIndex, setImageModalIndex] = React.useState(0);

    const openImageModal = (post: PublicPostData, imageIndex: number = 0) => {
        setImageModalPost(post);
        setImageModalIndex(imageIndex);
        setImageModalOpen(true);
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
            {posts.map((post) => (
                <div key={post.id}>
                    <PostCard>
                        {/* Post Header */}
                        <PostHeader
                            userName={post.user.name}
                            userImage={post.user.image}
                            createdAt={post.createdAt}
                        />

                        {/* Post Text Content */}
                        {post.content && (
                            <PostTextContent content={post.content} />
                        )}

                        {/* Post Tags */}
                        <PostTags tags={post.tags} />

                        {/* Post Media Content */}
                        {(post.image || (post.images && post.images.length > 0) || post.video || (post.videos && post.videos.length > 0)) && (
                            <PostMediaContent
                                image={post.image}
                                images={post.images}
                                video={post.video}
                                videos={post.videos}
                                onImageClick={(idx) => openImageModal(post, idx)}
                            />
                        )}

                        {/* Link Attachment */}
                        {post.linkUrl && (
                            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                <LinkPreview url={post.linkUrl} />
                            </div>
                        )}

                        {/* Engagement Summary */}
                        <PostEngagementSummary
                            likeCount={post._count.likes}
                            commentCount={post._count.comments}
                            reactionTypes={post.likes?.map((l) => l.reactionType) || []}
                        />

                        {/* Action Buttons - redirect to sign-in for guests */}
                        <PostActionBar>
                            <Link href="/sign-in" className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center">
                                <ThumbsUpIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Like</span>
                            </Link>
                            <Link href="/sign-in" className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center">
                                <MessageCircleIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Comment</span>
                            </Link>
                            <Link href="/sign-in" className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center">
                                <ShareIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Share</span>
                            </Link>
                        </PostActionBar>
                    </PostCard>
                </div>
            ))}

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

            {/* Image Modal - Shows full image, post info, and links */}
            <Dialog open={imageModalOpen} onOpenChange={(open) => {
                if (!open) { setImageModalOpen(false); setImageModalPost(null); }
            }}>
                <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
                    {imageModalPost && (() => {
                        const allImages = [
                            ...(imageModalPost.image ? [imageModalPost.image] : []),
                            ...(imageModalPost.images || []),
                        ];
                        const currentImage = allImages[imageModalIndex] || allImages[0];
                        const hasMultiple = allImages.length > 1;

                        return (
                            <div className="flex flex-col md:flex-row h-full max-h-[85vh]">
                                {/* Image Section */}
                                <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[400px]">
                                    {currentImage && (
                                        <Image
                                            src={currentImage}
                                            alt="Post attachment"
                                            width={800}
                                            height={600}
                                            className="max-w-full max-h-[60vh] md:max-h-[80vh] object-contain"
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
                                <div className="w-full md:w-[320px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-y-auto max-h-[40vh] md:max-h-none">
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
                                                    Community Member
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    {formatRelativeDate(imageModalPost.createdAt)}
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

                                    {/* Link Attachment */}
                                    {imageModalPost.linkUrl && (
                                        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                                            <a
                                                href={imageModalPost.linkUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
                                            >
                                                <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                                                {imageModalPost.linkUrl}
                                            </a>
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
