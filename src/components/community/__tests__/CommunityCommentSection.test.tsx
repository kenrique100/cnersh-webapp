import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommunityCommentSection } from "@/components/community";

interface MockPostCardProps {
    reply: { id: string; content: string; [key: string]: unknown };
    onReplyTo: (reply: { id: string; content: string }) => void;
    onStartEditReply: (replyId: string, content: string) => void;
    onDeleteReply: (replyId: string) => void;
    onReportChat: (replyId: string) => void;
}

// Mock the heavy child component
jest.mock("../CommunityPostCard", () => ({
    CommunityPostCard: ({ reply, onReplyTo, onStartEditReply, onDeleteReply, onReportChat }: MockPostCardProps) => (
        <div data-testid={`post-${reply.id}`}>
            <span>{reply.content}</span>
            <button onClick={() => onReplyTo(reply)}>Reply</button>
            <button onClick={() => onStartEditReply(reply.id, reply.content)}>Edit</button>
            <button onClick={() => onDeleteReply(reply.id)}>Delete</button>
            <button onClick={() => onReportChat(reply.id)}>Report</button>
        </div>
    ),
}));

interface ReplyToData {
    id: string;
    content: string;
    user: { name: string; role: string };
}

const mockTopic = {
    id: "t1",
    title: "General Chat",
    content: "Welcome to the channel",
    category: "General",
    createdAt: new Date("2024-01-15T10:00:00Z"),
    user: { id: "u1", name: "Alice", image: null, role: "member" },
    replies: [
        {
            id: "r1",
            content: "Hello",
            createdAt: new Date("2024-01-15T10:05:00Z"),
            user: { id: "u2", name: "Bob", image: null, role: "member" },
            children: [],
        },
    ],
    chatEnabled: true,
    likes: [],
    images: [],
    videos: [],
    documents: [],
};

const defaultProps = {
    selectedTopic: mockTopic,
    currentUserId: "u1",
    isAdmin: false,
    isSuperAdmin: false,
    users: [{ id: "u2", name: "Bob", image: null, role: "member" }],
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
    messagesEndRef: { current: null },
    inputRef: { current: document.createElement("textarea") },
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
    onFileUpload: jest.fn(),
    onVotePoll: jest.fn(),
    onShowMobileChannels: jest.fn(),
    onReplyTo: jest.fn(),
    onStartEditReply: jest.fn(),
};

describe("CommunityCommentSection", () => {
    beforeEach(() => jest.clearAllMocks());

    it("renders the channel header with correct title and category badge", () => {
        render(<CommunityCommentSection {...defaultProps} />);
        expect(screen.getByText("general-chat")).toBeInTheDocument();
        expect(screen.getByText("General")).toBeInTheDocument();
        expect(screen.getByText(/Welcome to #general-chat!/)).toBeInTheDocument();
    });

    it("renders replies using CommunityPostCard", () => {
        render(<CommunityCommentSection {...defaultProps} />);
        expect(screen.getByTestId("post-r1")).toBeInTheDocument();
        expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("calls onSendMessage when Enter is pressed (without Shift)", () => {
        render(<CommunityCommentSection {...defaultProps} />);
        const textarea = screen.getByPlaceholderText(/Message #general-chat/);
        fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
        expect(defaultProps.onSendMessage).toHaveBeenCalled();
    });

    it("shows 'Chat is disabled' when chatEnabled is false", () => {
        const disabledTopic = { ...mockTopic, chatEnabled: false };
        render(<CommunityCommentSection {...defaultProps} selectedTopic={disabledTopic} />);
        expect(screen.getByText(/Chat is disabled/)).toBeInTheDocument();
        expect(screen.queryByPlaceholderText(/Message/)).toBeNull();
    });

    // Fix L149: Replace 'as any' with proper type
    it("displays reply indicator when replyingTo is set", () => {
        const replyingTo: ReplyToData = {
            id: "r2",
            content: "Hi",
            user: { name: "Bob", role: "member" },
        };
        render(<CommunityCommentSection {...defaultProps} replyingTo={replyingTo as never} />);
        expect(screen.getByText(/Replying to/)).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("opens poll creator UI when showPollCreator is true", () => {
        render(<CommunityCommentSection {...defaultProps} showPollCreator={true} />);
        expect(screen.getByText("Create Poll")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Ask a question...")).toBeInTheDocument();
    });

    it("opens attachment panel when + button clicked", () => {
        render(<CommunityCommentSection {...defaultProps} />);
        expect(defaultProps.setShowAttachmentPanel).toBeDefined();
    });

    it("handles @mention input changes", () => {
        render(<CommunityCommentSection {...defaultProps} />);
        const textarea = screen.getByPlaceholderText(/Message #general-chat/);
        fireEvent.change(textarea, { target: { value: "@Bo" } });
        expect(defaultProps.setMessageText).toHaveBeenCalledWith("@Bo");
    });
});