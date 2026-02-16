"use client";

import React, { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
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
} from "lucide-react";
import { toast } from "sonner";
import {
    createTopic,
    addReply,
    getTopicWithReplies,
    deleteTopic,
    deleteReply,
    editReply,
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
    createdAt: Date;
    user: TopicUser;
    _count: { replies: number };
}

interface ReplyData {
    id: string;
    content: string;
    image?: string | null;
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
    createdAt: Date;
    user: TopicUser;
    replies: ReplyData[];
}

const CATEGORIES = [
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
}

export default function CommunityClient({
    initialTopics,
    users,
    isAdmin = false,
    currentUserId,
}: CommunityClientProps) {
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

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
    const [newTopic, setNewTopic] = React.useState({
        title: "",
        content: "",
        category: "",
    });

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
        try {
            await createTopic(newTopic);
            setShowCreate(false);
            setNewTopic({ title: "", content: "", category: "" });
            toast.success("Channel created!");
            router.refresh();
        } catch {
            toast.error("Failed to create channel");
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
        if ((!messageText.trim() && !pendingImage) || !selectedTopic) return;
        try {
            const reply = await addReply({
                topicId: selectedTopic.id,
                content: messageText.trim(),
                parentId: replyingTo?.id,
                image: pendingImage || undefined,
            });
            setSelectedTopic((prev) => {
                if (!prev) return prev;
                if (replyingTo?.id) {
                    // Nest reply under its parent's children array
                    return {
                        ...prev,
                        replies: prev.replies.map((r) =>
                            r.id === replyingTo.id
                                ? { ...r, children: [...(r.children || []), { ...reply, children: [] }] }
                                : {
                                      ...r,
                                      children: (r.children || []).map((c) =>
                                          c.id === replyingTo.id
                                              ? { ...c, children: [...(c.children || []), { ...reply, children: [] }] }
                                              : c
                                      ),
                                  }
                        ),
                    };
                }
                // Top-level reply
                return {
                    ...prev,
                    replies: [...prev.replies, { ...reply, children: [] }],
                };
            });
            setMessageText("");
            setPendingImage(null);
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
            return "CNEC Admin";
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
                    CNEC Community
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
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    {cat}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
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
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
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
                            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
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
                    className={`${CATEGORY_COLORS[selectedTopic.category] || "bg-gray-500"} text-white text-[10px] border-0 shrink-0`}
                >
                    {selectedTopic.category}
                </Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {/* Welcome Message */}
                <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center mb-3">
                        <HashIcon className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        Welcome to #{selectedTopic.title.toLowerCase().replace(/\s+/g, "-")}!
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        This is the start of the{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">
                            #{selectedTopic.title.toLowerCase().replace(/\s+/g, "-")}
                        </span>{" "}
                        channel. Created by{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {getDisplayName(selectedTopic.user)}
                        </span>{" "}
                        on {formatDate(selectedTopic.createdAt)}.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedTopic.content}
                    </p>
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
                                        <AvatarFallback className="text-[8px] bg-indigo-500 text-white">
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
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100">
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
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
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
                                    {reply.image && (
                                        <div className="mt-1 max-w-sm">
                                            <Image
                                                src={reply.image}
                                                alt="Attachment"
                                                width={400}
                                                height={300}
                                                unoptimized
                                                className="rounded-lg max-h-[300px] w-auto object-contain border border-gray-200 dark:border-gray-800 cursor-pointer hover:opacity-90"
                                            />
                                        </div>
                                    )}
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
                                                                <AvatarFallback className="text-[10px] bg-indigo-500 text-white">
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
                                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
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
                                                                {child.image && (
                                                                    <Image
                                                                        src={child.image}
                                                                        alt="Attachment"
                                                                        width={200}
                                                                        height={150}
                                                                        unoptimized
                                                                        className="mt-1 rounded max-h-[150px] w-auto object-contain border border-gray-200 dark:border-gray-800"
                                                                    />
                                                                )}
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
                                                                        className="text-[10px] text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
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
                                                                            className="text-[10px] text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
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
                                                                            className="text-[10px] text-gray-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
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

                {/* Pending image preview */}
                {pendingImage && (
                    <div className="relative inline-block mb-1 px-3 py-2 rounded-t-lg bg-gray-100 dark:bg-gray-900">
                        <Image
                            src={pendingImage}
                            alt="Upload preview"
                            width={200}
                            height={120}
                            unoptimized
                            className="max-h-[120px] w-auto rounded"
                        />
                        <button
                            onClick={() => setPendingImage(null)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                        >
                            <XIcon className="h-3 w-3" />
                        </button>
                    </div>
                )}

                <div
                    className={`flex items-end gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 ${
                        replyingTo || pendingImage
                            ? "rounded-t-none"
                            : ""
                    }`}
                >
                    {/* Upload button */}
                    <div className="shrink-0 mb-0.5">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="community-image-upload"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 4 * 1024 * 1024) {
                                    toast.error("Image must be less than 4MB");
                                    return;
                                }
                                try {
                                    const formData = new FormData();
                                    formData.append("file", file);
                                    const res = await fetch("/api/upload", {
                                        method: "POST",
                                        body: formData,
                                    });
                                    if (!res.ok) throw new Error("Upload failed");
                                    const data = await res.json();
                                    if (data.url) {
                                        setPendingImage(data.url);
                                    }
                                } catch {
                                    toast.error("Image upload failed");
                                }
                                e.target.value = "";
                            }}
                        />
                        <button
                            type="button"
                            onClick={() =>
                                document
                                    .getElementById("community-image-upload")
                                    ?.click()
                            }
                            className="p-1 h-8 w-8 rounded-full text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ImageIcon className="h-5 w-5" />
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
                                            <AvatarFallback className="text-[9px] bg-indigo-500 text-white">
                                                {u.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{u.name}</span>
                                        {u.role === "admin" && (
                                            <Badge className="text-[9px] bg-red-500/20 text-red-400 border-0 ml-auto">
                                                Admin
                                            </Badge>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
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
                Welcome to CNEC Community
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
        <div className="h-[calc(100vh-4rem)] flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
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
                <DialogContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">
                            Create Channel
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-1.5 block">
                                Channel Name
                            </label>
                            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-md px-3 py-2">
                                <HashIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <Input
                                    placeholder="new-channel"
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
                                    {CATEGORIES.map((cat) => (
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
                                placeholder="What is this channel about?"
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
                        <Button
                            onClick={handleCreateTopic}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                        >
                            Create Channel
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
                                            ? "CNEC Admin"
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
