"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquareIcon, PlusIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { createTopic, addReply, getTopicWithReplies } from "@/app/actions/community";

interface TopicUser {
    id: string;
    name: string | null;
    image: string | null;
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
    createdAt: Date;
    user: TopicUser;
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

const CATEGORIES = ["General", "Ethics", "Research", "Policy", "Technology", "Health", "Education"];

interface CommunityClientProps {
    initialTopics: TopicData[];
}

export default function CommunityClient({ initialTopics }: CommunityClientProps) {
    const router = useRouter();
    const [topics] = React.useState(initialTopics);
    const [showCreate, setShowCreate] = React.useState(false);
    const [selectedTopic, setSelectedTopic] = React.useState<TopicDetail | null>(null);
    const [replyText, setReplyText] = React.useState("");
    const [newTopic, setNewTopic] = React.useState({
        title: "",
        content: "",
        category: "",
    });

    const handleCreateTopic = async () => {
        if (!newTopic.title.trim() || !newTopic.content.trim() || !newTopic.category) {
            toast.error("Please fill in all fields");
            return;
        }
        try {
            await createTopic(newTopic);
            setShowCreate(false);
            setNewTopic({ title: "", content: "", category: "" });
            toast.success("Discussion created!");
            router.refresh();
        } catch {
            toast.error("Failed to create discussion");
        }
    };

    const handleViewTopic = async (topicId: string) => {
        try {
            const topic = await getTopicWithReplies(topicId);
            if (topic) {
                setSelectedTopic(JSON.parse(JSON.stringify(topic)));
            }
        } catch {
            toast.error("Failed to load discussion");
        }
    };

    const handleReply = async () => {
        if (!replyText.trim() || !selectedTopic) return;
        try {
            const reply = await addReply({
                topicId: selectedTopic.id,
                content: replyText,
            });
            setSelectedTopic((prev) =>
                prev ? { ...prev, replies: [...prev.replies, { ...reply, children: [] }] } : prev
            );
            setReplyText("");
        } catch {
            toast.error("Failed to add reply");
        }
    };

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setShowCreate(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New Discussion
                </Button>
            </div>

            {/* Create Topic Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Start a Discussion</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder="Discussion title"
                            value={newTopic.title}
                            onChange={(e) =>
                                setNewTopic((p) => ({ ...p, title: e.target.value }))
                            }
                        />
                        <Select
                            value={newTopic.category}
                            onValueChange={(value) =>
                                setNewTopic((p) => ({ ...p, category: value }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Textarea
                            placeholder="What would you like to discuss?"
                            value={newTopic.content}
                            onChange={(e) =>
                                setNewTopic((p) => ({ ...p, content: e.target.value }))
                            }
                            className="min-h-[100px]"
                        />
                        <Button onClick={handleCreateTopic} className="w-full">
                            Create Discussion
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Topic Detail Dialog */}
            <Dialog
                open={!!selectedTopic}
                onOpenChange={(open) => {
                    if (!open) setSelectedTopic(null);
                }}
            >
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    {selectedTopic && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedTopic.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={selectedTopic.user.image || undefined} />
                                        <AvatarFallback className="bg-blue-700 text-white text-xs">
                                            {selectedTopic.user.name?.charAt(0)?.toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">{selectedTopic.user.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatDate(selectedTopic.createdAt)}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="ml-auto">
                                        {selectedTopic.category}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {selectedTopic.content}
                                </p>

                                <div className="border-t pt-4 space-y-3">
                                    <h4 className="font-semibold text-sm">
                                        Replies ({selectedTopic.replies.length})
                                    </h4>
                                    {selectedTopic.replies.map((reply) => (
                                        <div key={reply.id} className="flex gap-2">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={reply.user.image || undefined} />
                                                <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700">
                                                    {reply.user.name?.charAt(0)?.toUpperCase() || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-semibold">
                                                        {reply.user.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDate(reply.createdAt)}
                                                    </p>
                                                </div>
                                                <p className="text-sm mt-1">{reply.content}</p>
                                                {/* Nested replies */}
                                                {reply.children && reply.children.length > 0 && (
                                                    <div className="ml-4 mt-2 space-y-2">
                                                        {reply.children.map((child) => (
                                                            <div key={child.id} className="flex gap-2">
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={child.user.image || undefined} />
                                                                    <AvatarFallback className="text-xs">
                                                                        {child.user.name?.charAt(0)?.toUpperCase() || "U"}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1">
                                                                    <p className="text-xs font-semibold">
                                                                        {child.user.name}
                                                                    </p>
                                                                    <p className="text-xs">{child.content}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Write a reply..."
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleReply();
                                            }}
                                            className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                        />
                                        <Button size="sm" variant="ghost" onClick={handleReply}>
                                            <SendIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Topics List */}
            {topics.length === 0 ? (
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                    <CardContent className="py-12 text-center">
                        <MessageSquareIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No discussions yet
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Start the first discussion in the community
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {topics.map((topic) => (
                        <Card
                            key={topic.id}
                            className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleViewTopic(topic.id)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={topic.user.image || undefined} />
                                            <AvatarFallback className="bg-blue-700 text-white text-xs">
                                                {topic.user.name?.charAt(0)?.toUpperCase() || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-base">
                                                {topic.title}
                                            </CardTitle>
                                            <p className="text-xs text-gray-500">
                                                {topic.user.name} •{" "}
                                                {formatDate(topic.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">{topic.category}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {topic.content}
                                </p>
                                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                    <MessageSquareIcon className="h-3 w-3" />
                                    {topic._count.replies} replies
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
