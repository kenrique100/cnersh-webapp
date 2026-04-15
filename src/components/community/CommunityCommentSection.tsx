"use client";

import React from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import LinkPreview from "@/components/link-preview";
import {
    HashIcon,
    SendIcon,
    SmileIcon,
    ImageIcon,
    XIcon,
    UsersIcon,
    AtSignIcon,
    PencilIcon,
    VideoIcon,
    LinkIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    MegaphoneIcon,
    FileIcon,
    MicIcon,
    BarChart3Icon,
    CalendarIcon,
    BookUserIcon,
    Music2Icon,
    PlusIcon,
    MessageCircleOffIcon,
    MessageCircleIcon,
    FileTextIcon,
    DownloadIcon,
    ReplyIcon,
} from "lucide-react";
import { toast } from "sonner";
import { CommunityUser, TopicDetail, ReplyData } from "./types";
import { EMOJI_LIST, CATEGORY_COLORS } from "./constants";
import { deleteBlobUrl, formatDate, formatTime, getDisplayName } from "./utils";
import { CommunityPostCard } from "./CommunityPostCard";

interface CommunityCommentSectionProps {
    selectedTopic: TopicDetail;
    currentUserId: string | undefined;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    users: CommunityUser[];
    messageText: string;
    setMessageText: (text: string) => void;
    pendingImage: string | null;
    setPendingImage: (img: string | null) => void;
    replyingTo: ReplyData | null;
    setReplyingTo: (reply: ReplyData | null) => void;
    showEmojiPicker: boolean;
    setShowEmojiPicker: (show: boolean) => void;
    showMentions: boolean;
    setShowMentions: (show: boolean) => void;
    mentionFilter: string;
    setMentionFilter: (filter: string) => void;
    editingReplyId: string | null;
    setEditingReplyId: (id: string | null) => void;
    editingContent: string;
    setEditingContent: (content: string) => void;
    activeMessageId: string | null;
    setActiveMessageId: (id: string | null) => void;
    pendingImages: string[];
    setPendingImages: React.Dispatch<React.SetStateAction<string[]>>;
    pendingVideos: string[];
    setPendingVideos: React.Dispatch<React.SetStateAction<string[]>>;
    pendingAudios: string[];
    setPendingAudios: React.Dispatch<React.SetStateAction<string[]>>;
    pendingDocuments: string[];
    setPendingDocuments: React.Dispatch<React.SetStateAction<string[]>>;
    pendingVoiceNote: string | null;
    setPendingVoiceNote: (vn: string | null) => void;
    pendingLinkUrl: string;
    setPendingLinkUrl: (url: string) => void;
    pendingPollQuestion: string;
    setPendingPollQuestion: (q: string) => void;
    pendingPollOptions: string[];
    setPendingPollOptions: React.Dispatch<React.SetStateAction<string[]>>;
    pendingEventTitle: string;
    setPendingEventTitle: (t: string) => void;
    pendingEventDate: string;
    setPendingEventDate: (d: string) => void;
    pendingEventLocation: string;
    setPendingEventLocation: (l: string) => void;
    showPollCreator: boolean;
    setShowPollCreator: (show: boolean) => void;
    showEventCreator: boolean;
    setShowEventCreator: (show: boolean) => void;
    showLinkInput: boolean;
    setShowLinkInput: (show: boolean) => void;
    showAttachmentPanel: boolean;
    setShowAttachmentPanel: (show: boolean) => void;
    isRecording: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    onToggleChat: (topicId: string) => void;
    onSendMessage: () => void;
    onDeleteReply: (replyId: string) => void;
    onReportChat: (replyId: string) => void;
    onEditReply: (replyId: string) => void;
    onMessageTap: (replyId: string) => void;
    onUserClick: (userId: string) => void;
    onToggleTopicLike: (topicId: string, isDislike: boolean) => void;
    onEditTopic: (topicId: string, data: { title?: string; content?: string }) => void;
    onMentionAll: () => void;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onFileUpload: (file: File, type: "image" | "video" | "audio" | "document") => Promise<void>;
    onVotePoll: (replyId: string, optionIndex: number) => void;
    onShowMobileChannels: () => void;
    onReplyTo: (reply: ReplyData) => void;
    onStartEditReply: (replyId: string, content: string) => void;
}

