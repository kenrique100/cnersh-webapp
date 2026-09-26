"use client";

import React from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import LinkPreview from "@/components/link-preview";
import {
    ReplyIcon,
    PencilIcon,
    TrashIcon,
    FlagIcon,
    CheckIcon,
    XIcon,
    SmileIcon,
    MicIcon,
    Music2Icon,
    FileIcon,
    ExternalLinkIcon,
    BarChart3Icon,
    CalendarIcon,
} from "lucide-react";
import { ReplyData, ReplyReactions } from "./types";
import { EMOJI_LIST, REACTION_EMOJIS } from "./constants";
import { formatTime, getDisplayName } from "./utils";

interface CommunityPostCardProps {
    reply: ReplyData;
    prevReply: ReplyData | null;
    allReplies: ReplyData[];
    currentUserId: string | undefined;
    isAdmin: boolean;
    editingReplyId: string | null;
    editingContent: string;
    activeMessageId: string | null;
    onSetEditingContent: (content: string) => void;
    onEditReply: (replyId: string) => void;
    onCancelEdit: () => void;
    onMessageTap: (replyId: string) => void;
    onUserClick: (userId: string) => void;
    onDeleteReply: (replyId: string) => void;
    onReportChat: (replyId: string) => void;
    onReplyTo: (reply: ReplyData) => void;
    onStartEditReply: (replyId: string, content: string) => void;
    onVotePoll: (replyId: string, optionIndex: number) => void;
    onReactToReply?: (replyId: string, emoji: string) => void;
}

