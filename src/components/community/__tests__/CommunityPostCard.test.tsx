import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommunityPostCard } from "../CommunityPostCard";
import { ReplyData, TopicUser } from "../types";

// Mock the popover so its content is always visible for testing.
// Avoid `any` by typing the children prop.
jest.mock("@/components/ui/popover", () => ({
    Popover: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    PopoverContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// Mock formatTime to avoid timezone flakiness in tests
jest.mock("../utils", () => ({
    ...jest.requireActual("../utils"),
    formatTime: jest.fn((date: Date) => "12:00 PM"),
}));

const mockUser: TopicUser = { id: "u1", name: "Alice", image: null, role: "member" };

const createReply = (overrides: Partial<ReplyData> = {}): ReplyData => ({
    id: "r1",
    content: "Hello world",
    createdAt: new Date("2024-01-15T12:00:00Z"),
    user: mockUser,
    children: [],
    ...overrides,
});

const defaultProps = {
    reply: createReply(),
    prevReply: null,
    allReplies: [] as ReplyData[],
    currentUserId: "u1",
    isAdmin: false,
    editingReplyId: null,
    editingContent: "",
    activeMessageId: null,
    onSetEditingContent: jest.fn(),
    onEditReply: jest.fn(),
    onCancelEdit: jest.fn(),
    onMessageTap: jest.fn(),
    onUserClick: jest.fn(),
    onDeleteReply: jest.fn(),
    onReportChat: jest.fn(),
    onReplyTo: jest.fn(),
    onStartEditReply: jest.fn(),
    onVotePoll: jest.fn(),
    onReactToReply: jest.fn(),
};

describe("CommunityPostCard", () => {
    beforeEach(() => jest.clearAllMocks());

    it("renders the message content", () => {
        render(<CommunityPostCard {...defaultProps} />);
        expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("shows avatar and name when first message of a group", () => {
        render(<CommunityPostCard {...defaultProps} />);
        expect(screen.getByText("Alice")).toBeInTheDocument();
        // Avatar fallback shows initial 'A'
        expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("hides avatar when same user sent previous message within threshold", () => {
        const prev = createReply({ createdAt: new Date("2024-01-15T12:00:30Z") });
        render(<CommunityPostCard {...defaultProps} prevReply={prev} />);
        expect(screen.queryByText("Alice")).toBeNull();
        // Time stamp appears on hover, check that the time string is present
        expect(screen.getByText("12:00 PM")).toBeInTheDocument();
    });

    it("renders reply reference when parentId is set", () => {
        const parent = createReply({ id: "parent", content: "Parent text", user: { ...mockUser, name: "Bob" } });
        const reply = createReply({ parentId: "parent" });
        render(<CommunityPostCard {...defaultProps} reply={reply} allReplies={[parent, reply]} />);
        expect(screen.getByText("Parent text")).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("enters edit mode when edit button clicked and calls onStartEditReply", () => {
        render(<CommunityPostCard {...defaultProps} />);
        fireEvent.click(screen.getByTitle("Edit message"));
        expect(defaultProps.onStartEditReply).toHaveBeenCalledWith("r1", "Hello world");
    });

    it("triggers onDeleteReply when trash icon clicked (admin)", () => {
        render(<CommunityPostCard {...defaultProps} isAdmin={true} />);
        fireEvent.click(screen.getByTitle("Delete message"));
        expect(defaultProps.onDeleteReply).toHaveBeenCalledWith("r1");
    });

    it("triggers onReportChat when flag icon clicked (other user's message)", () => {
        render(<CommunityPostCard {...defaultProps} currentUserId="u2" />);
        fireEvent.click(screen.getByTitle("Report message"));
        expect(defaultProps.onReportChat).toHaveBeenCalledWith("r1");
    });

    it("triggers onReplyTo when reply button clicked", () => {
        render(<CommunityPostCard {...defaultProps} />);
        fireEvent.click(screen.getByTitle("Reply"));
        expect(defaultProps.onReplyTo).toHaveBeenCalledWith(defaultProps.reply);
    });

    it("renders poll and calls onVotePoll on option click", () => {
        const pollReply = createReply({ pollQuestion: "Q?", pollOptions: ["Yes", "No"], pollVotes: {} });
        render(<CommunityPostCard {...defaultProps} reply={pollReply} />);
        fireEvent.click(screen.getByText("Yes"));
        expect(defaultProps.onVotePoll).toHaveBeenCalledWith("r1", 0);
    });

    it("renders voice note with audio element", () => {
        const vnReply = createReply({ voiceNote: "blob:audio" });
        // use container.querySelector to find the <audio> element directly
        const { container } = render(<CommunityPostCard {...defaultProps} reply={vnReply} />);
        const audioEl = container.querySelector("audio");
        expect(audioEl).toBeInTheDocument();
        // optional: assert src attr to be sure it's the right audio
        expect(audioEl).toHaveAttribute("src", "blob:audio");
    });

    it("shows and triggers reaction buttons", () => {
        render(<CommunityPostCard {...defaultProps} />);
        // Popover is mocked, so the quick reaction buttons are directly visible
        const thumbsUpBtn = screen.getByText("👍");
        fireEvent.click(thumbsUpBtn);
        expect(defaultProps.onReactToReply).toHaveBeenCalledWith("r1", "👍");
    });

    it("renders child replies recursively", () => {
        const childReply: ReplyData = createReply({ id: "c1", content: "Child content", user: { ...mockUser, name: "Charlie" } });
        const parent = createReply({ children: [childReply] });
        render(<CommunityPostCard {...defaultProps} reply={parent} allReplies={[parent, childReply]} />);
        expect(screen.getByText("Child content")).toBeInTheDocument();
        expect(screen.getByText("Charlie")).toBeInTheDocument();
    });
});