export function CommunityCommentSection({
    selectedTopic,
    currentUserId,
    isAdmin,
    isSuperAdmin,
    users,
    messageText,
    setMessageText,
    pendingImage,
    setPendingImage,
    replyingTo,
    setReplyingTo,
    showEmojiPicker,
    setShowEmojiPicker,
    showMentions,
    setShowMentions,
    mentionFilter,
    setMentionFilter,
    editingReplyId,
    setEditingReplyId,
    editingContent,
    setEditingContent,
    activeMessageId,
    setActiveMessageId,
    pendingImages,
    setPendingImages,
    pendingVideos,
    setPendingVideos,
    pendingAudios,
    setPendingAudios,
    pendingDocuments,
    setPendingDocuments,
    pendingVoiceNote,
    setPendingVoiceNote,
    pendingLinkUrl,
    setPendingLinkUrl,
    pendingPollQuestion,
    setPendingPollQuestion,
    pendingPollOptions,
    setPendingPollOptions,
    pendingEventTitle,
    setPendingEventTitle,
    pendingEventDate,
    setPendingEventDate,
    pendingEventLocation,
    setPendingEventLocation,
    showPollCreator,
    setShowPollCreator,
    showEventCreator,
    setShowEventCreator,
    showLinkInput,
    setShowLinkInput,
    showAttachmentPanel,
    setShowAttachmentPanel,
    isRecording,
    messagesEndRef,
    inputRef,
    onToggleChat,
    onSendMessage,
    onDeleteReply,
    onReportChat,
    onEditReply,
    onMessageTap,
    onUserClick,
    onToggleTopicLike,
    onEditTopic,
    onMentionAll,
    onStartRecording,
    onStopRecording,
    onFileUpload,
    onVotePoll,
    onShowMobileChannels,
    onReplyTo,
    onStartEditReply,
}: CommunityCommentSectionProps) {
    const filteredUsers = users.filter(
        (u) =>
            u.name &&
            u.name.toLowerCase().includes(mentionFilter.toLowerCase())
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
        if (e.key === "@") {
            setShowMentions(true);
            setMentionFilter("");
        }
        if (e.key === "Escape") {
            setShowMentions(false);
            setShowEmojiPicker(false);
        }
    };

    const handleMention = (user: CommunityUser) => {
        const name = user.name || "Unknown";
        setMessageText(messageText + `@${name} `);
        setShowMentions(false);
        inputRef.current?.focus();
    };

    const handleEmoji = (emoji: string) => {
        setMessageText(messageText + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-950">
            {/* Channel Header */}
            <div className="h-12 px-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 shadow-sm shrink-0">
                {/* Mobile channel toggle */}
                <button
                    onClick={() => onShowMobileChannels()}
                    className="md:hidden p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                    <HashIcon className="h-5 w-5" />
                </button>
                <HashIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 hidden md:block" />
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {selectedTopic.title.toLowerCase().replace(/\s+/g, "-")}
                </h3>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block flex-1">
                    {selectedTopic.content.slice(0, 100)}
                    {selectedTopic.content.length > 100 ? "…" : ""}
                </p>
                <Badge
                    className={`${CATEGORY_COLORS[selectedTopic.category] || "bg-gray-500"} text-white text-xs border-0 shrink-0`}
                >
                    {selectedTopic.category}
                </Badge>
                {/* Chat toggle for channel creator or superadmin */}
                {(selectedTopic.userId === currentUserId || isSuperAdmin) && (
                    <button
                        onClick={() => onToggleChat(selectedTopic.id)}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            selectedTopic.chatEnabled !== false
                                ? "text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                : "text-red-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950"
                        }`}
                        title={selectedTopic.chatEnabled !== false ? "Disable chat" : "Enable chat"}
                    >
                        {selectedTopic.chatEnabled !== false ? (
                            <MessageCircleOffIcon className="h-4 w-4" />
                        ) : (
                            <MessageCircleIcon className="h-4 w-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {/* Welcome Message */}
                <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${selectedTopic.category === "Announcements" ? "bg-yellow-500" : "bg-indigo-500"}`}>
                        {selectedTopic.category === "Announcements" ? (
                            <MegaphoneIcon className="h-8 w-8 text-white" />
                        ) : (
                            <HashIcon className="h-8 w-8 text-white" />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {selectedTopic.category === "Announcements" ? (
                            <>📢 {selectedTopic.title}</>
                        ) : (
                            <>Welcome to #{selectedTopic.title.toLowerCase().replace(/\s+/g, "-")}!</>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedTopic.category === "Announcements" ? "Announcement" : "This is the start of the"}{" "}
                        {selectedTopic.category !== "Announcements" && (
                            <span className="font-semibold text-gray-900 dark:text-white">
                                #{selectedTopic.title.toLowerCase().replace(/\s+/g, "-")}
                            </span>
                        )}{" "}
                        {selectedTopic.category !== "Announcements" && "channel. "}
                        {selectedTopic.category === "Announcements" ? "Posted" : "Created"} by{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {getDisplayName(selectedTopic.user)}
                        </span>{" "}
                        on {formatDate(selectedTopic.createdAt)}.
                    </p>
                    <p className="text-base text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                        {selectedTopic.content}
                    </p>
                    {/* Announcement Media */}
                    {selectedTopic.image && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-w-lg">
                            <Image src={selectedTopic.image} alt="Attachment" width={600} height={400} className="w-full max-h-[400px] object-contain bg-gray-50 dark:bg-gray-900" unoptimized />
                        </div>
                    )}
                    {/* Multiple Images */}
                    {selectedTopic.images && selectedTopic.images.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 max-w-lg">
                            {selectedTopic.images.map((img, i) => (
                                <div key={i} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <Image src={img} alt={`Image ${i + 1}`} width={300} height={200} className="w-full max-h-[200px] object-cover bg-gray-50 dark:bg-gray-900" unoptimized />
                                </div>
                            ))}
                        </div>
                    )}
                    {selectedTopic.video && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-w-lg">
                            <video src={selectedTopic.video} controls className="w-full max-h-[400px] object-contain bg-black" />
                        </div>
                    )}
                    {/* Multiple Videos */}
                    {selectedTopic.videos && selectedTopic.videos.length > 0 && (
                        <div className="mt-3 space-y-2 max-w-lg">
                            {selectedTopic.videos.map((vid, i) => (
                                <div key={i} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <video src={vid} controls className="w-full max-h-[300px] object-contain bg-black" />
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Documents */}
                    {selectedTopic.documents && selectedTopic.documents.length > 0 && (
                        <div className="mt-3 space-y-2 max-w-lg">
                            {selectedTopic.documents.map((doc, i) => (
                                <a
                                    key={i}
                                    href={doc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <FileTextIcon className="h-5 w-5 text-blue-500 shrink-0" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                                        Document {i + 1}
                                    </span>
                                    <DownloadIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                </a>
                            ))}
                        </div>
                    )}
                    {/* Link Attachment with Preview */}
                    {selectedTopic.linkUrl && (
                        <LinkPreview url={selectedTopic.linkUrl} />
                    )}
                    {/* Like/Dislike for Announcements */}
                    {selectedTopic.category === "Announcements" && (
                        <div className="mt-3 flex items-center gap-4">
                            {(() => {
                                const topicLikes = selectedTopic.likes || [];
                                const likes = topicLikes.filter((l) => !l.isDislike);
                                const dislikes = topicLikes.filter((l) => l.isDislike);
                                const userLiked = likes.some((l) => l.userId === currentUserId);
                                const userDisliked = dislikes.some((l) => l.userId === currentUserId);
                                return (
                                    <>
                                        <button
                                            onClick={() => onToggleTopicLike(selectedTopic.id, false)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${userLiked ? "text-blue-600 bg-blue-50 dark:bg-blue-950" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                                        >
                                            <ThumbsUpIcon className={`h-4 w-4 ${userLiked ? "fill-current" : ""}`} />
                                            {likes.length > 0 && <span>{likes.length}</span>}
                                        </button>
                                        <button
                                            onClick={() => onToggleTopicLike(selectedTopic.id, true)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${userDisliked ? "text-red-600 bg-red-50 dark:bg-red-950" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                                        >
                                            <ThumbsDownIcon className={`h-4 w-4 ${userDisliked ? "fill-current" : ""}`} />
                                            {dislikes.length > 0 && <span>{dislikes.length}</span>}
                                        </button>
                                        {isAdmin && (
                                            <button
                                                onClick={() => {
                                                    const newTitle = prompt("Edit announcement title:", selectedTopic.title);
                                                    if (newTitle && newTitle.trim()) {
                                                        onEditTopic(selectedTopic.id, { title: newTitle.trim() });
                                                    }
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-auto"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                                Edit
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Messages List */}
                {selectedTopic.replies.map((reply, idx) => {
                    const prevReply =
                        idx > 0 ? selectedTopic.replies[idx - 1] : null;

                    return (
                        <CommunityPostCard
                            key={reply.id}
                            reply={reply}
                            prevReply={prevReply}
                            allReplies={selectedTopic.replies}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            editingReplyId={editingReplyId}
                            editingContent={editingContent}
                            activeMessageId={activeMessageId}
                            onSetEditingContent={setEditingContent}
                            onEditReply={onEditReply}
                            onCancelEdit={() => { setEditingReplyId(null); setEditingContent(""); }}
                            onMessageTap={onMessageTap}
                            onUserClick={onUserClick}
                            onDeleteReply={(replyId) => { onDeleteReply(replyId); setActiveMessageId(null); }}
                            onReportChat={(replyId) => { onReportChat(replyId); setActiveMessageId(null); }}
                            onReplyTo={onReplyTo}
                            onStartEditReply={onStartEditReply}
                            onVotePoll={onVotePoll}
                        />
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {selectedTopic.chatEnabled === false ? (
                <div className="px-4 pb-4 pt-3 shrink-0">
                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                        <MessageCircleOffIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Chat is disabled — only viewing is allowed
                        </span>
                    </div>
                </div>
            ) : (
            <div className="px-4 pb-4 pt-1 shrink-0">
                {/* Reply indicator */}
                {replyingTo && (
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-1 rounded-t-lg bg-gray-100 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300">
                        <ReplyIcon className="h-3 w-3" />
                        <span>
                            Replying to{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {getDisplayName(replyingTo.user)}
                            </span>
                        </span>
                        <button
                            onClick={() => setReplyingTo(null)}
                            className="ml-auto hover:text-gray-900 dark:hover:text-white"
                        >
                            <XIcon className="h-3 w-3" />
                        </button>
                    </div>
                )}

                {/* Pending attachments preview */}
                {(pendingImage || pendingImages.length > 0 || pendingVideos.length > 0 || pendingAudios.length > 0 || pendingDocuments.length > 0 || pendingVoiceNote || pendingLinkUrl || pendingPollQuestion || pendingEventTitle) && (
                    <div className="px-3 py-2 mb-1 rounded-t-lg bg-gray-100 dark:bg-gray-900 space-y-2">
                        {/* Image previews */}
                        {(pendingImage || pendingImages.length > 0) && (
                            <div className="flex flex-wrap gap-2">
                                {pendingImage && (
                                    <div className="relative">
                                        <Image src={pendingImage} alt="Preview" width={80} height={60} unoptimized className="h-[60px] w-auto rounded" />
                                        <button onClick={() => { deleteBlobUrl(pendingImage); setPendingImage(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><XIcon className="h-2.5 w-2.5" /></button>
                                    </div>
                                )}
                                {pendingImages.map((img, idx) => (
                                    <div key={idx} className="relative">
                                        <Image src={img} alt={`Preview ${idx + 1}`} width={80} height={60} unoptimized className="h-[60px] w-auto rounded" />
                                        <button onClick={() => { deleteBlobUrl(img); setPendingImages((prev) => prev.filter((_, i) => i !== idx)); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><XIcon className="h-2.5 w-2.5" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Video previews */}
                        {pendingVideos.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {pendingVideos.map((vid, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-gray-200 dark:bg-gray-800 rounded px-2 py-1 text-xs">
                                        <VideoIcon className="h-3 w-3 text-green-500" />
                                        <span className="truncate max-w-[100px]">Video {idx + 1}</span>
                                        <button onClick={() => { deleteBlobUrl(vid); setPendingVideos((prev) => prev.filter((_, i) => i !== idx)); }} className="text-red-400"><XIcon className="h-3 w-3" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Audio previews */}
                        {pendingAudios.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {pendingAudios.map((aud, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-gray-200 dark:bg-gray-800 rounded px-2 py-1 text-xs">
                                        <Music2Icon className="h-3 w-3 text-purple-500" />
                                        <span>Audio {idx + 1}</span>
                                        <button onClick={() => { deleteBlobUrl(aud); setPendingAudios((prev) => prev.filter((_, i) => i !== idx)); }} className="text-red-400"><XIcon className="h-3 w-3" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Document previews */}
                        {pendingDocuments.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {pendingDocuments.map((doc, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-gray-200 dark:bg-gray-800 rounded px-2 py-1 text-xs">
                                        <FileIcon className="h-3 w-3 text-blue-500" />
                                        <span>Document {idx + 1}</span>
                                        <button onClick={() => { deleteBlobUrl(doc); setPendingDocuments((prev) => prev.filter((_, i) => i !== idx)); }} className="text-red-400"><XIcon className="h-3 w-3" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Voice note preview */}
                        {pendingVoiceNote && (
                            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 rounded px-2 py-1">
                                <MicIcon className="h-3 w-3 text-green-500" />
                                <audio src={pendingVoiceNote} controls className="h-7 flex-1" />
                                <button onClick={() => { if (pendingVoiceNote) deleteBlobUrl(pendingVoiceNote); setPendingVoiceNote(null); }} className="text-red-400"><XIcon className="h-3 w-3" /></button>
                            </div>
                        )}
                        {/* Link preview */}
                        {pendingLinkUrl && (
                            <div className="flex items-center gap-2 text-xs">
                                <LinkIcon className="h-3 w-3 text-blue-500" />
                                <span className="truncate text-blue-500">{pendingLinkUrl}</span>
                                <button onClick={() => { setPendingLinkUrl(""); setShowLinkInput(false); }} className="text-red-400"><XIcon className="h-3 w-3" /></button>
                            </div>
                        )}
                        {/* Poll preview */}
                        {pendingPollQuestion && (
                            <div className="flex items-center gap-2 text-xs">
                                <BarChart3Icon className="h-3 w-3 text-indigo-500" />
                                <span>Poll: {pendingPollQuestion}</span>
                                <button onClick={() => { setPendingPollQuestion(""); setPendingPollOptions(["", ""]); setShowPollCreator(false); }} className="text-red-400"><XIcon className="h-3 w-3" /></button>
                            </div>
                        )}
                        {/* Event preview */}
                        {pendingEventTitle && (
                            <div className="flex items-center gap-2 text-xs">
                                <CalendarIcon className="h-3 w-3 text-green-500" />
                                <span>Event: {pendingEventTitle}</span>
                                <button onClick={() => { setPendingEventTitle(""); setPendingEventDate(""); setPendingEventLocation(""); setShowEventCreator(false); }} className="text-red-400"><XIcon className="h-3 w-3" /></button>
                            </div>
                        )}
                    </div>
                )}

                {/* Poll Creator */}
                {showPollCreator && (
                    <div className="px-3 py-2 mb-1 rounded-lg bg-gray-100 dark:bg-gray-900 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <BarChart3Icon className="h-4 w-4 text-indigo-500" /> Create Poll
                            </div>
                            <button onClick={() => setShowPollCreator(false)} className="text-gray-400"><XIcon className="h-4 w-4" /></button>
                        </div>
                        <Input placeholder="Ask a question..." value={pendingPollQuestion} onChange={(e) => setPendingPollQuestion(e.target.value)} className="text-sm h-8" />
                        {pendingPollOptions.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <Input placeholder={`Option ${idx + 1}`} value={opt} onChange={(e) => { const newOpts = [...pendingPollOptions]; newOpts[idx] = e.target.value; setPendingPollOptions(newOpts); }} className="text-sm h-7 flex-1" />
                                {pendingPollOptions.length > 2 && (
                                    <button onClick={() => setPendingPollOptions((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400"><XIcon className="h-3 w-3" /></button>
                                )}
                            </div>
                        ))}
                        <button onClick={() => setPendingPollOptions((prev) => [...prev, ""])} className="text-xs text-indigo-500 hover:text-indigo-600">+ Add option</button>
                    </div>
                )}

                {/* Event Creator */}
                {showEventCreator && (
                    <div className="px-3 py-2 mb-1 rounded-lg bg-gray-100 dark:bg-gray-900 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <CalendarIcon className="h-4 w-4 text-green-500" /> Create Event
                            </div>
                            <button onClick={() => setShowEventCreator(false)} className="text-gray-400"><XIcon className="h-4 w-4" /></button>
                        </div>
                        <Input placeholder="Event title..." value={pendingEventTitle} onChange={(e) => setPendingEventTitle(e.target.value)} className="text-sm h-8" />
                        <Input type="datetime-local" value={pendingEventDate} onChange={(e) => setPendingEventDate(e.target.value)} className="text-sm h-8" />
                        <Input placeholder="Location (optional)" value={pendingEventLocation} onChange={(e) => setPendingEventLocation(e.target.value)} className="text-sm h-8" />
                    </div>
                )}

                {/* Link Input */}
                {showLinkInput && (
                    <div className="px-3 py-2 mb-1 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-blue-500 shrink-0" />
                        <Input placeholder="Paste a link URL..." value={pendingLinkUrl} onChange={(e) => setPendingLinkUrl(e.target.value)} className="text-sm h-8 flex-1" />
                        <button onClick={() => setShowLinkInput(false)} className="text-gray-400"><XIcon className="h-4 w-4" /></button>
                    </div>
                )}

                <div
                    className={`flex items-end gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 ${
                        replyingTo || pendingImage || pendingImages.length > 0 || pendingVideos.length > 0 || pendingDocuments.length > 0 || pendingAudios.length > 0 || pendingVoiceNote || pendingPollQuestion || pendingEventTitle || pendingLinkUrl
                            ? "rounded-t-none"
                            : ""
                    }`}
                >
                    {/* Attachment panel toggle (WhatsApp-style) */}
                    <div className="relative shrink-0 mb-0.5">
                        <button
                            type="button"
                            onClick={() => setShowAttachmentPanel(!showAttachmentPanel)}
                            className="p-1 h-8 w-8 rounded-full text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <PlusIcon className="h-5 w-5" />
                        </button>

                        {/* WhatsApp-style attachment panel */}
                        {showAttachmentPanel && (
                            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-3 w-64 z-50">
                                <div className="grid grid-cols-3 gap-2">
                                    {/* Image */}
                                    <label className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                            <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Image</span>
                                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                                            const files = e.target.files;
                                            if (files) Array.from(files).forEach((f) => onFileUpload(f, "image"));
                                            e.target.value = "";
                                            setShowAttachmentPanel(false);
                                        }} />
                                    </label>
                                    {/* Video */}
                                    <label className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                            <VideoIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Video</span>
                                        <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => {
                                            const files = e.target.files;
                                            if (files) Array.from(files).forEach((f) => onFileUpload(f, "video"));
                                            e.target.value = "";
                                            setShowAttachmentPanel(false);
                                        }} />
                                    </label>
                                    {/* Document */}
                                    <label className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                            <FileIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Document</span>
                                        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" multiple className="hidden" onChange={(e) => {
                                            const files = e.target.files;
                                            if (files) Array.from(files).forEach((f) => onFileUpload(f, "document"));
                                            e.target.value = "";
                                            setShowAttachmentPanel(false);
                                        }} />
                                    </label>
                                    {/* Audio */}
                                    <label className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                                            <Music2Icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Audio</span>
                                        <input type="file" accept="audio/*" multiple className="hidden" onChange={(e) => {
                                            const files = e.target.files;
                                            if (files) Array.from(files).forEach((f) => onFileUpload(f, "audio"));
                                            e.target.value = "";
                                            setShowAttachmentPanel(false);
                                        }} />
                                    </label>
                                    {/* Poll */}
                                    <button onClick={() => { setShowPollCreator(true); setShowAttachmentPanel(false); }} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                            <BarChart3Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Poll</span>
                                    </button>
                                    {/* Event */}
                                    <button onClick={() => { setShowEventCreator(true); setShowAttachmentPanel(false); }} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                                            <CalendarIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Event</span>
                                    </button>
                                    {/* Link */}
                                    <button onClick={() => { setShowLinkInput(true); setShowAttachmentPanel(false); }} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                                            <LinkIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Link</span>
                                    </button>
                                    {/* Contact - placeholder */}
                                    <button onClick={() => toast.info("Contact sharing will open your phone's contacts")} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                                            <BookUserIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Contact</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Voice recording button */}
                    <div className="shrink-0 mb-0.5">
                        <button
                            type="button"
                            onClick={isRecording ? onStopRecording : onStartRecording}
                            className={`p-1 h-8 w-8 rounded-full transition-colors ${isRecording ? "text-red-500 bg-red-50 dark:bg-red-950 animate-pulse" : "text-gray-600 hover:text-green-600"}`}
                            title={isRecording ? "Stop recording" : "Record voice note"}
                        >
                            <MicIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Text input */}
                    <textarea
                        ref={inputRef}
                        value={messageText}
                        onChange={(e) => {
                            setMessageText(e.target.value);
                            // Detect @mention typing
                            const val = e.target.value;
                            const lastAt = val.lastIndexOf("@");
                            if (lastAt >= 0) {
                                const afterAt = val.slice(lastAt + 1);
                                if (
                                    afterAt.length < 20 &&
                                    !afterAt.includes(" ")
                                ) {
                                    setShowMentions(true);
                                    setMentionFilter(afterAt);
                                } else {
                                    setShowMentions(false);
                                }
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message #${selectedTopic.title.toLowerCase().replace(/\s+/g, "-")}`}
                        rows={1}
                        className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none outline-none max-h-[120px] py-1"
                        style={{
                            height: "auto",
                            minHeight: "24px",
                        }}
                    />

                    {/* Emoji picker toggle */}
                    <div className="relative shrink-0 mb-0.5">
                        <button
                            onClick={() =>
                                setShowEmojiPicker(!showEmojiPicker)
                            }
                            className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <SmileIcon className="h-5 w-5" />
                        </button>

                        {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-3 w-64 z-50">
                                <div className="grid grid-cols-8 gap-1">
                                    {EMOJI_LIST.map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() =>
                                                handleEmoji(emoji)
                                            }
                                            className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-lg"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* @mention button */}
                    <div className="relative shrink-0 mb-0.5">
                        <button
                            onClick={() => {
                                setShowMentions(!showMentions);
                                setMentionFilter("");
                            }}
                            className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <AtSignIcon className="h-5 w-5" />
                        </button>

                        {showMentions && (
                            <div className="absolute bottom-full right-0 mb-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl w-56 max-h-48 overflow-y-auto z-50">
                                <div className="p-2 border-b border-gray-200 dark:border-gray-800">
                                    <Input
                                        placeholder="Search members..."
                                        value={mentionFilter}
                                        onChange={(e) =>
                                            setMentionFilter(e.target.value)
                                        }
                                        className="h-7 text-xs bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>
                                {filteredUsers.slice(0, 10).map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleMention(u)}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-200"
                                    >
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage
                                                src={
                                                    u.image || undefined
                                                }
                                            />
                                            <AvatarFallback className="text-xs bg-indigo-500 text-white">
                                                {u.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{u.name}</span>
                                        {u.role === "admin" && (
                                            <Badge className="text-xs bg-red-500/20 text-red-400 border-0 ml-auto">
                                                Admin
                                            </Badge>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* @mention all button */}
                    <div className="shrink-0 mb-0.5">
                        <button
                            onClick={onMentionAll}
                            className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-orange-500 transition-colors"
                            title="Mention all users"
                        >
                            <UsersIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Send button */}
                    <button
                        onClick={onSendMessage}
                        disabled={!messageText.trim() && !pendingImage}
                        className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
                    >
                        <SendIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
            )}
        </div>
    );
}

