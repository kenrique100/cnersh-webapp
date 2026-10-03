"use client";

import React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    ImageIcon,
    VideoIcon,
    LinkIcon,
    UsersIcon,
    SendIcon,
    XIcon,
} from "lucide-react";
import ImageUpload from "@/components/image-upload";
import { CTA_LINK_TYPES, DEFAULT_LINK_TYPE } from "@/components/cta-link-button";
import { createPost, searchUsers, getAllUsers } from "@/app/actions/feed";
import { getInitials } from "@/components/post-card";
import { cn } from "@/lib/utils";

/* Lazy: not needed on first paint of the feed. */
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

export interface CreatedPost {
    id: string;
    content: string;
    image: string | null;
    video: string | null;
    images: string[];
    videos: string[];
    tags: string[];
    linkUrl: string | null;
    linkType: string | null;
    commentsEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    userId: string;
    user: {
        id: string;
        name: string | null;
        image: string | null;
        profession: string | null;
        title: string | null;
    };
    _count: { comments: number; likes: number };
}

interface PostComposerProps {
    currentUser: {
        id: string;
        name: string | null;
        image: string | null;
        gender: string | null;
    };
    onPostCreated: (post: CreatedPost) => void;
}

const MENTION_SEARCH_DEBOUNCE_MS = 200;

