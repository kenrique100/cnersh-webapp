import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CommunityCommentSection } from "@/components/community/CommunityCommentSection";
import type { TopicDetail, CommunityUser } from "@/components/community/types";

jest.mock("next/image", () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => {
        const { unoptimized, ...rest } = props as { unoptimized?: boolean } & Record<string, unknown>;
        void unoptimized;
        // eslint-disable-next-line jsx-a11y/alt-text
        return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
    },
}));

jest.mock("@/components/link-preview", () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock("@/components/community/CommunityPostCard", () => {
    interface CardProps {
        reply: { id: string };
        onReactToReply?: (replyId: string, emoji: string) => void;
    }
    return {
        CommunityPostCard: ({ reply, onReactToReply }: CardProps) => (
            <div data-testid={`post-card-${reply.id}`}>
                <button
                    data-testid={`react-${reply.id}`}
                    onClick={() => onReactToReply?.(reply.id, "👍")}
                >
                    React
                </button>
            </div>
        ),
    };
});

jest.mock("@/lib/utils", () => ({
    cn: (...classes: (string | boolean | undefined)[]) =>
        classes.filter(Boolean).join(" "),
}));

// NOTE: `formatDateSeparator` and `isSameDay` are required by the new
// CommunityCommentSection implementation. Returning `true` from `isSameDay`
// means no date separators are inserted between same-day replies, which
// keeps the existing assertions stable.
jest.mock("@/components/community/utils", () => ({
    getDisplayName: (user: { name?: string | null }) => user?.name ?? "Anonymous",
    formatDate: () => "Jan 1, 2024",
    formatTime: () => "12:00",
    formatDateSeparator: () => "Today",
    isSameDay: () => true,
    deleteBlobUrl: jest.fn(),
}));

const users: CommunityUser[] = [
    { id: "u1", name: "Alice", image: null, role: "admin" },
    { id: "u2", name: "Bob", image: null, role: "member" },
];

function makeTopic(overrides: Partial<TopicDetail> = {}): TopicDetail {
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
        replies: [],
        ...overrides,
    };
}

function makeReplies(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        id: `r-${i}`,
        content: `Reply ${i}`,
        createdAt: new Date(),
        user: { id: "u1", name: "Alice", image: null, role: "admin" },
        children: [],
    }));
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
    pendingImages: [] as string[],
    setPendingImages: jest.fn(),
    pendingVideos: [] as string[],
    setPendingVideos: jest.fn(),
    pendingAudios: [] as string[],
    setPendingAudios: jest.fn(),
    pendingDocuments: [] as string[],
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
    onReactToReply: jest.fn(),
};

function withScrollMetrics(
    el: HTMLElement,
    metrics: { scrollHeight: number; clientHeight: number; scrollTop: number }
) {
    Object.defineProperty(el, "scrollHeight", { configurable: true, value: metrics.scrollHeight });
    Object.defineProperty(el, "clientHeight", { configurable: true, value: metrics.clientHeight });
    Object.defineProperty(el, "scrollTop", { configurable: true, writable: true, value: metrics.scrollTop });
}

function getComposer(textarea: HTMLElement): HTMLElement {
    return textarea.parentElement as HTMLElement;
}

function getSendButton(textarea: HTMLElement): HTMLButtonElement {
    const buttons = Array.from(
        getComposer(textarea).querySelectorAll("button")
    ) as HTMLButtonElement[];
    return buttons[buttons.length - 1];
}

function getMentionDropdown(): HTMLElement {
    const searchInput = screen.getByPlaceholderText(/Search members/i);
    return searchInput.closest("div")!.parentElement as HTMLElement;
}

