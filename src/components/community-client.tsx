"use client";

import React, { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import LinkPreview from "@/components/link-preview";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    HashIcon,
    PlusIcon,
    SendIcon,
    SmileIcon,
    ImageIcon,
    ReplyIcon,
    XIcon,
    UsersIcon,
    AtSignIcon,
    TrashIcon,
    FlagIcon,
    PencilIcon,
    CheckIcon,
    ShieldAlertIcon,
    BanIcon,
    VideoIcon,
    LinkIcon,
    ExternalLinkIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    MegaphoneIcon,
    FileIcon,
    MicIcon,
    BarChart3Icon,
    CalendarIcon,
    BookUserIcon,
    Music2Icon,
    UploadIcon,
    MessageCircleOffIcon,
    MessageCircleIcon,
    FileTextIcon,
    DownloadIcon,
} from "lucide-react";
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

/* ─── Types ───────────────────────────────────────────── */

interface TopicUser {
    id: string;
    name: string | null;
    image: string | null;
    role?: string | null;
}

interface CommunityUser {
    id: string;
    name: string | null;
    image: string | null;
    role: string | null;
}

interface TopicData {
    id: string;
    title: string;
    content: string;
    category: string;
    image?: string | null;
    images?: string[];
    video?: string | null;
    videos?: string[];
    documents?: string[];
    linkUrl?: string | null;
    chatEnabled?: boolean;
    createdAt: Date;
    userId?: string;
    user: TopicUser;
    _count: { replies: number; likes?: number };
    likes?: { userId: string; isDislike: boolean }[];
}

interface ReplyData {
    id: string;
    content: string;
    image?: string | null;
    images?: string[];
    video?: string | null;
    videos?: string[];
    audio?: string | null;
    audios?: string[];
    voiceNote?: string | null;
    document?: string | null;
    documents?: string[];
    linkUrl?: string | null;
    pollQuestion?: string | null;
    pollOptions?: string[];
    pollVotes?: Record<string, number> | null;
    eventTitle?: string | null;
    eventDate?: string | null;
    eventLocation?: string | null;
    createdAt: Date;
    user: TopicUser;
    parentId?: string | null;
    children?: ReplyData[];
}

interface TopicDetail {
    id: string;
    title: string;
    content: string;
    category: string;
    image?: string | null;
    images?: string[];
    video?: string | null;
    videos?: string[];
    documents?: string[];
    linkUrl?: string | null;
    chatEnabled?: boolean;
    createdAt: Date;
    userId?: string;
    user: TopicUser;
    replies: ReplyData[];
    likes?: { userId: string; isDislike: boolean }[];
}

const CATEGORIES = [
    "Announcements",
    "General",
    "Ethics",
    "Research",
    "Policy",
    "Technology",
    "Health",
    "Education",
];

const MESSAGE_GROUP_THRESHOLD_MS = 5 * 60 * 1000;

const EMOJI_LIST = [
    "😀", "😂", "😍", "🤔", "👍", "👎", "🎉", "🔥",
    "❤️", "💯", "🙏", "👏", "🤝", "💪", "✅", "⭐",
    "🚀", "💡", "📌", "🎯", "👀", "✨", "⚡", "🌟",
];

const CATEGORY_COLORS: Record<string, string> = {
    Announcements: "bg-yellow-500",
    General: "bg-gray-500",
    Ethics: "bg-purple-500",
    Research: "bg-blue-500",
    Policy: "bg-amber-500",
    Technology: "bg-green-500",
    Health: "bg-red-500",
    Education: "bg-indigo-500",
};

