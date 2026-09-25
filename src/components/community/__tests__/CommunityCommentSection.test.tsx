import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CommunityCommentSection } from "@/components/community/CommunityCommentSection";
import type { TopicDetail, CommunityUser } from "@/components/community/types";

jest.mock("next/image", () => ({
    __esModule: true,
    default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
        // eslint-disable-next-line jsx-a11y/alt-text
        <img {...props} />,
}));

jest.mock("@/components/link-preview", () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock("@/components/community/CommunityPostCard", () => ({
    CommunityPostCard: () => <div data-testid="post-card" />,
}));

jest.mock("@/lib/utils", () => ({
    cn: (...classes: (string | boolean | undefined)[]) =>
        classes.filter(Boolean).join(" "),
}));

const users: CommunityUser[] = [
    { id: "u1", name: "Alice", image: null, role: "admin" },
];

function makeTopic(replyCount: number): TopicDetail {
    return {
        id: "topic-1",
        title: "General",
        content: "Welcome",
        category: "General",
        createdAt: new Date("2024-01-01"),
        userId: "u1",
        image: null,
        images: [],
        video: null,
        videos: [],
        documents: [],
        linkUrl: null,
        chatEnabled: true,
        likes: [],
        user: { id: "u1", name: "Alice", image: null, role: "admin" },
        replies: Array.from({ length: replyCount }, (_, i) => ({
            id: `r-${i}`,
            content: `Reply ${i}`,
            createdAt: new Date(),
            user: { id: "u1", name: "Alice", image: null, role: "admin" },
            children: [],
        })),
    };
}

const baseProps = {
    currentUserId: "u1",
    isAdmin: false,
    isSuperAdmin: false,
    users,
    messageText: "",
    setMessageText: jest.fn(),
    pendingImage: null,
    setPendingImage: jest.fn(),
    replyingTo: null,
    setReplyingTo: jest.fn(),
    showEmojiPicker: false,
    setShowEmojiPicker: jest.fn(),
    showMentions: false,
    setShowMentions: jest.fn(),
    mentionFilter: "",
    setMentionFilter: jest.fn(),
    editingReplyId: null,
    setEditingReplyId: jest.fn(),
    editingContent: "",
    setEditingContent: jest.fn(),
    activeMessageId: null,
    setActiveMessageId: jest.fn(),
    pendingImages: [],
    setPendingImages: jest.fn(),
    pendingVideos: [],
    setPendingVideos: jest.fn(),
    pendingAudios: [],
    setPendingAudios: jest.fn(),
    pendingDocuments: [],
    setPendingDocuments: jest.fn(),
    pendingVoiceNote: null,
    setPendingVoiceNote: jest.fn(),
    pendingLinkUrl: "",
    setPendingLinkUrl: jest.fn(),
    pendingPollQuestion: "",
    setPendingPollQuestion: jest.fn(),
    pendingPollOptions: ["", ""],
    setPendingPollOptions: jest.fn(),
    pendingEventTitle: "",
    setPendingEventTitle: jest.fn(),
    pendingEventDate: "",
    setPendingEventDate: jest.fn(),
    pendingEventLocation: "",
    setPendingEventLocation: jest.fn(),
    showPollCreator: false,
    setShowPollCreator: jest.fn(),
    showEventCreator: false,
    setShowEventCreator: jest.fn(),
    showLinkInput: false,
    setShowLinkInput: jest.fn(),
    showAttachmentPanel: false,
    setShowAttachmentPanel: jest.fn(),
    isRecording: false,
    inputRef: React.createRef<HTMLTextAreaElement>(),
    onToggleChat: jest.fn(),
    onSendMessage: jest.fn(),
    onDeleteReply: jest.fn(),
    onReportChat: jest.fn(),
    onEditReply: jest.fn(),
    onMessageTap: jest.fn(),
    onUserClick: jest.fn(),
    onToggleTopicLike: jest.fn(),
    onEditTopic: jest.fn(),
    onMentionAll: jest.fn(),
    onStartRecording: jest.fn(),
    onStopRecording: jest.fn(),
    onFileUpload: jest.fn().mockResolvedValue(undefined),
    onVotePoll: jest.fn(),
    onShowMobileChannels: jest.fn(),
    onReplyTo: jest.fn(),
    onStartEditReply: jest.fn(),
    onMessagesRead: jest.fn(),
};

function withScrollMetrics(el: HTMLElement, metrics: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
    Object.defineProperty(el, "scrollHeight", { configurable: true, value: metrics.scrollHeight });
    Object.defineProperty(el, "clientHeight", { configurable: true, value: metrics.clientHeight });
    Object.defineProperty(el, "scrollTop", { configurable: true, writable: true, value: metrics.scrollTop });
}

describe("CommunityCommentSection scroll-to-bottom", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // jsdom does not implement scrollTo.
        Element.prototype.scrollTo = jest.fn();
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    it("hides the arrow when the user is at the bottom", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                selectedTopic={makeTopic(1)}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const btn = screen.getByTestId("scroll-to-bottom-button");
        expect(btn.className).toContain("opacity-0");
    });

    it("shows the arrow when the user scrolls away from the bottom", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                selectedTopic={makeTopic(30)}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const container = screen.getByTestId("community-scroll-container");
        withScrollMetrics(container, { scrollHeight: 2000, clientHeight: 500, scrollTop: 100 });
        fireEvent.scroll(container);

        const btn = screen.getByTestId("scroll-to-bottom-button");
        expect(btn.className).toContain("opacity-100");
    });

    it("clicking the arrow scrolls to the bottom and notifies the parent", () => {
        const onMessagesRead = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                onMessagesRead={onMessagesRead}
                selectedTopic={makeTopic(30)}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const container = screen.getByTestId("community-scroll-container");
        withScrollMetrics(container, { scrollHeight: 2000, clientHeight: 500, scrollTop: 100 });
        fireEvent.scroll(container);

        fireEvent.click(screen.getByTestId("scroll-to-bottom-button"));

        expect(container.scrollTo).toHaveBeenCalledWith({
            top: 2000,
            behavior: "smooth",
        });
        expect(onMessagesRead).toHaveBeenCalledTimes(1);
    });

    it("calls onMessagesRead when the user scrolls back to the bottom after unseen activity", () => {
        const onMessagesRead = jest.fn();
        const topic = makeTopic(10);
        const { rerender } = render(
            <CommunityCommentSection
                {...baseProps}
                onMessagesRead={onMessagesRead}
                selectedTopic={topic}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const container = screen.getByTestId("community-scroll-container");
        withScrollMetrics(container, { scrollHeight: 2000, clientHeight: 500, scrollTop: 100 });
        fireEvent.scroll(container);

        // Simulate a new reply arriving.
        const longerTopic = { ...topic, replies: [...topic.replies, { ...topic.replies[0], id: "new" }] };
        rerender(
            <CommunityCommentSection
                {...baseProps}
                onMessagesRead={onMessagesRead}
                selectedTopic={longerTopic}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );

        // User scrolls back to the bottom.
        withScrollMetrics(container, { scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
        fireEvent.scroll(container);

        expect(onMessagesRead).toHaveBeenCalledTimes(1);
    });
});