describe("CommunityCommentSection — scroll to bottom", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Element.prototype.scrollTo = jest.fn();
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    it("hides the arrow when the user is at the bottom", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                selectedTopic={makeTopic({ replies: makeReplies(1) })}
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
                selectedTopic={makeTopic({ replies: makeReplies(30) })}
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
                selectedTopic={makeTopic({ replies: makeReplies(30) })}
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
        const topic = makeTopic({ replies: makeReplies(10) });
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

        const longerTopic = makeTopic({ replies: makeReplies(11) });
        rerender(
            <CommunityCommentSection
                {...baseProps}
                onMessagesRead={onMessagesRead}
                selectedTopic={longerTopic}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );

        withScrollMetrics(container, { scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
        fireEvent.scroll(container);

        expect(onMessagesRead).toHaveBeenCalledTimes(1);
    });

    it("does not show the unseen badge when the user is already at the bottom", () => {
        const topic = makeTopic({ replies: makeReplies(5) });
        const { rerender } = render(
            <CommunityCommentSection
                {...baseProps}
                selectedTopic={topic}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const container = screen.getByTestId("community-scroll-container");
        withScrollMetrics(container, { scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
        fireEvent.scroll(container);

        rerender(
            <CommunityCommentSection
                {...baseProps}
                selectedTopic={makeTopic({ replies: makeReplies(6) })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );

        const btn = screen.getByTestId("scroll-to-bottom-button");
        expect(btn).not.toHaveTextContent(/\d+ new/);
    });
});

describe("CommunityCommentSection — reactions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Element.prototype.scrollTo = jest.fn();
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    it("passes onReactToReply to every CommunityPostCard", () => {
        const onReactToReply = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                onReactToReply={onReactToReply}
                selectedTopic={makeTopic({ replies: makeReplies(3) })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );

        fireEvent.click(screen.getByTestId("react-r-1"));
        expect(onReactToReply).toHaveBeenCalledWith("r-1", "👍");
    });

    it("routes the reaction to the specific reply card that was clicked", () => {
        const onReactToReply = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                onReactToReply={onReactToReply}
                selectedTopic={makeTopic({ replies: makeReplies(3) })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );

        fireEvent.click(screen.getByTestId("react-r-0"));
        fireEvent.click(screen.getByTestId("react-r-2"));

        expect(onReactToReply).toHaveBeenNthCalledWith(1, "r-0", "👍");
        expect(onReactToReply).toHaveBeenNthCalledWith(2, "r-2", "👍");
    });

    it("renders no post cards when there are no replies", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                selectedTopic={makeTopic({ replies: [] })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.queryByTestId(/^post-card-/)).toBeNull();
    });
});

describe("CommunityCommentSection — chat disabled", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Element.prototype.scrollTo = jest.fn();
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    it("hides the composer when chat is disabled", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                selectedTopic={makeTopic({ chatEnabled: false })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByText(/Chat is disabled/i)).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(/Message #general/i)
        ).not.toBeInTheDocument();
    });

    it("shows the composer when chat is enabled", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                selectedTopic={makeTopic({ chatEnabled: true })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByPlaceholderText(/Message #general/i)).toBeInTheDocument();
    });

    it("shows the toggle-chat button for the owner", () => {
        const onToggleChat = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                currentUserId="u1"
                onToggleChat={onToggleChat}
                selectedTopic={makeTopic({ userId: "u1" })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const toggle = screen.getByTitle(/Disable chat/i);
        fireEvent.click(toggle);
        expect(onToggleChat).toHaveBeenCalledWith("topic-1");
    });

    it("shows the toggle-chat button for super-admins even when not owner", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                currentUserId="u2"
                isSuperAdmin
                selectedTopic={makeTopic({ userId: "u1" })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByTitle(/Disable chat/i)).toBeInTheDocument();
    });

    it("hides the toggle-chat button for non-owners who are not super-admins", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                currentUserId="u2"
                isSuperAdmin={false}
                selectedTopic={makeTopic({ userId: "u1" })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.queryByTitle(/Disable chat/i)).toBeNull();
    });
});

