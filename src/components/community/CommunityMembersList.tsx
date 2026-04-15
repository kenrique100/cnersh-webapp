"use client";

import React from "react";
import { HashIcon, PlusIcon, TrashIcon, UsersIcon } from "lucide-react";
import { TopicData, CommunityUser } from "./types";
import { CATEGORIES } from "./constants";

interface CommunityMembersListProps {
    topics: TopicData[];
    selectedTopicId: string | null;
    isAdmin: boolean;
    users: CommunityUser[];
    onSelectTopic: (topicId: string) => void;
    onDeleteTopic: (topicId: string) => void;
    onShowCreate: () => void;
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
    return (
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
                                        onSelectTopic(topic.id)
                                    }
                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors group ${
                                        selectedTopicId === topic.id
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
                                                onDeleteTopic(topic.id);
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
                                        onSelectTopic(topic.id)
                                    }
                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors group ${
                                        selectedTopicId === topic.id
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
                                                onDeleteTopic(topic.id);
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
}
