"use client";

import React from "react";
import { HashIcon, PlusIcon, TrashIcon, UsersIcon } from "lucide-react";
import { TopicData, CommunityUser } from "./types";
import { CATEGORIES } from "./constants";
import { cn } from "@/lib/utils";

interface CommunityMembersListProps {
    topics: TopicData[];
    selectedTopicId: string | null;
    isAdmin: boolean;
    users: CommunityUser[];
    onSelectTopic: (topicId: string) => void;
    onDeleteTopic: (topicId: string) => void;
    onShowCreate: () => void;
}


function UnreadBadge({ count }: { count: number }) {
    if (count <= 0) return null;
    const label = count > 99 ? "99+" : String(count);
    return (
        <span
            role="status"
            aria-label={`${count} unread ${count === 1 ? "message" : "messages"}`}
            className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-indigo-500 text-white text-[11px] font-semibold leading-none shrink-0"
        >
            {label}
        </span>
    );
}

function ReplyCount({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {count}
        </span>
    );
}

function TopicRow({
                      topic,
                      isSelected,
                      isAdmin,
                      onSelect,
                      onDelete,
                  }: {
    topic: TopicData;
    isSelected: boolean;
    isAdmin: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const unread = topic.unreadCount ?? 0;
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect(topic.id)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(topic.id);
                }
            }}
            aria-pressed={isSelected}
            className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors group",
                isSelected
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                    : unread > 0
                        ? "text-gray-800 dark:text-gray-100 font-medium hover:bg-gray-200/50 dark:hover:bg-gray-800"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800"
            )}
        >
            <HashIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="truncate text-left flex-1">
                {topic.title.toLowerCase().replace(/\s+/g, "-")}
            </span>

            <UnreadBadge count={unread} />
            {unread === 0 && <ReplyCount count={topic._count.replies} />}

            {isAdmin && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(topic.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-500 transition-all shrink-0"
                    title="Delete channel"
                    aria-label={`Delete channel ${topic.title}`}
                >
                    <TrashIcon className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}


function TopicGroup({
                        label,
                        count,
                        topics,
                        selectedTopicId,
                        isAdmin,
                        onSelectTopic,
                        onDeleteTopic,
                    }: {
    label: string;
    count: number;
    topics: TopicData[];
    selectedTopicId: string | null;
    isAdmin: boolean;
    onSelectTopic: (id: string) => void;
    onDeleteTopic: (id: string) => void;
}) {
    return (
        <div>
            <div className="flex items-center gap-1 px-1 mb-0.5">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {label}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">- {count}</span>
            </div>
            <div className="space-y-0.5">
                {topics.map((topic) => (
                    <TopicRow
                        key={topic.id}
                        topic={topic}
                        isSelected={selectedTopicId === topic.id}
                        isAdmin={isAdmin}
                        onSelect={onSelectTopic}
                        onDelete={onDeleteTopic}
                    />
                ))}
            </div>
        </div>
    );
}


export function CommunityMembersList({
                                         topics,
                                         selectedTopicId,
                                         isAdmin,
                                         users,
                                         onSelectTopic,
                                         onDeleteTopic,
                                         onShowCreate,
                                     }: CommunityMembersListProps) {
    const uncategorized = topics.filter((t) => !CATEGORIES.includes(t.category));

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
            {/* Server Header */}
            <div className="h-12 px-4 flex items-center border-b border-gray-200 dark:border-gray-800 shadow-sm shrink-0">
                <h2 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                    CNERSH Community
                </h2>
            </div>

            {/* New Channel */}
            <div className="px-2 pt-3 pb-1 shrink-0">
                <button
                    onClick={() => onShowCreate()}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors"
                >
                    <PlusIcon className="h-4 w-4" />
                    <span>Create Channel</span>
                </button>
            </div>

            {/* Category Groups */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
                {CATEGORIES.map((cat) => {
                    const catTopics = topics.filter((t) => t.category === cat);
                    if (catTopics.length === 0) return null;
                    return (
                        <TopicGroup
                            key={cat}
                            label={cat}
                            count={catTopics.length}
                            topics={catTopics}
                            selectedTopicId={selectedTopicId}
                            isAdmin={isAdmin}
                            onSelectTopic={onSelectTopic}
                            onDeleteTopic={onDeleteTopic}
                        />
                    );
                })}

                {uncategorized.length > 0 && (
                    <TopicGroup
                        label="Other"
                        count={uncategorized.length}
                        topics={uncategorized}
                        selectedTopicId={selectedTopicId}
                        isAdmin={isAdmin}
                        onSelectTopic={onSelectTopic}
                        onDeleteTopic={onDeleteTopic}
                    />
                )}
            </div>

            {/* Members Count */}
            <div className="h-12 px-3 flex items-center gap-2 border-t border-gray-200 dark:border-gray-800 bg-gray-200 dark:bg-gray-950 shrink-0">
                <UsersIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {users.length} members
                </span>
            </div>
        </div>
    );
}