describe("CommunityCommentSection — composer", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Element.prototype.scrollTo = jest.fn();
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    it("sends a message when the send button is clicked", () => {
        const onSendMessage = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                messageText="Hello"
                onSendMessage={onSendMessage}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const textarea = screen.getByPlaceholderText(/Message #general/i);
        fireEvent.click(getSendButton(textarea));
        expect(onSendMessage).toHaveBeenCalledTimes(1);
    });

    it("submits on Enter without Shift", () => {
        const onSendMessage = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                messageText="Hello"
                onSendMessage={onSendMessage}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const textarea = screen.getByPlaceholderText(/Message #general/i);
        fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
        expect(onSendMessage).toHaveBeenCalledTimes(1);
    });

    it("does not submit on Shift+Enter", () => {
        const onSendMessage = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                messageText="Hello"
                onSendMessage={onSendMessage}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const textarea = screen.getByPlaceholderText(/Message #general/i);
        fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
        expect(onSendMessage).not.toHaveBeenCalled();
    });

    it("shows the 'Replying to' banner when replyingTo is set", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                replyingTo={{
                    id: "reply-x",
                    content: "hi",
                    createdAt: new Date(),
                    user: { id: "u1", name: "Alice", image: null, role: "admin" },
                }}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByText(/Replying to/i)).toBeInTheDocument();
    });

    it("clears the reply target on X click", () => {
        const setReplyingTo = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                replyingTo={{
                    id: "reply-x",
                    content: "hi",
                    createdAt: new Date(),
                    user: { id: "u1", name: "Alice", image: null, role: "admin" },
                }}
                setReplyingTo={setReplyingTo}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const banner = screen.getByText(/Replying to/i).closest("div")!;
        const xBtn = banner.querySelector("button");
        expect(xBtn).not.toBeNull();
        fireEvent.click(xBtn!);
        expect(setReplyingTo).toHaveBeenCalledWith(null);
    });

    it("opens the emoji picker when its button is clicked", () => {
        const setShowEmojiPicker = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                setShowEmojiPicker={setShowEmojiPicker}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const textarea = screen.getByPlaceholderText(/Message #general/i);
        const buttons = Array.from(
            getComposer(textarea).querySelectorAll("button")
        );
        for (const btn of buttons) {
            fireEvent.click(btn);
            if (setShowEmojiPicker.mock.calls.length > 0) break;
        }
        expect(setShowEmojiPicker).toHaveBeenCalled();
    });

    it("inserts an emoji into the message via the picker", () => {
        const setMessageText = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                messageText="Hello"
                setMessageText={setMessageText}
                showEmojiPicker
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const emojiBtn = screen.getByRole("button", { name: "😀" });
        fireEvent.click(emojiBtn);
        expect(setMessageText).toHaveBeenCalledWith("Hello😀");
    });

    it("opens the mention picker and inserts the picked user", () => {
        const setMessageText = jest.fn();
        const setShowMentions = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                messageText="Hi "
                setMessageText={setMessageText}
                setShowMentions={setShowMentions}
                showMentions
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const dropdown = getMentionDropdown();
        const aliceRow = within(dropdown).getByText("Alice");
        fireEvent.click(aliceRow.closest("button")!);
        expect(setMessageText).toHaveBeenCalledWith("Hi @Alice ");
        expect(setShowMentions).toHaveBeenCalledWith(false);
    });

    it("filters mention candidates via mentionFilter", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                mentionFilter="bob"
                showMentions
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const dropdown = getMentionDropdown();
        expect(within(dropdown).getByText("Bob")).toBeInTheDocument();
        expect(within(dropdown).queryByText("Alice")).toBeNull();
    });

    it("calls onMentionAll when the mention-all button is clicked", () => {
        const onMentionAll = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                onMentionAll={onMentionAll}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        fireEvent.click(screen.getByTitle(/Mention all users/i));
        expect(onMentionAll).toHaveBeenCalledTimes(1);
    });

    it("triggers onStartRecording when the mic is clicked", () => {
        const onStartRecording = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                onStartRecording={onStartRecording}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        fireEvent.click(screen.getByTitle(/Record voice note/i));
        expect(onStartRecording).toHaveBeenCalledTimes(1);
    });

    it("triggers onStopRecording when recording", () => {
        const onStopRecording = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                isRecording
                onStopRecording={onStopRecording}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        fireEvent.click(screen.getByTitle(/Stop recording/i));
        expect(onStopRecording).toHaveBeenCalledTimes(1);
    });
});