/* ─── Component ────────────────────────────────────────── */

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
    const [newTopic, setNewTopic] = React.useState({
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
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) {
                let errorMessage = "Upload failed";
                if (res.status === 413) {
                    errorMessage = "File is too large";
                } else {
                    try {
                        const d = await res.json();
                        errorMessage = d.error || errorMessage;
                    } catch {
                        // use default error message
                    }
                }
                throw new Error(errorMessage);
            }
            const data = await res.json();
            if (data.url) {
                switch (type) {
                    case "image": setNewTopic((p) => ({ ...p, images: [...p.images, data.url] })); break;
                    case "video": setNewTopic((p) => ({ ...p, videos: [...p.videos, data.url] })); break;
                    case "document": setNewTopic((p) => ({ ...p, documents: [...p.documents, data.url] })); break;
                }
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
            toast.success(result.chatEnabled ? "Chat enabled" : "Chat disabled — members can only view messages");
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
                    // Nest reply under its parent's children array
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
                // Top-level reply
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
            // Update local state
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
                    const formData = new FormData();
                    formData.append("file", audioBlob, "voice-note.webm");
                    const res = await fetch("/api/upload", { method: "POST", body: formData });
                    if (!res.ok) {
                        let errorMessage = "Upload failed";
                        try {
                            const d = await res.json();
                            errorMessage = d.error || errorMessage;
                        } catch {
                            if (res.status === 413) errorMessage = "File is too large for the server. Please try a smaller file.";
                        }
                        throw new Error(errorMessage);
                    }
                    const data = await res.json();
                    if (data.url) setPendingVoiceNote(data.url);
                } catch {
                    toast.error("Failed to upload voice note");
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
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) {
                let errorMessage = "Upload failed";
                try {
                    const d = await res.json();
                    errorMessage = d.error || errorMessage;
                } catch {
                    if (res.status === 413) errorMessage = "File is too large for the server. Please try a smaller file.";
                }
                throw new Error(errorMessage);
            }
            const data = await res.json();
            if (data.url) {
                switch (type) {
                    case "image": setPendingImages((prev) => [...prev, data.url]); break;
                    case "video": setPendingVideos((prev) => [...prev, data.url]); break;
                    case "audio": setPendingAudios((prev) => [...prev, data.url]); break;
                    case "document": setPendingDocuments((prev) => [...prev, data.url]); break;
                }
            }
        } catch {
            toast.error(`Failed to upload ${type}`);
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
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
        setMessageText((prev) => prev + `@${name} `);
        setShowMentions(false);
        inputRef.current?.focus();
    };

    const handleEmoji = (emoji: string) => {
        setMessageText((prev) => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const formatTime = (date: Date) =>
        new Date(date).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });

    const getDisplayName = (user: TopicUser) => {
        if (user.role === "admin" || user.role === "superadmin") {
            return "CNERSH Admin";
        }
        return user.name || "Unknown";
    };

    const renderMessageContent = (content: string) => {
        const parts = content.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith("@") && part.length > 1) {
                return (
                    <span
                        key={i}
                        className="bg-blue-500/20 text-blue-400 rounded px-0.5 cursor-pointer hover:bg-blue-500/30"
                    >
                        {part}
                    </span>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    const renderMessageAttachments = (reply: ReplyData) => {
        const attachments: React.ReactNode[] = [];

        // Multiple images
        const allImages = [...(reply.image ? [reply.image] : []), ...(reply.images || [])];
        if (allImages.length > 0) {
            attachments.push(
                <div key="images" className={`mt-1 ${allImages.length > 1 ? "grid grid-cols-2 gap-1 max-w-md" : "max-w-md"}`}>
                    {allImages.map((img, idx) => (
                        <Image key={idx} src={img} alt={`Attachment ${idx + 1}`} width={400} height={300} unoptimized className="rounded-lg max-h-[300px] w-full object-contain bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 cursor-pointer hover:opacity-90" />
                    ))}
                </div>
            );
        }

        // Multiple videos
        const allVideos = [...(reply.video ? [reply.video] : []), ...(reply.videos || [])];
        if (allVideos.length > 0) {
            attachments.push(
                <div key="videos" className="mt-1 space-y-1 max-w-md">
                    {allVideos.map((vid, idx) => (
                        <video key={idx} src={vid} controls className="rounded-lg max-h-[300px] w-full object-contain bg-black" />
                    ))}
                </div>
            );
        }

        // Voice note
        if (reply.voiceNote) {
            attachments.push(
                <div key="voice" className="mt-1 flex items-center gap-2 bg-green-50 dark:bg-green-950 rounded-xl px-3 py-2 max-w-xs">
                    <MicIcon className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    <audio src={reply.voiceNote} controls className="h-8 flex-1" />
                </div>
            );
        }

        // Audio files
        const allAudios = [...(reply.audio ? [reply.audio] : []), ...(reply.audios || [])];
        if (allAudios.length > 0) {
            attachments.push(
                <div key="audios" className="mt-1 space-y-1 max-w-sm">
                    {allAudios.map((aud, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950 rounded-xl px-3 py-2">
                            <Music2Icon className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            <audio src={aud} controls className="h-8 flex-1" />
                        </div>
                    ))}
                </div>
            );
        }

        // Documents
        const allDocs = [...(reply.document ? [reply.document] : []), ...(reply.documents || [])];
        if (allDocs.length > 0) {
            attachments.push(
                <div key="docs" className="mt-1 space-y-1">
                    {allDocs.map((doc, idx) => (
                        <a key={idx} href={doc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 rounded-xl px-3 py-2 max-w-xs hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
                            <FileIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="text-sm text-blue-600 dark:text-blue-400 truncate flex-1">Document {idx + 1}</span>
                            <ExternalLinkIcon className="h-3 w-3 text-blue-400 shrink-0" />
                        </a>
                    ))}
                </div>
            );
        }

        // Link attachment
        if (reply.linkUrl) {
            attachments.push(
                <LinkPreview key="link" url={reply.linkUrl} />
            );
        }

        // Poll
        if (reply.pollQuestion && reply.pollOptions && reply.pollOptions.length > 0) {
            const votes = (reply.pollVotes || {}) as Record<string, number>;
            const totalVotes = Object.keys(votes).length;
            const userVote = currentUserId ? votes[currentUserId] : undefined;
            const optionCounts: Record<number, number> = {};
            Object.values(votes).forEach((v) => {
                optionCounts[v] = (optionCounts[v] || 0) + 1;
            });

            attachments.push(
                <div key="poll" className="mt-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 max-w-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3Icon className="h-4 w-4 text-indigo-500" />
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{reply.pollQuestion}</p>
                    </div>
                    <div className="space-y-1.5">
                        {reply.pollOptions.map((option, idx) => {
                            const count = optionCounts[idx] || 0;
                            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                            const isSelected = userVote === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleVotePoll(reply.id, idx)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm relative overflow-hidden transition-colors ${isSelected ? "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                                >
                                    <div className="absolute inset-y-0 left-0 bg-indigo-100 dark:bg-indigo-900/30 transition-all" style={{ width: `${pct}%` }} />
                                    <div className="relative flex justify-between items-center">
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{option}</span>
                                        {totalVotes > 0 && <span className="text-xs text-gray-500">{pct}%</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
                </div>
            );
        }

        // Event
        if (reply.eventTitle) {
            attachments.push(
                <div key="event" className="mt-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 max-w-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <CalendarIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{reply.eventTitle}</p>
                    </div>
                    {reply.eventDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                            📅 {new Date(reply.eventDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                    )}
                    {reply.eventLocation && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-0.5">📍 {reply.eventLocation}</p>
                    )}
                </div>
            );
        }

        return attachments.length > 0 ? <>{attachments}</> : null;
    };

    const filteredUsers = users.filter(
        (u) =>
            u.name &&
            u.name.toLowerCase().includes(mentionFilter.toLowerCase())
    );

    /* ─── Channel Sidebar ──────────────────────────────── */

    const channelSidebar = (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
            {/* Server Header */}
            <div className="h-12 px-4 flex items-center border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                    CNERSH Community
                </h2>
            </div>

            {/* New Channel */}
            <div className="px-2 pt-3 pb-1">
                <button
                    onClick={() => setShowCreate(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors"
                >
                    <PlusIcon className="h-4 w-4" />
                    <span>Create Channel</span>
                </button>
            </div>

            {/* Category Groups */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
                {CATEGORIES.map((cat) => {
                    const catTopics = topics.filter(
                        (t) => t.category === cat
                    );
                    if (catTopics.length === 0) return null;
                    return (
                        <div key={cat}>
                            <div className="flex items-center gap-1 px-1 mb-0.5">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    {cat}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    — {catTopics.length}
                                </span>
                            </div>
                            {catTopics.map((topic) => (
                                <button
                                    key={topic.id}
                                    onClick={() =>
                                        handleSelectTopic(topic.id)
                                    }
                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors group ${
                                        selectedTopic?.id === topic.id
                                            ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    <HashIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                                    <span className="truncate text-left flex-1">
                                        {topic.title.toLowerCase().replace(/\s+/g, "-")}
                                    </span>
                                    {topic._count.replies > 0 && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {topic._count.replies}
                                        </span>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTopic(topic.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-500 transition-all"
                                            title="Delete channel"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </button>
                            ))}
                        </div>
                    );
                })}
                {/* Uncategorized topics */}
                {topics.filter(
                    (t) => !CATEGORIES.includes(t.category)
                ).length > 0 && (
                    <div>
                        <div className="flex items-center gap-1 px-1 mb-0.5">
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Other
                            </span>
                        </div>
                        {topics
                            .filter((t) => !CATEGORIES.includes(t.category))
                            .map((topic) => (
                                <button
                                    key={topic.id}
                                    onClick={() =>
                                        handleSelectTopic(topic.id)
                                    }
                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors group ${
                                        selectedTopic?.id === topic.id
                                            ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    <HashIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                                    <span className="truncate text-left flex-1">
                                        {topic.title.toLowerCase().replace(/\s+/g, "-")}
                                    </span>
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTopic(topic.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-500 transition-all"
                                            title="Delete channel"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </button>
                            ))}
                    </div>
                )}
            </div>

            {/* Members Count */}
            <div className="h-12 px-3 flex items-center gap-2 border-t border-gray-200 dark:border-gray-800 bg-gray-200 dark:bg-gray-950">
                <UsersIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {users.length} members
                </span>
            </div>
        </div>
    );

    /* ─── Message Area ─────────────────────────────────── */

    const messageArea = selectedTopic ? (
        <div className="flex flex-col h-full bg-white dark:bg-gray-950">
            {/* Channel Header */}
            <div className="h-12 px-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 shadow-sm shrink-0">
                {/* Mobile channel toggle */}
                <button
                    onClick={() => setShowMobileChannels(true)}
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
                        onClick={() => handleToggleChat(selectedTopic.id)}
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
                                            onClick={() => handleToggleTopicLike(selectedTopic.id, false)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${userLiked ? "text-blue-600 bg-blue-50 dark:bg-blue-950" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                                        >
                                            <ThumbsUpIcon className={`h-4 w-4 ${userLiked ? "fill-current" : ""}`} />
                                            {likes.length > 0 && <span>{likes.length}</span>}
                                        </button>
                                        <button
                                            onClick={() => handleToggleTopicLike(selectedTopic.id, true)}
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
                                                        handleEditTopic(selectedTopic.id, { title: newTitle.trim() });
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
                    const showHeader =
                        !prevReply ||
                        prevReply.user.id !== reply.user.id ||
                        new Date(reply.createdAt).getTime() -
                            new Date(prevReply.createdAt).getTime() >
                            MESSAGE_GROUP_THRESHOLD_MS;

                    const parentReply = reply.parentId
                        ? selectedTopic.replies.find(
                              (r) => r.id === reply.parentId
                          )
                        : null;

                    return (
                        <div
                            key={reply.id}
                            className="group hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded px-2 py-0.5 -mx-2 relative"
                            onClick={() => handleMessageTap(reply.id)}
                        >
                            {/* Reply reference */}
                            {parentReply && (
                                <div className="flex items-center gap-1.5 ml-12 mb-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="w-6 h-3 border-l-2 border-t-2 border-gray-300 dark:border-gray-600 rounded-tl ml-1" />
                                    <Avatar className="h-4 w-4">
                                        <AvatarImage
                                            src={
                                                parentReply.user.image ||
                                                undefined
                                            }
                                        />
                                        <AvatarFallback className="text-xs bg-indigo-500 text-white">
                                            {getDisplayName(parentReply.user)
                                                ?.charAt(0)
                                                ?.toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold text-gray-600 dark:text-gray-300 hover:underline cursor-pointer">
                                        {getDisplayName(parentReply.user)}
                                    </span>
                                    <span className="truncate max-w-[200px]">
                                        {parentReply.content}
                                    </span>
                                </div>
                            )}

                            <div className="flex gap-3">
                                {showHeader ? (
                                    <Avatar className="h-10 w-10 mt-0.5 shrink-0">
                                        <AvatarImage
                                            src={
                                                reply.user.image || undefined
                                            }
                                        />
                                        <AvatarFallback className="bg-indigo-500 text-white text-sm">
                                            {getDisplayName(reply.user)
                                                ?.charAt(0)
                                                ?.toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <div className="w-10 shrink-0 flex items-center justify-center">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100">
                                            {formatTime(reply.createdAt)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    {showHeader && (
                                        <div className="flex items-baseline gap-2">
                                            <span
                                                className="font-semibold text-sm text-gray-900 dark:text-white hover:underline cursor-pointer"
                                                onClick={(e) => { e.stopPropagation(); handleUserClick(reply.user.id); }}
                                            >
                                                {getDisplayName(reply.user)}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {formatDate(reply.createdAt)}{" "}
                                                {formatTime(reply.createdAt)}
                                            </span>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap">
                                        {editingReplyId === reply.id ? (
                                            <span className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editingContent}
                                                    onChange={(e) => setEditingContent(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") handleEditReply(reply.id);
                                                        if (e.key === "Escape") { setEditingReplyId(null); setEditingContent(""); }
                                                    }}
                                                    className="flex-1 text-sm px-2 py-1 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <button type="button" className="text-gray-400 hover:text-yellow-500 transition-colors p-1">
                                                            <SmileIcon className="h-4 w-4" />
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-2" align="end">
                                                        <div className="grid grid-cols-8 gap-1">
                                                            {EMOJI_LIST.map((emoji) => (
                                                                <button
                                                                    key={emoji}
                                                                    type="button"
                                                                    onClick={() => setEditingContent((prev) => prev + emoji)}
                                                                    className="text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1 cursor-pointer"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <button onClick={() => handleEditReply(reply.id)} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded" title="Save">
                                                    <CheckIcon className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => { setEditingReplyId(null); setEditingContent(""); }} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Cancel">
                                                    <XIcon className="h-4 w-4" />
                                                </button>
                                            </span>
                                        ) : (
                                            renderMessageContent(reply.content)
                                        )}
                                    </p>
                                    {renderMessageAttachments(reply)}
                                    {/* Nested replies inline */}
                                    {reply.children &&
                                        reply.children.length > 0 && (
                                            <div className="mt-2 ml-4 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-2">
                                                {reply.children.map(
                                                    (child) => (
                                                        <div
                                                            key={child.id}
                                                            className="group/child flex items-start gap-2.5 py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800/50 relative"
                                                            onClick={() => handleMessageTap(child.id)}
                                                        >
                                                            <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                                                                <AvatarImage
                                                                    src={
                                                                        child
                                                                            .user
                                                                            .image ||
                                                                        undefined
                                                                    }
                                                                />
                                                                <AvatarFallback className="text-xs bg-indigo-500 text-white">
                                                                    {getDisplayName(child.user)
                                                                        ?.charAt(
                                                                            0
                                                                        )
                                                                        ?.toUpperCase() ||
                                                                        "U"}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-baseline gap-2">
                                                                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                                                        {getDisplayName(child.user)}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                        {formatDate(child.createdAt)}{" "}
                                                                        {formatTime(child.createdAt)}
                                                                    </span>
                                                                </div>
                                                                {editingReplyId === child.id ? (
                                                                    <span className="flex items-center gap-2 mt-0.5">
                                                                        <input
                                                                            type="text"
                                                                            value={editingContent}
                                                                            onChange={(e) => setEditingContent(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter") handleEditReply(child.id);
                                                                                if (e.key === "Escape") { setEditingReplyId(null); setEditingContent(""); }
                                                                            }}
                                                                            className="flex-1 text-xs px-2 py-1 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                            autoFocus
                                                                        />
                                                                        <button onClick={() => handleEditReply(child.id)} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded" title="Save">
                                                                            <CheckIcon className="h-3 w-3" />
                                                                        </button>
                                                                        <button onClick={() => { setEditingReplyId(null); setEditingContent(""); }} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Cancel">
                                                                            <XIcon className="h-3 w-3" />
                                                                        </button>
                                                                    </span>
                                                                ) : (
                                                                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 whitespace-pre-wrap break-words">
                                                                        {renderMessageContent(child.content)}
                                                                    </p>
                                                                )}
                                                                {renderMessageAttachments(child)}
                                                                {/* Child reply actions */}
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setReplyingTo(child);
                                                                            setActiveMessageId(null);
                                                                            const userName = getDisplayName(child.user).replace(/\s+/g, "");
                                                                            setMessageText(`@${userName} `);
                                                                        }}
                                                                        className="text-xs text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                                                                    >
                                                                        Reply
                                                                    </button>
                                                                    {currentUserId === child.user.id && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingReplyId(child.id);
                                                                                setEditingContent(child.content);
                                                                            }}
                                                                            className="text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                    )}
                                                                    {(isAdmin || currentUserId === child.user.id) && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteReply(child.id);
                                                                            }}
                                                                            className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                </div>

                                {/* Message Actions (hover on desktop, tap on mobile) */}
                                <div
                                    className={`absolute top-0 right-2 -translate-y-1/2 flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded shadow-lg transition-opacity ${
                                        activeMessageId === reply.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => {
                                            setReplyingTo(reply);
                                            setActiveMessageId(null);
                                            const userName = getDisplayName(reply.user).replace(/\s+/g, "");
                                            setMessageText(`@${userName} `);
                                        }}
                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                                        title="Reply"
                                    >
                                        <ReplyIcon className="h-4 w-4" />
                                    </button>
                                    {currentUserId === reply.user.id && (
                                        <button
                                            onClick={() => {
                                                setEditingReplyId(reply.id);
                                                setEditingContent(reply.content);
                                                setActiveMessageId(null);
                                            }}
                                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-gray-500 hover:text-blue-600 transition-colors"
                                            title="Edit message"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                    {(isAdmin || currentUserId === reply.user.id) && (
                                        <button
                                            onClick={() => { handleDeleteReply(reply.id); setActiveMessageId(null); }}
                                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-400 hover:text-red-600 transition-colors"
                                            title="Delete message"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                    {currentUserId !== reply.user.id && (
                                        <button
                                            onClick={() => { handleReportChat(reply.id); setActiveMessageId(null); }}
                                            className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900 rounded text-gray-400 hover:text-orange-600 transition-colors"
                                            title="Report message"
                                        >
                                            <FlagIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
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
                                        <button onClick={() => setPendingImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><XIcon className="h-2.5 w-2.5" /></button>
                                    </div>
                                )}
                                {pendingImages.map((img, idx) => (
                                    <div key={idx} className="relative">
                                        <Image src={img} alt={`Preview ${idx + 1}`} width={80} height={60} unoptimized className="h-[60px] w-auto rounded" />
                                        <button onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><XIcon className="h-2.5 w-2.5" /></button>
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
                                        <button onClick={() => setPendingVideos((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400"><XIcon className="h-3 w-3" /></button>
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
                                        <button onClick={() => setPendingAudios((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400"><XIcon className="h-3 w-3" /></button>
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
                                        <button onClick={() => setPendingDocuments((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400"><XIcon className="h-3 w-3" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Voice note preview */}
                        {pendingVoiceNote && (
                            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 rounded px-2 py-1">
                                <MicIcon className="h-3 w-3 text-green-500" />
                                <audio src={pendingVoiceNote} controls className="h-7 flex-1" />
                                <button onClick={() => setPendingVoiceNote(null)} className="text-red-400"><XIcon className="h-3 w-3" /></button>
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
                                            if (files) Array.from(files).forEach((f) => handleFileUpload(f, "image"));
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
                                            if (files) Array.from(files).forEach((f) => handleFileUpload(f, "video"));
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
                                            if (files) Array.from(files).forEach((f) => handleFileUpload(f, "document"));
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
                                            if (files) Array.from(files).forEach((f) => handleFileUpload(f, "audio"));
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
                            onClick={isRecording ? handleStopRecording : handleStartRecording}
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
                            onClick={handleMentionAll}
                            className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-orange-500 transition-colors"
                            title="Mention all users"
                        >
                            <UsersIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Send button */}
                    <button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() && !pendingImage}
                        className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
                    >
                        <SendIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
            )}
        </div>
    ) : (
        /* No channel selected */
        <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-gray-950 text-center">
            {/* Mobile channel toggle */}
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
            <div className="flex-1 min-w-0 relative">{messageArea}</div>

            {/* Create Topic Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
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
                                                    await handleTopicFileUpload(file, "image");
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
                                                        onClick={() => setNewTopic((p) => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }))}
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
                                                    await handleTopicFileUpload(file, "video");
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
                                                    <button onClick={() => setNewTopic((p) => ({ ...p, videos: p.videos.filter((_, idx) => idx !== i) }))} className="text-red-500 hover:text-red-600">
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
                                                    await handleTopicFileUpload(file, "document");
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
                                                    <button onClick={() => setNewTopic((p) => ({ ...p, documents: p.documents.filter((_, idx) => idx !== i) }))} className="text-red-500 hover:text-red-600">
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
                            onClick={handleCreateTopic}
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

            {/* Admin User Profile Dialog */}
            <Dialog
                open={!!userProfileId && !showBanDialog && !showWarningDialog}
                onOpenChange={(open) => { if (!open) setUserProfileId(null); }}
            >
                <DialogContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>User Profile</DialogTitle>
                        <DialogDescription className="sr-only">View user profile details and admin actions</DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-14 w-14">
                                    <AvatarImage src={selectedUser.image || undefined} />
                                    <AvatarFallback className="bg-indigo-500 text-white text-lg">
                                        {selectedUser.name?.charAt(0)?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-lg">
                                        {selectedUser.role === "admin" || selectedUser.role === "superadmin"
                                            ? "CNERSH Admin"
                                            : selectedUser.name || "Unknown"}
                                    </p>
                                    <Badge className="text-xs mt-0.5">{selectedUser.role || "user"}</Badge>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowWarningDialog(true)}
                                    className="flex-1"
                                >
                                    <ShieldAlertIcon className="h-4 w-4 mr-1.5" />
                                    Send Warning
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setShowBanDialog(true)}
                                    className="flex-1"
                                >
                                    <BanIcon className="h-4 w-4 mr-1.5" />
                                    Ban User
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Warning Dialog */}
            <Dialog
                open={showWarningDialog}
                onOpenChange={(open) => { if (!open) { setShowWarningDialog(false); setWarningMessage(""); } }}
            >
                <DialogContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Send Warning to {selectedUser?.name}</DialogTitle>
                        <DialogDescription className="sr-only">Send a warning message to this user</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Warning message..."
                            value={warningMessage}
                            onChange={(e) => setWarningMessage(e.target.value)}
                            className="min-h-[100px]"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { setShowWarningDialog(false); setWarningMessage(""); }}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSendWarning} disabled={!warningMessage.trim()}>
                                Send Warning
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ban Dialog */}
            <Dialog
                open={showBanDialog}
                onOpenChange={(open) => { if (!open) { setShowBanDialog(false); setBanReason(""); } }}
            >
                <DialogContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ban {selectedUser?.name}</DialogTitle>
                        <DialogDescription className="sr-only">Ban this user from the community</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Reason for ban..."
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { setShowBanDialog(false); setBanReason(""); }}>
                                Cancel
                            </Button>
                            <Button variant="destructive" size="sm" onClick={handleBanUser} disabled={!banReason.trim()}>
                                Ban User
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Report Chat Dialog */}
            <Dialog
                open={reportingReplyId !== null}
                onOpenChange={(open) => { if (!open) { setReportingReplyId(null); setReportCategory(""); setReportDetails(""); } }}
            >
                <DialogContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Report Message</DialogTitle>
                        <DialogDescription className="sr-only">Report this message for review</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Select value={reportCategory} onValueChange={setReportCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a reason..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Spam">Spam</SelectItem>
                                <SelectItem value="Harassment or Bullying">Harassment or Bullying</SelectItem>
                                <SelectItem value="Hate Speech">Hate Speech</SelectItem>
                                <SelectItem value="Misinformation">Misinformation</SelectItem>
                                <SelectItem value="Violence or Threats">Violence or Threats</SelectItem>
                                <SelectItem value="Inappropriate Content">Inappropriate Content</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Textarea
                            placeholder="Additional details (optional)..."
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                            className="min-h-[80px]"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { setReportingReplyId(null); setReportCategory(""); setReportDetails(""); }}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={submitChatReport} disabled={!reportCategory} className="bg-red-600 hover:bg-red-700 text-white">
                                Submit Report
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
