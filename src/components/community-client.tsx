"use client";

import React, { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HashIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import {
    createTopic,
    addReply,
    getTopicWithReplies,
    deleteTopic,
    deleteReply,
    editReply,
    editTopic,
    toggleTopicLike,
    toggleTopicChat,
    voteOnPoll,
} from "@/app/actions/community";
import { createReport, sendWarning, banUserById } from "@/app/actions/admin";

import {
    TopicData,
    TopicDetail,
    CommunityUser,
    ReplyData,
    NewTopicState,
} from "./community/types";
import {
    CommunityMembersList,
    CommunityCommentSection,
    CommunityPostModal,
    CommunityCreatePost,
} from "./community";
import { getDisplayName } from "./community/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { prepareImageForUpload } from "@/lib/client-image-upload";
import { extractUploadThingFileUrl, uploadSingleFileToUploadThing } from "@/lib/uploadthing-client";

/* ─── Props Interface ─────────────────────────────────── */

interface CommunityClientProps {
    initialTopics: TopicData[];
    users: CommunityUser[];
    isAdmin?: boolean;
    currentUserId?: string;
    currentUserRole?: string;
}

export default function CommunityClient({
    initialTopics,
    users,
    isAdmin = false,
    currentUserId,
    currentUserRole,
}: CommunityClientProps) {
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const isSuperAdmin = currentUserRole === "superadmin";

    const [topics, setTopics] = React.useState(initialTopics);
    const [selectedTopic, setSelectedTopic] =
        React.useState<TopicDetail | null>(null);
    const [messageText, setMessageText] = React.useState("");
    const [pendingImage, setPendingImage] = React.useState<string | null>(null);
    const [replyingTo, setReplyingTo] = React.useState<ReplyData | null>(null);
    const [showCreate, setShowCreate] = React.useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
    const [showMentions, setShowMentions] = React.useState(false);
    const [mentionFilter, setMentionFilter] = React.useState("");
    const [showMobileChannels, setShowMobileChannels] = React.useState(false);
    const [editingReplyId, setEditingReplyId] = React.useState<string | null>(null);
    const [editingContent, setEditingContent] = React.useState("");
    const [activeMessageId, setActiveMessageId] = React.useState<string | null>(null);
    const [reportingReplyId, setReportingReplyId] = React.useState<string | null>(null);
    const [reportCategory, setReportCategory] = React.useState("");
    const [reportDetails, setReportDetails] = React.useState("");
    const [userProfileId, setUserProfileId] = React.useState<string | null>(null);
    const [warningMessage, setWarningMessage] = React.useState("");
    const [banReason, setBanReason] = React.useState("");
    const [showBanDialog, setShowBanDialog] = React.useState(false);
    const [showWarningDialog, setShowWarningDialog] = React.useState(false);
    const [showAttachmentPanel, setShowAttachmentPanel] = React.useState(false);
    const [pendingImages, setPendingImages] = React.useState<string[]>([]);
    const [pendingVideos, setPendingVideos] = React.useState<string[]>([]);
    const [pendingAudios, setPendingAudios] = React.useState<string[]>([]);
    const [pendingDocuments, setPendingDocuments] = React.useState<string[]>([]);
    const [pendingVoiceNote, setPendingVoiceNote] = React.useState<string | null>(null);
    const [pendingLinkUrl, setPendingLinkUrl] = React.useState("");
    const [pendingPollQuestion, setPendingPollQuestion] = React.useState("");
    const [pendingPollOptions, setPendingPollOptions] = React.useState<string[]>(["", ""]);
    const [pendingEventTitle, setPendingEventTitle] = React.useState("");
    const [pendingEventDate, setPendingEventDate] = React.useState("");
    const [pendingEventLocation, setPendingEventLocation] = React.useState("");
    const [showPollCreator, setShowPollCreator] = React.useState(false);
    const [showEventCreator, setShowEventCreator] = React.useState(false);
    const [showLinkInput, setShowLinkInput] = React.useState(false);
    const [isRecording, setIsRecording] = React.useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [newTopic, setNewTopic] = React.useState<NewTopicState>({
        title: "",
        content: "",
        category: "",
        image: "",
        images: [] as string[],
        video: "",
        videos: [] as string[],
        documents: [] as string[],
        linkUrl: "",
    });
    const [topicUploading, setTopicUploading] = React.useState(false);
    const topicImageRef = useRef<HTMLInputElement>(null);
    const topicVideoRef = useRef<HTMLInputElement>(null);
    const topicDocRef = useRef<HTMLInputElement>(null);
    const { startUpload: startImageUpload } = useUploadThing("imageUploader");

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }, []);

    /* ─── Handlers ──────────────────────────────────────── */

    const handleCreateTopic = async () => {
        if (
            !newTopic.title.trim() ||
            !newTopic.content.trim() ||
            !newTopic.category
        ) {
            toast.error("Please fill in all fields");
            return;
        }
        if (newTopic.category === "Announcements" && !isAdmin) {
            toast.error("Only admins can create announcements");
            return;
        }
        try {
            await createTopic({
                title: newTopic.title,
                content: newTopic.content,
                category: newTopic.category,
                image: newTopic.image || undefined,
                images: newTopic.images.length > 0 ? newTopic.images : undefined,
                video: newTopic.video || undefined,
                videos: newTopic.videos.length > 0 ? newTopic.videos : undefined,
                documents: newTopic.documents.length > 0 ? newTopic.documents : undefined,
                linkUrl: newTopic.linkUrl || undefined,
            });
            setShowCreate(false);
            setNewTopic({ title: "", content: "", category: "", image: "", images: [], video: "", videos: [], documents: [], linkUrl: "" });
            toast.success(newTopic.category === "Announcements" ? "Announcement published! All users have been notified." : "Channel created!");
            router.refresh();
        } catch {
            toast.error("Failed to create channel");
        }
    };

    const handleTopicFileUpload = async (file: File, type: "image" | "video" | "document") => {
        setTopicUploading(true);
        try {
            if (type === "image") {
                const normalizedFile = await prepareImageForUpload(file);
                const uploaded = await startImageUpload([normalizedFile]);
                const url = extractUploadThingFileUrl(uploaded?.[0]);
                if (!url) throw new Error("Image upload failed: UploadThing returned no file URL.");
                setNewTopic((p) => ({ ...p, images: [...p.images, url] }));
                return;
            }

            const endpoint = type === "video" ? "videoUploader" : "documentUploader";
            const url = await uploadSingleFileToUploadThing(endpoint, file);
            switch (type) {
                case "video": setNewTopic((p) => ({ ...p, videos: [...p.videos, url] })); break;
                case "document": setNewTopic((p) => ({ ...p, documents: [...p.documents, url] })); break;
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to upload ${type}`);
        } finally {
            setTopicUploading(false);
        }
    };

    const handleToggleChat = async (topicId: string) => {
        try {
            const result = await toggleTopicChat(topicId);
            setSelectedTopic((prev) => prev ? { ...prev, chatEnabled: result.chatEnabled } : prev);
            setTopics((prev) => prev.map((t) => t.id === topicId ? { ...t, chatEnabled: result.chatEnabled } : t));
            toast.success(result.chatEnabled ? "Chat enabled" : "Chat disabled \u2014 members can only view messages");
        } catch {
            toast.error("Failed to toggle chat");
        }
    };

    const handleSelectTopic = async (topicId: string) => {
        try {
            const topic = await getTopicWithReplies(topicId);
            if (topic) {
                setSelectedTopic(JSON.parse(JSON.stringify(topic)));
                setShowMobileChannels(false);
                scrollToBottom();
            }
        } catch {
            toast.error("Failed to load channel");
        }
    };

    const handleSendMessage = async () => {
        if ((!messageText.trim() && !pendingImage && pendingImages.length === 0 && pendingVideos.length === 0 && pendingAudios.length === 0 && pendingDocuments.length === 0 && !pendingVoiceNote && !pendingPollQuestion && !pendingEventTitle) || !selectedTopic) return;
        try {
            const reply = await addReply({
                topicId: selectedTopic.id,
                content: messageText.trim(),
                parentId: replyingTo?.id,
                image: pendingImage || undefined,
                images: pendingImages.length > 0 ? pendingImages : undefined,
                video: pendingVideos.length === 1 ? pendingVideos[0] : undefined,
                videos: pendingVideos.length > 1 ? pendingVideos : undefined,
                audio: pendingAudios.length === 1 ? pendingAudios[0] : undefined,
                audios: pendingAudios.length > 1 ? pendingAudios : undefined,
                voiceNote: pendingVoiceNote || undefined,
                document: pendingDocuments.length === 1 ? pendingDocuments[0] : undefined,
                documents: pendingDocuments.length > 1 ? pendingDocuments : undefined,
                linkUrl: pendingLinkUrl.trim() || undefined,
                pollQuestion: pendingPollQuestion.trim() || undefined,
                pollOptions: pendingPollQuestion.trim() ? pendingPollOptions.filter((o) => o.trim()) : undefined,
                eventTitle: pendingEventTitle.trim() || undefined,
                eventDate: pendingEventDate || undefined,
                eventLocation: pendingEventLocation.trim() || undefined,
            });
            const replyData = { ...reply, children: [], pollVotes: (reply.pollVotes as Record<string, number> | null) || null } as ReplyData;
            setSelectedTopic((prev) => {
                if (!prev) return prev;
                if (replyingTo?.id) {
                    return {
                        ...prev,
                        replies: prev.replies.map((r) =>
                            r.id === replyingTo.id
                                ? { ...r, children: [...(r.children || []), replyData] }
                                : {
                                      ...r,
                                      children: (r.children || []).map((c) =>
                                          c.id === replyingTo.id
                                              ? { ...c, children: [...(c.children || []), replyData] }
                                              : c
                                      ),
                                  }
                        ),
                    };
                }
                return {
                    ...prev,
                    replies: [...prev.replies, replyData],
                };
            });
            setMessageText("");
            setPendingImage(null);
            setPendingImages([]);
            setPendingVideos([]);
            setPendingAudios([]);
            setPendingDocuments([]);
            setPendingVoiceNote(null);
            setPendingLinkUrl("");
            setPendingPollQuestion("");
            setPendingPollOptions(["", ""]);
            setPendingEventTitle("");
            setPendingEventDate("");
            setPendingEventLocation("");
            setShowPollCreator(false);
            setShowEventCreator(false);
            setShowLinkInput(false);
            setShowAttachmentPanel(false);
            setReplyingTo(null);
            scrollToBottom();
        } catch {
            toast.error("Failed to send message");
        }
    };

    const handleDeleteTopic = async (topicId: string) => {
        try {
            await deleteTopic(topicId);
            setTopics((prev) => prev.filter((t) => t.id !== topicId));
            if (selectedTopic?.id === topicId) {
                setSelectedTopic(null);
            }
            toast.success("Channel deleted");
            router.refresh();
        } catch {
            toast.error("Failed to delete channel");
        }
    };

    const handleDeleteReply = async (replyId: string) => {
        if (!selectedTopic) return;
        try {
            await deleteReply(replyId);
            setSelectedTopic({
                ...selectedTopic,
                replies: selectedTopic.replies
                    .filter((r) => r.id !== replyId)
                    .map((r) => ({
                        ...r,
                        children: (r.children || []).filter((c) => c.id !== replyId),
                    })),
            });
            toast.success("Message deleted");
        } catch {
            toast.error("Failed to delete message");
        }
    };

    const handleReportChat = async (replyId: string) => {
        setReportingReplyId(replyId);
        setActiveMessageId(null);
    };

    const submitChatReport = async () => {
        if (!reportingReplyId || !reportCategory) return;
        const fullReason = reportCategory + (reportDetails.trim() ? `: ${reportDetails.trim()}` : "");
        try {
            await createReport({
                contentType: "REPLY",
                contentId: reportingReplyId,
                reason: fullReason,
            });
            toast.success("Chat reported to admins");
            setReportingReplyId(null);
            setReportCategory("");
            setReportDetails("");
        } catch {
            toast.error("Failed to report chat");
        }
    };

    const handleEditReply = async (replyId: string) => {
        if (!editingContent.trim() || !selectedTopic) return;
        try {
            await editReply(replyId, editingContent);
            setSelectedTopic({
                ...selectedTopic,
                replies: selectedTopic.replies.map((r) =>
                    r.id === replyId
                        ? { ...r, content: editingContent }
                        : {
                              ...r,
                              children: (r.children || []).map((c) =>
                                  c.id === replyId ? { ...c, content: editingContent } : c
                              ),
                          }
                ),
            });
            setEditingReplyId(null);
            setEditingContent("");
            toast.success("Message updated");
        } catch {
            toast.error("Failed to edit message");
        }
    };

    const handleMessageTap = (replyId: string) => {
        setActiveMessageId(activeMessageId === replyId ? null : replyId);
    };

    const handleUserClick = (userId: string) => {
        if (isAdmin && userId !== currentUserId) {
            setUserProfileId(userId);
        }
    };

    const selectedUser = userProfileId ? users.find(u => u.id === userProfileId) : null;

    const handleSendWarning = async () => {
        if (!userProfileId || !warningMessage.trim()) return;
        try {
            await sendWarning(userProfileId, warningMessage);
            toast.success("Warning sent successfully");
            setShowWarningDialog(false);
            setWarningMessage("");
            setUserProfileId(null);
        } catch {
            toast.error("Failed to send warning");
        }
    };

    const handleBanUser = async () => {
        if (!userProfileId || !banReason.trim()) return;
        try {
            await banUserById(userProfileId, banReason);
            toast.success("User banned successfully");
            setShowBanDialog(false);
            setBanReason("");
            setUserProfileId(null);
            router.refresh();
        } catch {
            toast.error("Failed to ban user");
        }
    };

    const handleToggleTopicLike = async (topicId: string, isDislike: boolean) => {
        try {
            await toggleTopicLike(topicId, isDislike);
            setTopics((prev) =>
                prev.map((t) => {
                    if (t.id !== topicId) return t;
                    const existingLikes = t.likes || [];
                    const existing = existingLikes.find((l) => l.userId === currentUserId);
                    let newLikes;
                    if (existing) {
                        if (existing.isDislike === isDislike) {
                            newLikes = existingLikes.filter((l) => l.userId !== currentUserId);
                        } else {
                            newLikes = existingLikes.map((l) =>
                                l.userId === currentUserId ? { ...l, isDislike } : l
                            );
                        }
                    } else {
                        newLikes = [...existingLikes, { userId: currentUserId || "", isDislike }];
                    }
                    return { ...t, likes: newLikes };
                })
            );
            if (selectedTopic?.id === topicId) {
                setSelectedTopic((prev) => {
                    if (!prev) return prev;
                    const existingLikes = prev.likes || [];
                    const existing = existingLikes.find((l) => l.userId === currentUserId);
                    let newLikes;
                    if (existing) {
                        if (existing.isDislike === isDislike) {
                            newLikes = existingLikes.filter((l) => l.userId !== currentUserId);
                        } else {
                            newLikes = existingLikes.map((l) =>
                                l.userId === currentUserId ? { ...l, isDislike } : l
                            );
                        }
                    } else {
                        newLikes = [...existingLikes, { userId: currentUserId || "", isDislike }];
                    }
                    return { ...prev, likes: newLikes };
                });
            }
        } catch {
            toast.error("Failed to react");
        }
    };

    const handleEditTopic = async (topicId: string, data: { title?: string; content?: string }) => {
        try {
            await editTopic(topicId, data);
            setTopics((prev) =>
                prev.map((t) =>
                    t.id === topicId ? { ...t, ...data } : t
                )
            );
            if (selectedTopic?.id === topicId) {
                setSelectedTopic((prev) =>
                    prev ? { ...prev, ...data } : prev
                );
            }
            toast.success("Updated successfully");
        } catch {
            toast.error("Failed to update");
        }
    };

    const handleMentionAll = () => {
        const mentionableUsers = users.filter((u) => u.name && u.id !== currentUserId);
        const allNames = mentionableUsers.map((u) => `@${u.name}`).join(" ");
        setMessageText((prev) => (prev ? prev + " " + allNames + " " : allNames + " "));
        toast.success(`Mentioned ${mentionableUsers.length} users`);
    };

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                try {
                    const audioFile = new File([audioBlob], "voice-note.webm", { type: "audio/webm" });
                    const url = await uploadSingleFileToUploadThing("audioUploader", audioFile);
                    setPendingVoiceNote(url);
                } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to upload voice note");
                }
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch {
            toast.error("Microphone access denied");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleFileUpload = async (file: File, type: "image" | "video" | "audio" | "document") => {
        try {
            if (type === "image") {
                const normalizedFile = await prepareImageForUpload(file);
                const uploaded = await startImageUpload([normalizedFile]);
                const url = extractUploadThingFileUrl(uploaded?.[0]);
                if (!url) throw new Error("Image upload failed: UploadThing returned no file URL.");
                setPendingImages((prev) => [...prev, url]);
                return;
            }

            let endpoint: "videoUploader" | "audioUploader" | "documentUploader";
            switch (type) {
                case "video":
                    endpoint = "videoUploader";
                    break;
                case "audio":
                    endpoint = "audioUploader";
                    break;
                default:
                    endpoint = "documentUploader";
            }
            const url = await uploadSingleFileToUploadThing(endpoint, file);
            switch (type) {
                case "video": setPendingVideos((prev) => [...prev, url]); break;
                case "audio": setPendingAudios((prev) => [...prev, url]); break;
                case "document": setPendingDocuments((prev) => [...prev, url]); break;
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to upload ${type}`);
        }
    };

    const handleVotePoll = async (replyId: string, optionIndex: number) => {
        try {
            const result = await voteOnPoll(replyId, optionIndex);
            if (selectedTopic) {
                setSelectedTopic({
                    ...selectedTopic,
                    replies: selectedTopic.replies.map((r) =>
                        r.id === replyId ? { ...r, pollVotes: result.votes } : {
                            ...r,
                            children: (r.children || []).map((c) =>
                                c.id === replyId ? { ...c, pollVotes: result.votes } : c
                            ),
                        }
                    ),
                });
            }
        } catch {
            toast.error("Failed to vote");
        }
    };

    const handleReplyTo = (reply: ReplyData) => {
        setReplyingTo(reply);
        setActiveMessageId(null);
        const userName = getDisplayName(reply.user).replace(/\s+/g, "");
        setMessageText(`@${userName} `);
    };

    const handleStartEditReply = (replyId: string, content: string) => {
        setEditingReplyId(replyId);
        setEditingContent(content);
        setActiveMessageId(null);
    };

    /* ─── Channel Sidebar ──────────────────────────────── */

    const channelSidebar = (
        <CommunityMembersList
            topics={topics}
            selectedTopicId={selectedTopic?.id ?? null}
            isAdmin={isAdmin}
            users={users}
            onSelectTopic={handleSelectTopic}
            onDeleteTopic={handleDeleteTopic}
            onShowCreate={() => setShowCreate(true)}
        />
    );

    /* ─── Main Layout ──────────────────────────────────── */

    return (
        <div className="h-[calc(100vh-6rem)] flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
            {/* Desktop Sidebar */}
            <div className="hidden md:block w-60 shrink-0 border-r border-gray-200 dark:border-gray-800">
                {channelSidebar}
            </div>

            {/* Mobile Sidebar Overlay */}
            {showMobileChannels && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowMobileChannels(false)}
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-64">
                        {channelSidebar}
                    </div>
                </div>
            )}

            {/* Message Area */}
            <div className="flex-1 min-w-0 relative">
                {selectedTopic ? (
                    <CommunityCommentSection
                        selectedTopic={selectedTopic}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        isSuperAdmin={isSuperAdmin}
                        users={users}
                        messageText={messageText}
                        setMessageText={setMessageText}
                        pendingImage={pendingImage}
                        setPendingImage={setPendingImage}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        showEmojiPicker={showEmojiPicker}
                        setShowEmojiPicker={setShowEmojiPicker}
                        showMentions={showMentions}
                        setShowMentions={setShowMentions}
                        mentionFilter={mentionFilter}
                        setMentionFilter={setMentionFilter}
                        editingReplyId={editingReplyId}
                        setEditingReplyId={setEditingReplyId}
                        editingContent={editingContent}
                        setEditingContent={setEditingContent}
                        activeMessageId={activeMessageId}
                        setActiveMessageId={setActiveMessageId}
                        pendingImages={pendingImages}
                        setPendingImages={setPendingImages}
                        pendingVideos={pendingVideos}
                        setPendingVideos={setPendingVideos}
                        pendingAudios={pendingAudios}
                        setPendingAudios={setPendingAudios}
                        pendingDocuments={pendingDocuments}
                        setPendingDocuments={setPendingDocuments}
                        pendingVoiceNote={pendingVoiceNote}
                        setPendingVoiceNote={setPendingVoiceNote}
                        pendingLinkUrl={pendingLinkUrl}
                        setPendingLinkUrl={setPendingLinkUrl}
                        pendingPollQuestion={pendingPollQuestion}
                        setPendingPollQuestion={setPendingPollQuestion}
                        pendingPollOptions={pendingPollOptions}
                        setPendingPollOptions={setPendingPollOptions}
                        pendingEventTitle={pendingEventTitle}
                        setPendingEventTitle={setPendingEventTitle}
                        pendingEventDate={pendingEventDate}
                        setPendingEventDate={setPendingEventDate}
                        pendingEventLocation={pendingEventLocation}
                        setPendingEventLocation={setPendingEventLocation}
                        showPollCreator={showPollCreator}
                        setShowPollCreator={setShowPollCreator}
                        showEventCreator={showEventCreator}
                        setShowEventCreator={setShowEventCreator}
                        showLinkInput={showLinkInput}
                        setShowLinkInput={setShowLinkInput}
                        showAttachmentPanel={showAttachmentPanel}
                        setShowAttachmentPanel={setShowAttachmentPanel}
                        isRecording={isRecording}
                        messagesEndRef={messagesEndRef}
                        inputRef={inputRef}
                        onToggleChat={handleToggleChat}
                        onSendMessage={handleSendMessage}
                        onDeleteReply={handleDeleteReply}
                        onReportChat={handleReportChat}
                        onEditReply={handleEditReply}
                        onMessageTap={handleMessageTap}
                        onUserClick={handleUserClick}
                        onToggleTopicLike={handleToggleTopicLike}
                        onEditTopic={handleEditTopic}
                        onMentionAll={handleMentionAll}
                        onStartRecording={handleStartRecording}
                        onStopRecording={handleStopRecording}
                        onFileUpload={handleFileUpload}
                        onVotePoll={handleVotePoll}
                        onShowMobileChannels={() => setShowMobileChannels(true)}
                        onReplyTo={handleReplyTo}
                        onStartEditReply={handleStartEditReply}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-gray-950 text-center">
                        <button
                            onClick={() => setShowMobileChannels(true)}
                            className="md:hidden absolute top-3 left-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300"
                        >
                            <HashIcon className="h-5 w-5" />
                        </button>
                        <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                            <HashIcon className="h-12 w-12 text-indigo-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Welcome to CNERSH Community
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                            Select a channel from the sidebar to start chatting, or
                            create a new one.
                        </p>
                        <Button
                            onClick={() => setShowCreate(true)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white"
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Create Channel
                        </Button>
                    </div>
                )}
            </div>

            {/* Create Topic Dialog */}
            <CommunityCreatePost
                open={showCreate}
                onOpenChange={setShowCreate}
                newTopic={newTopic}
                setNewTopic={setNewTopic}
                isAdmin={isAdmin}
                topicUploading={topicUploading}
                onCreateTopic={handleCreateTopic}
                onFileUpload={handleTopicFileUpload}
                topicImageRef={topicImageRef as React.RefObject<HTMLInputElement>}
                topicVideoRef={topicVideoRef as React.RefObject<HTMLInputElement>}
                topicDocRef={topicDocRef as React.RefObject<HTMLInputElement>}
            />

            {/* Admin Dialogs */}
            <CommunityPostModal
                userProfileId={userProfileId}
                selectedUser={selectedUser}
                showBanDialog={showBanDialog}
                setShowBanDialog={setShowBanDialog}
                showWarningDialog={showWarningDialog}
                setShowWarningDialog={setShowWarningDialog}
                warningMessage={warningMessage}
                setWarningMessage={setWarningMessage}
                banReason={banReason}
                setBanReason={setBanReason}
                onSendWarning={handleSendWarning}
                onBanUser={handleBanUser}
                onCloseUserProfile={() => setUserProfileId(null)}
                reportingReplyId={reportingReplyId}
                reportCategory={reportCategory}
                setReportCategory={setReportCategory}
                reportDetails={reportDetails}
                setReportDetails={setReportDetails}
                onSubmitReport={submitChatReport}
                onCloseReport={() => { setReportingReplyId(null); setReportCategory(""); setReportDetails(""); }}
            />
        </div>
    );
}