export default function PostComposer({ currentUser, onPostCreated }: PostComposerProps) {
    const router = useRouter();
    const [content, setContent] = React.useState("");
    const [image, setImage] = React.useState<string | null>(null);
    const [video, setVideo] = React.useState<string | null>(null);
    const [images, setImages] = React.useState<string[]>([]);
    const [videos, setVideos] = React.useState<string[]>([]);
    const [tags] = React.useState<string[]>([]);
    const [showImageUpload, setShowImageUpload] = React.useState(false);
    const [showVideoUpload, setShowVideoUpload] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [linkUrl, setLinkUrl] = React.useState("");
    const [linkType, setLinkType] = React.useState<string>(DEFAULT_LINK_TYPE);
    const [showLinkInput, setShowLinkInput] = React.useState(false);
    const [mentionResults, setMentionResults] = React.useState<
        { id: string; name: string | null; image: string | null }[]
    >([]);
    const [showMentionDropdown, setShowMentionDropdown] = React.useState(false);
    const mentionSearchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMentionSearch = (text: string) => {
        const lastAtIndex = text.lastIndexOf("@");
        if (lastAtIndex === -1) {
            setShowMentionDropdown(false);
            setMentionResults([]);
            return;
        }
        const afterAt = text.slice(lastAtIndex + 1);
        if (afterAt.includes("\n")) {
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

    const insertMention = (name: string) => {
        const lastAtIndex = content.lastIndexOf("@");
        if (lastAtIndex !== -1) {
            setContent(content.slice(0, lastAtIndex) + `@${name} `);
        }
        setShowMentionDropdown(false);
        setMentionResults([]);
    };

    const handleMentionAll = async () => {
        try {
            const allUsers = await getAllUsers();
            const mentionText = allUsers
                .filter((u) => u.name)
                .map((u) => `@${u.name}`)
                .join(" ");
            setContent((prev) => (prev ? prev + " " + mentionText + " " : mentionText + " "));
            toast.success(`Mentioned ${allUsers.length} users`);
        } catch {
            toast.error("Failed to fetch users");
        }
    };

    const reset = () => {
        setContent("");
        setImage(null);
        setVideo(null);
        setImages([]);
        setVideos([]);
        setLinkUrl("");
        setLinkType(DEFAULT_LINK_TYPE);
        setShowLinkInput(false);
        setShowImageUpload(false);
        setShowVideoUpload(false);
    };

    const handleSubmit = async () => {
        if (
            !content.trim() &&
            !image &&
            !video &&
            images.length === 0 &&
            videos.length === 0
        )
            return;

        setIsSubmitting(true);
        try {
            const createdPost = (await createPost({
                content,
                image: image || undefined,
                video: video || undefined,
                images: images.length > 0 ? images : undefined,
                videos: videos.length > 0 ? videos : undefined,
                tags: tags.length > 0 ? tags : undefined,
                linkUrl: linkUrl.trim() || undefined,
                linkType: linkUrl.trim() ? linkType : undefined,
            })) as unknown as CreatedPost;

            reset();
            onPostCreated(createdPost);
            toast.success("Post published successfully");
            // Refresh the rest of the app (notification counters etc.).
            router.refresh();
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to create post";
            toast.error(
                message === "Unauthorized"
                    ? "Please sign in to create a post"
                    : message,
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm rounded-xl">
            <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-start gap-2.5">
                    <Avatar className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 border border-gray-200 dark:border-gray-700">
                        <AvatarImage src={currentUser.image ?? undefined} />
                        <AvatarFallback className="text-sm font-semibold bg-blue-700 text-white">
                            {getInitials(currentUser.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2.5">
                        <div className="relative">
                            <Textarea
                                placeholder="Share an update with your community... (use @ to mention users)"
                                value={content}
                                onChange={(e) => {
                                    setContent(e.target.value);
                                    handleMentionSearch(e.target.value);
                                }}
                                className="min-h-[56px] sm:min-h-[72px] resize-none border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-950 transition-colors text-sm sm:text-base"
                            />
                            {showMentionDropdown && mentionResults.length > 0 && (
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {mentionResults.map((user) => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => insertMention(user.name || "User")}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                        >
                                            <Avatar className="h-7 w-7 shrink-0">
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

                        {(images.length > 0 || image) && (
                            <div className="flex flex-wrap gap-1.5">
                                {image && (
                                    <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-full sm:w-[calc(50%-3px)]">
                                        <Image
                                            src={image}
                                            alt="Upload preview"
                                            width={300}
                                            height={200}
                                            className="w-full h-[110px] sm:h-[140px] object-cover"
                                            unoptimized
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (image) void deleteBlobUrl(image);
                                                setImage(null);
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white"
                                            title="Remove image"
                                        >
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                                {images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-full sm:w-[calc(50%-3px)]"
                                    >
                                        <Image
                                            src={img}
                                            alt={`Upload preview ${idx + 1}`}
                                            width={300}
                                            height={200}
                                            className="w-full h-[110px] sm:h-[140px] object-cover"
                                            unoptimized
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void deleteBlobUrl(img);
                                                setImages((prev) =>
                                                    prev.filter((_, i) => i !== idx),
                                                );
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white"
                                            title="Remove image"
                                        >
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {(videos.length > 0 || video) && (
                            <div className="space-y-1.5">
                                {video && (
                                    <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                        <video
                                            src={video}
                                            controls
                                            className="w-full max-h-[140px] sm:max-h-[180px] object-contain bg-black"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setVideo(null)}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
                                            title="Remove video"
                                        >
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                                {videos.map((vid, idx) => (
                                    <div
                                        key={idx}
                                        className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                                    >
                                        <video
                                            src={vid}
                                            controls
                                            className="w-full max-h-[140px] sm:max-h-[180px] object-contain bg-black"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void deleteBlobUrl(vid);
                                                setVideos((prev) =>
                                                    prev.filter((_, i) => i !== idx),
                                                );
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
                                            title="Remove video"
                                        >
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showImageUpload && (
                            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-900">
                                <ImageUpload
                                    variant="feed"
                                    onChange={(url) => {
                                        if (url) {
                                            setImages((prev) => [...prev, url]);
                                            setShowImageUpload(false);
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {showVideoUpload && (
                            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-900">
                                <VideoUploadInput
                                    onUpload={(url) => {
                                        setVideos((prev) => [...prev, url]);
                                        setShowVideoUpload(false);
                                    }}
                                />
                            </div>
                        )}

                        {showLinkInput && (
                            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                    <input
                                        type="url"
                                        placeholder="Paste a link URL (e.g. https://example.com)"
                                        value={linkUrl}
                                        onChange={(e) => setLinkUrl(e.target.value)}
                                        className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowLinkInput(false);
                                            setLinkUrl("");
                                            setLinkType(DEFAULT_LINK_TYPE);
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500"
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                        Button label:
                                    </span>
                                    <select
                                        value={linkType}
                                        onChange={(e) => setLinkType(e.target.value)}
                                        className="text-xs sm:text-sm px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

                        <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-center gap-0 sm:gap-0.5">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowVideoUpload(false);
                                        setShowImageUpload(!showImageUpload);
                                    }}
                                    className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 h-8 px-1.5 sm:px-2.5 rounded-lg"
                                >
                                    <ImageIcon className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline text-sm font-medium">
                                        Photo
                                    </span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowImageUpload(false);
                                        setShowVideoUpload(!showVideoUpload);
                                    }}
                                    className="text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 h-8 px-1.5 sm:px-2.5 rounded-lg"
                                >
                                    <VideoIcon className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline text-sm font-medium">
                                        Video
                                    </span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowLinkInput(!showLinkInput)}
                                    className="text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 h-8 px-1.5 sm:px-2.5 rounded-lg"
                                >
                                    <LinkIcon className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline text-sm font-medium">
                                        Link
                                    </span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMentionAll}
                                    className="text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 h-8 px-1.5 sm:px-2.5 rounded-lg"
                                    title="Mention all users"
                                >
                                    <UsersIcon className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline text-sm font-medium">
                                        @All
                                    </span>
                                </Button>
                            </div>
                            <Button
                                onClick={handleSubmit}
                                disabled={
                                    isSubmitting ||
                                    (!content.trim() &&
                                        !image &&
                                        !video &&
                                        images.length === 0 &&
                                        videos.length === 0)
                                }
                                size="sm"
                                className="h-8 rounded-md bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Posting...
                                    </span>
                                ) : (
                                    <>
                                        <SendIcon className="h-3.5 w-3.5 mr-1" />
                                        Post
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}