describe("CommunityCommentSection — composer panels", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Element.prototype.scrollTo = jest.fn();
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    it("shows the attachment panel when toggled", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                showAttachmentPanel
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByText("Image")).toBeInTheDocument();
        expect(screen.getByText("Video")).toBeInTheDocument();
        expect(screen.getByText("Document")).toBeInTheDocument();
        expect(screen.getByText("Audio")).toBeInTheDocument();
        expect(screen.getByText("Poll")).toBeInTheDocument();
        expect(screen.getByText("Event")).toBeInTheDocument();
        expect(screen.getByText("Link")).toBeInTheDocument();
        expect(screen.getByText("Contact")).toBeInTheDocument();
    });

    it("shows the poll creator when toggled", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                showPollCreator
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByPlaceholderText(/Ask a question/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Add option/i)).toBeInTheDocument();
    });

    it("shows the event creator when toggled", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                showEventCreator
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByPlaceholderText(/Event title/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Location/i)).toBeInTheDocument();
    });

    it("shows the link input when toggled", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                showLinkInput
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByPlaceholderText(/Paste a link URL/i)).toBeInTheDocument();
    });

    it("renders pending image previews", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                pendingImages={["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"]}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getAllByAltText(/Preview/)).toHaveLength(2);
    });

    it("renders pending video chips", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                pendingVideos={["https://cdn.test/v1.mp4", "https://cdn.test/v2.mp4"]}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByText("Video 1")).toBeInTheDocument();
        expect(screen.getByText("Video 2")).toBeInTheDocument();
    });

    it("renders pending audio chips", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                pendingAudios={["https://cdn.test/a1.mp3"]}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByText("Audio 1")).toBeInTheDocument();
    });

    it("renders pending document chips", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                pendingDocuments={["https://cdn.test/d1.pdf"]}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByText("Document 1")).toBeInTheDocument();
    });

    it("renders the pending voice note audio element", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                pendingVoiceNote="https://cdn.test/voice.webm"
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const audio = document.querySelector(
            'audio[src="https://cdn.test/voice.webm"]'
        );
        expect(audio).not.toBeNull();
    });

    it("renders the pending poll summary", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                pendingPollQuestion="Favorite color?"
                pendingPollOptions={["Red", "Blue"]}
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByText(/Poll: Favorite color\?/i)).toBeInTheDocument();
    });

    it("renders the pending event summary", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                pendingEventTitle="Meeting"
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByText(/Event: Meeting/i)).toBeInTheDocument();
    });

    it("renders the pending link URL", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                pendingLinkUrl="https://example.com"
                selectedTopic={makeTopic()}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByText("https://example.com")).toBeInTheDocument();
    });
});

describe("CommunityCommentSection — header", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Element.prototype.scrollTo = jest.fn();
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    it("shows the slugified topic title", () => {
        render(
            <CommunityCommentSection
                {...baseProps}
                selectedTopic={makeTopic({ title: "My Big Topic" })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        expect(screen.getByText("my-big-topic")).toBeInTheDocument();
    });

    it("renders announcement like/dislike buttons for Announcements category", () => {
        const onToggleTopicLike = jest.fn();
        render(
            <CommunityCommentSection
                {...baseProps}
                onToggleTopicLike={onToggleTopicLike}
                selectedTopic={makeTopic({ category: "Announcements", title: "News" })}
                messagesEndRef={React.createRef<HTMLDivElement>()}
            />
        );
        const buttons = screen.getAllByRole("button");
        buttons.forEach((btn) => fireEvent.click(btn));
        expect(onToggleTopicLike).toHaveBeenCalled();
    });
});