function renderMessageContent(content: string) {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
        if (part.startsWith("@") && part.length > 1) {
            return (
                <span
                    key={i}
                    className="bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded px-0.5 cursor-pointer hover:bg-blue-500/30"
                >
                    {part}
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

function FloatingReactionRow({
                                 reactions,
                                 currentUserId,
                                 isCurrentUser,
                                 onReact,
                             }: {
    reactions?: ReplyReactions;
    currentUserId?: string;
    isCurrentUser: boolean;
    onReact?: (emoji: string) => void;
}) {
    if (!reactions || Object.keys(reactions).length === 0) return null;

    const entries = Object.entries(reactions).filter(
        ([, userIds]) => userIds && userIds.length > 0
    );
    if (entries.length === 0) return null;

    return (
        <div
            data-testid="reaction-bar"
            className={`absolute -bottom-3 ${
                isCurrentUser ? "right-3" : "left-3"
            } flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm`}
        >
            {entries.map(([emoji, userIds]) => {
                const reacted = currentUserId ? userIds.includes(currentUserId) : false;
                return (
                    <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onReact?.(emoji);
                        }}
                        aria-label={`React with ${emoji}, ${userIds.length} reaction${userIds.length === 1 ? "" : "s"}`}
                        aria-pressed={reacted}
                        className={`flex items-center gap-0.5 px-1 py-0 rounded-full text-[11px] leading-none transition-colors ${
                            reacted
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                        }`}
                    >
                        <span>{emoji}</span>
                        {userIds.length > 1 && (
                            <span className="font-medium">{userIds.length}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function ReplyAttachments({
                              reply,
                              currentUserId,
                              onVotePoll,
                          }: {
    reply: ReplyData;
    currentUserId: string | undefined;
    onVotePoll: (replyId: string, optionIndex: number) => void;
}) {
    const attachments: React.ReactNode[] = [];

    const allImages = [...(reply.image ? [reply.image] : []), ...(reply.images || [])];
    if (allImages.length > 0) {
        attachments.push(
            <div key="images" className={`mt-1 ${allImages.length > 1 ? "grid grid-cols-2 gap-1 max-w-md" : "max-w-md"}`}>
                {allImages.map((img, idx) => (
                    <Image key={idx} src={img} alt={`Attachment ${idx + 1}`} width={400} height={300} unoptimized className="rounded-lg max-h-[300px] w-full object-contain bg-gray-50 dark:bg-gray-900 cursor-pointer hover:opacity-90" />
                ))}
            </div>
        );
    }

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

    if (reply.voiceNote) {
        attachments.push(
            <div key="voice" className="mt-1 flex items-center gap-2 bg-green-50 dark:bg-green-950 rounded-xl px-3 py-2 max-w-xs">
                <MicIcon className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <audio src={reply.voiceNote} controls className="h-8 flex-1" />
            </div>
        );
    }

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

    if (reply.linkUrl) {
        attachments.push(<LinkPreview key="link" url={reply.linkUrl} />);
    }

    if (reply.pollQuestion && reply.pollOptions && reply.pollOptions.length > 0) {
        const votes = (reply.pollVotes || {}) as Record<string, number>;
        const totalVotes = Object.keys(votes).length;
        const userVote = currentUserId ? votes[currentUserId] : undefined;
        const optionCounts: Record<number, number> = {};
        Object.values(votes).forEach((v) => { optionCounts[v] = (optionCounts[v] || 0) + 1; });

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
                                onClick={(e) => { e.stopPropagation(); onVotePoll(reply.id, idx); }}
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
}

interface MessageBubbleProps {
    reply: ReplyData;
    isCurrentUser: boolean;
    allReplies: ReplyData[];
    currentUserId: string | undefined;
    isAdmin: boolean;
    editingReplyId: string | null;
    editingContent: string;
    activeMessageId: string | null;
    onSetEditingContent: (content: string) => void;
    onEditReply: (replyId: string) => void;
    onCancelEdit: () => void;
    onMessageTap: (replyId: string) => void;
    onUserClick: (userId: string) => void;
    onDeleteReply: (replyId: string) => void;
    onReportChat: (replyId: string) => void;
    onReplyTo: (reply: ReplyData) => void;
    onStartEditReply: (replyId: string, content: string) => void;
    onVotePoll: (replyId: string, optionIndex: number) => void;
    onReactToReply?: (replyId: string, emoji: string) => void;
}

function MessageBubble({
                           reply,
                           isCurrentUser,
                           allReplies,
                           currentUserId,
                           isAdmin,
                           editingReplyId,
                           editingContent,
                           activeMessageId,
                           onSetEditingContent,
                           onEditReply,
                           onCancelEdit,
                           onMessageTap,
                           onUserClick,
                           onDeleteReply,
                           onReportChat,
                           onReplyTo,
                           onStartEditReply,
                           onVotePoll,
                           onReactToReply,
                       }: MessageBubbleProps) {
    const parentReply = reply.parentId
        ? allReplies.find((r) => r.id === reply.parentId) ?? null
        : null;

    const isEditing = editingReplyId === reply.id;

    // Problem 2 fix: bubble has NO border, ring, or drop shadow. Only the
    // background colour and rounded corners distinguish it.
    // The squared top corner acts as the visual "tail" anchor.
    const bubbleClasses = isCurrentUser
        ? "bg-green-100 dark:bg-green-900/40 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tr-sm"
        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm";

    return (
        <div
            className={`group flex w-full ${isCurrentUser ? "justify-end" : "justify-start"}`}
            data-testid={`community-post-${reply.id}`}
        >
            <div
                className={`relative flex flex-col max-w-[85%] sm:max-w-[70%] ${
                    isCurrentUser ? "items-end" : "items-start"
                }`}
            >
                {parentReply && (
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-gray-500 dark:text-gray-400">
                        <ReplyIcon className="h-3 w-3 shrink-0" />
                        <span className="font-semibold text-gray-600 dark:text-gray-300">
                            {getDisplayName(parentReply.user)}
                        </span>
                        <span className="truncate max-w-[180px]">{parentReply.content}</span>
                    </div>
                )}

                {/* Problem 4 fix: wrapper has overflow-visible so the reaction
                    badge can protrude below the bubble without being clipped.
                    The reaction row is absolutely positioned relative to this
                    wrapper. */}
                <div className="relative w-full overflow-visible">
                    <div
                        onClick={() => onMessageTap(reply.id)}
                        className={`relative w-full ${bubbleClasses} px-3 py-2 cursor-pointer`}
                    >
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Avatar className="h-4 w-4 shrink-0">
                                <AvatarImage src={reply.user.image || undefined} />
                                <AvatarFallback className="text-[9px] bg-indigo-500 text-white">
                                    {getDisplayName(reply.user)?.charAt(0)?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <span
                                className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); onUserClick(reply.user.id); }}
                            >
                                {getDisplayName(reply.user)}
                            </span>
                        </div>

                        {isEditing ? (
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="text"
                                    value={editingContent}
                                    onChange={(e) => onSetEditingContent(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") onEditReply(reply.id);
                                        if (e.key === "Escape") onCancelEdit();
                                    }}
                                    className="flex-1 text-sm px-2 py-1 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                                    onClick={() => onSetEditingContent(editingContent + emoji)}
                                                    className="text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1 cursor-pointer"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <button onClick={() => onEditReply(reply.id)} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded" title="Save">
                                    <CheckIcon className="h-4 w-4" />
                                </button>
                                <button onClick={onCancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Cancel">
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm whitespace-pre-wrap break-words leading-snug">
                                {renderMessageContent(reply.content)}
                            </p>
                        )}

                        <ReplyAttachments reply={reply} currentUserId={currentUserId} onVotePoll={onVotePoll} />

                        <div className="text-[10px] text-gray-500 dark:text-gray-400 text-right mt-1 tabular-nums">
                            {formatTime(reply.createdAt)}
                        </div>
                    </div>

                    {/* Problem 4 fix: floating reaction badge overlaps the
                        bottom edge of the bubble. */}
                    <FloatingReactionRow
                        reactions={reply.reactions}
                        currentUserId={currentUserId}
                        isCurrentUser={isCurrentUser}
                        onReact={(emoji) => onReactToReply?.(reply.id, emoji)}
                    />
                </div>

                {reply.children && reply.children.length > 0 && (
                    <div className={`mt-4 space-y-3 w-full ${isCurrentUser ? "pr-2" : "pl-2"}`}>
                        {reply.children.map((child) => (
                            <MessageBubble
                                key={child.id}
                                reply={child}
                                isCurrentUser={!!currentUserId && child.user.id === currentUserId}
                                allReplies={allReplies}
                                currentUserId={currentUserId}
                                isAdmin={isAdmin}
                                editingReplyId={editingReplyId}
                                editingContent={editingContent}
                                activeMessageId={activeMessageId}
                                onSetEditingContent={onSetEditingContent}
                                onEditReply={onEditReply}
                                onCancelEdit={onCancelEdit}
                                onMessageTap={onMessageTap}
                                onUserClick={onUserClick}
                                onDeleteReply={onDeleteReply}
                                onReportChat={onReportChat}
                                onReplyTo={onReplyTo}
                                onStartEditReply={onStartEditReply}
                                onVotePoll={onVotePoll}
                                onReactToReply={onReactToReply}
                            />
                        ))}
                    </div>
                )}

                {/* Action toolbar — floats ABOVE the bubble, still via Popover
                    so the picker always renders as a real popover (Problem 1). */}
                <div
                    className={`absolute -top-3 ${isCurrentUser ? "left-0" : "right-0"} flex bg-white dark:bg-gray-900 rounded shadow-md transition-opacity z-20 ${
                        activeMessageId === reply.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {onReactToReply && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className="p-1.5 hover:bg-yellow-50 dark:hover:bg-yellow-950 rounded text-gray-500 hover:text-yellow-500 transition-colors"
                                    title="React"
                                >
                                    <SmileIcon className="h-4 w-4" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-2 z-50"
                                align={isCurrentUser ? "start" : "end"}
                                side="top"
                            >
                                <div className="flex gap-1">
                                    {REACTION_EMOJIS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => onReactToReply(reply.id, emoji)}
                                            className="text-xl hover:scale-125 transition-transform p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    <button
                        onClick={() => onReplyTo(reply)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        title="Reply"
                    >
                        <ReplyIcon className="h-4 w-4" />
                    </button>
                    {currentUserId === reply.user.id && (
                        <button
                            onClick={() => onStartEditReply(reply.id, reply.content)}
                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-gray-500 hover:text-blue-600 transition-colors"
                            title="Edit message"
                        >
                            <PencilIcon className="h-4 w-4" />
                        </button>
                    )}
                    {(isAdmin || currentUserId === reply.user.id) && (
                        <button
                            onClick={() => onDeleteReply(reply.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-400 hover:text-red-600 transition-colors"
                            title="Delete message"
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    )}
                    {currentUserId !== reply.user.id && (
                        <button
                            onClick={() => onReportChat(reply.id)}
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
}

export function CommunityPostCard({
                                      reply,
                                      allReplies,
                                      currentUserId,
                                      isAdmin,
                                      editingReplyId,
                                      editingContent,
                                      activeMessageId,
                                      onSetEditingContent,
                                      onEditReply,
                                      onCancelEdit,
                                      onMessageTap,
                                      onUserClick,
                                      onDeleteReply,
                                      onReportChat,
                                      onReplyTo,
                                      onStartEditReply,
                                      onVotePoll,
                                      onReactToReply,
                                  }: CommunityPostCardProps) {
    const isCurrentUser = !!currentUserId && reply.user.id === currentUserId;

    return (
        <MessageBubble
            reply={reply}
            isCurrentUser={isCurrentUser}
            allReplies={allReplies}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            editingReplyId={editingReplyId}
            editingContent={editingContent}
            activeMessageId={activeMessageId}
            onSetEditingContent={onSetEditingContent}
            onEditReply={onEditReply}
            onCancelEdit={onCancelEdit}
            onMessageTap={onMessageTap}
            onUserClick={onUserClick}
            onDeleteReply={onDeleteReply}
            onReportChat={onReportChat}
            onReplyTo={onReplyTo}
            onStartEditReply={onStartEditReply}
            onVotePoll={onVotePoll}
            onReactToReply={onReactToReply}
        />
    );
}