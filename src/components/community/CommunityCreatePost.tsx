"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    HashIcon,
    MegaphoneIcon,
    UploadIcon,
    VideoIcon,
    FileTextIcon,
    LinkIcon,
    XIcon,
} from "lucide-react";
import { NewTopicState } from "./types";
import { CATEGORIES, CATEGORY_COLORS } from "./constants";
import { deleteBlobUrl } from "./utils";

interface CommunityCreatePostProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    newTopic: NewTopicState;
    setNewTopic: React.Dispatch<React.SetStateAction<NewTopicState>>;
    isAdmin: boolean;
    topicUploading: boolean;
    onCreateTopic: () => void;
    onFileUpload: (file: File, type: "image" | "video" | "document") => Promise<void>;
    topicImageRef: React.RefObject<HTMLInputElement>;
    topicVideoRef: React.RefObject<HTMLInputElement>;
    topicDocRef: React.RefObject<HTMLInputElement>;
}

export function CommunityCreatePost({
    open,
    onOpenChange,
    newTopic,
    setNewTopic,
    isAdmin,
    topicUploading,
    onCreateTopic,
    onFileUpload,
    topicImageRef,
    topicVideoRef,
    topicDocRef,
}: CommunityCreatePostProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">
                        {newTopic.category === "Announcements" ? "Create Announcement" : "Create Channel"}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {newTopic.category === "Announcements" ? "Create a new announcement" : "Create a new channel"}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-1.5 block">
                            {newTopic.category === "Announcements" ? "Announcement Title" : "Channel Name"}
                        </label>
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-md px-3 py-2">
                            {newTopic.category === "Announcements" ? (
                                <MegaphoneIcon className="h-4 w-4 text-yellow-500" />
                            ) : (
                                <HashIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            )}
                            <Input
                                placeholder={newTopic.category === "Announcements" ? "Announcement title..." : "new-channel"}
                                value={newTopic.title}
                                onChange={(e) =>
                                    setNewTopic((p) => ({
                                        ...p,
                                        title: e.target.value,
                                    }))
                                }
                                className="bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 h-auto p-0 focus-visible:ring-0"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-1.5 block">
                            Category
                        </label>
                        <Select
                            value={newTopic.category}
                            onValueChange={(value) =>
                                setNewTopic((p) => ({
                                    ...p,
                                    category: value,
                                }))
                            }
                        >
                            <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-0 text-gray-900 dark:text-white">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                {CATEGORIES.filter((cat) => cat !== "Announcements" || isAdmin).map((cat) => (
                                    <SelectItem
                                        key={cat}
                                        value={cat}
                                        className="text-gray-800 dark:text-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 focus:text-gray-900 dark:focus:text-white"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat]}`}
                                            />
                                            {cat}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-1.5 block">
                            Description
                        </label>
                        <Textarea
                            placeholder={newTopic.category === "Announcements" ? "Write your announcement..." : "What is this channel about?"}
                            value={newTopic.content}
                            onChange={(e) =>
                                setNewTopic((p) => ({
                                    ...p,
                                    content: e.target.value,
                                }))
                            }
                            className="bg-gray-50 dark:bg-gray-900 border-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[80px]"
                        />
                    </div>
                    {/* Optional Media/Link - Only for Announcements */}
                    {newTopic.category === "Announcements" && (
                        <>
                            {/* Image Upload */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Images (optional)
                                </label>
                                <input
                                    ref={topicImageRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={async (e) => {
                                        const files = e.target.files;
                                        if (files) {
                                            for (const file of Array.from(files)) {
                                                await onFileUpload(file, "image");
                                            }
                                        }
                                        e.target.value = "";
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => topicImageRef.current?.click()}
                                    disabled={topicUploading}
                                    className="flex items-center gap-2 w-full bg-gray-50 dark:bg-gray-900 rounded-md px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    <UploadIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                    <span>{topicUploading ? "Uploading..." : "Upload images"}</span>
                                </button>
                                {newTopic.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {newTopic.images.map((url, i) => (
                                            <div key={i} className="relative group">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt={`Uploaded image ${i + 1}`} className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                                                <button
                                                    onClick={() => { deleteBlobUrl(url); setNewTopic((p) => ({ ...p, images: p.images.filter((_, idx) => idx !== i) })); }}
                                                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <XIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Video Upload */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Videos (optional)
                                </label>
                                <input
                                    ref={topicVideoRef}
                                    type="file"
                                    accept="video/*"
                                    multiple
                                    className="hidden"
                                    onChange={async (e) => {
                                        const files = e.target.files;
                                        if (files) {
                                            for (const file of Array.from(files)) {
                                                await onFileUpload(file, "video");
                                            }
                                        }
                                        e.target.value = "";
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => topicVideoRef.current?.click()}
                                    disabled={topicUploading}
                                    className="flex items-center gap-2 w-full bg-gray-50 dark:bg-gray-900 rounded-md px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    <UploadIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                    <span>{topicUploading ? "Uploading..." : "Upload videos"}</span>
                                </button>
                                {newTopic.videos.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {newTopic.videos.map((url, i) => (
                                            <div key={i} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 text-xs text-gray-700 dark:text-gray-300">
                                                <VideoIcon className="h-3.5 w-3.5 text-gray-400" />
                                                <span className="truncate max-w-[120px]">Video {i + 1}</span>
                                                <button onClick={() => { deleteBlobUrl(url); setNewTopic((p) => ({ ...p, videos: p.videos.filter((_, idx) => idx !== i) })); }} className="text-red-500 hover:text-red-600">
                                                    <XIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Document Upload */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Documents (optional)
                                </label>
                                <input
                                    ref={topicDocRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                                    multiple
                                    className="hidden"
                                    onChange={async (e) => {
                                        const files = e.target.files;
                                        if (files) {
                                            for (const file of Array.from(files)) {
                                                await onFileUpload(file, "document");
                                            }
                                        }
                                        e.target.value = "";
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => topicDocRef.current?.click()}
                                    disabled={topicUploading}
                                    className="flex items-center gap-2 w-full bg-gray-50 dark:bg-gray-900 rounded-md px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    <UploadIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                    <span>{topicUploading ? "Uploading..." : "Upload documents"}</span>
                                </button>
                                {newTopic.documents.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {newTopic.documents.map((url, i) => (
                                            <div key={i} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 text-xs text-gray-700 dark:text-gray-300">
                                                <FileTextIcon className="h-3.5 w-3.5 text-gray-400" />
                                                <span className="truncate max-w-[120px]">Document {i + 1}</span>
                                                <button onClick={() => { deleteBlobUrl(url); setNewTopic((p) => ({ ...p, documents: p.documents.filter((_, idx) => idx !== i) })); }} className="text-red-500 hover:text-red-600">
                                                    <XIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Link URL */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Link to Website (optional)
                                </label>
                                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-md px-3 py-2">
                                    <LinkIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                    <Input
                                        placeholder="https://example.com"
                                        value={newTopic.linkUrl}
                                        onChange={(e) => setNewTopic((p) => ({ ...p, linkUrl: e.target.value }))}
                                        className="bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 h-auto p-0 focus-visible:ring-0"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                    <Button
                        onClick={onCreateTopic}
                        className={`w-full text-white ${newTopic.category === "Announcements" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-indigo-500 hover:bg-indigo-600"}`}
                    >
                        {newTopic.category === "Announcements" ? (
                            <><MegaphoneIcon className="h-4 w-4 mr-2" /> Publish Announcement</>
                        ) : (
                            "Create Channel"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
