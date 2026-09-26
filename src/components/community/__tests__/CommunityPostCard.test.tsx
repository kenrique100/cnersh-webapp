import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CommunityPostCard } from "../CommunityPostCard";
import { ReplyData, TopicUser } from "../types";

jest.mock("next/image", () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => {
        const { unoptimized, ...rest } = props as {
            unoptimized?: boolean;
        } & Record<string, unknown>;
        void unoptimized;
        // eslint-disable-next-line jsx-a11y/alt-text
        return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
    },
}));

jest.mock("@/components/ui/avatar", () => ({
    Avatar: ({
                 children,
                 className,
             }: {
        children?: React.ReactNode;
        className?: string;
    }) => (
        <div data-testid="avatar" className={className}>
            {children}
        </div>
    ),
    AvatarImage: ({ src, alt }: { src?: string; alt?: string }) =>
        src ? <img src={src} alt={alt} data-testid="avatar-image" /> : null,
    AvatarFallback: ({
                         children,
                         className,
                     }: {
        children?: React.ReactNode;
        className?: string;
    }) => (
        <span data-testid="avatar-fallback" className={className}>
            {children}
        </span>
    ),
}));

jest.mock("@/components/ui/popover", () => ({
    Popover: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    PopoverContent: ({ children }: { children?: React.ReactNode }) => (
        <div data-testid="popover-content">{children}</div>
    ),
    PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/link-preview", () => ({
    __esModule: true,
    default: ({ url }: { url: string }) => <div data-testid="link-preview">{url}</div>,
}));

jest.mock("../utils", () => ({
    getDisplayName: (user: { name?: string | null }) => user?.name ?? "Anonymous",
    formatTime: jest.fn(() => "12:00 PM"),
    formatDate: jest.fn(() => "Jan 15, 2024"),
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
    prevReply: null as ReplyData | null,
    allReplies: [] as ReplyData[],
    currentUserId: "u1",
    isAdmin: false,
    editingReplyId: null as string | null,
    editingContent: "",
    activeMessageId: null as string | null,
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
        expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("A");
    });

    it("hides avatar when same user sent previous message within threshold", () => {
        const prev = createReply({ createdAt: new Date("2024-01-15T11:59:30Z") });
        render(<CommunityPostCard {...defaultProps} prevReply={prev} />);
        expect(screen.queryByText("Alice")).not.toBeInTheDocument();
        expect(screen.getByText("12:00 PM")).toBeInTheDocument();
    });

    it("renders reply reference when parentId is set", () => {
        const parent = createReply({
            id: "parent",
            content: "Parent text",
            user: { ...mockUser, name: "Bob" },
        });
        const reply = createReply({ parentId: "parent" });
        render(
            <CommunityPostCard
                {...defaultProps}
                reply={reply}
                allReplies={[parent, reply]}
            />
        );
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
        const pollReply = createReply({
            pollQuestion: "Q?",
            pollOptions: ["Yes", "No"],
            pollVotes: {},
        });
        render(<CommunityPostCard {...defaultProps} reply={pollReply} />);
        fireEvent.click(screen.getByText("Yes"));
        expect(defaultProps.onVotePoll).toHaveBeenCalledWith("r1", 0);
    });

    it("renders voice note with audio element", () => {
        const vnReply = createReply({ voiceNote: "blob:audio" });
        const { container } = render(
            <CommunityPostCard {...defaultProps} reply={vnReply} />
        );
        const audioEl = container.querySelector("audio");
        expect(audioEl).toBeInTheDocument();
        expect(audioEl).toHaveAttribute("src", "blob:audio");
    });

    it("shows and triggers reaction buttons", () => {
        render(<CommunityPostCard {...defaultProps} />);
        const popoverContents = screen.getAllByTestId("popover-content");
        expect(popoverContents.length).toBeGreaterThan(0);
        const thumbsUpBtn = within(popoverContents[0]).getByText("👍");
        fireEvent.click(thumbsUpBtn);
        expect(defaultProps.onReactToReply).toHaveBeenCalledWith("r1", "👍");
    });

    it("renders child replies recursively", () => {
        const childReply: ReplyData = createReply({
            id: "c1",
            content: "Child content",
            user: { ...mockUser, name: "Charlie" },
        });
        const parent = createReply({ children: [childReply] });
        render(
            <CommunityPostCard
                {...defaultProps}
                reply={parent}
                allReplies={[parent, childReply]}
            />
        );
        expect(screen.getByText("Child content")).toBeInTheDocument();
        expect(screen.getByText("Charlie")).toBeInTheDocument();
    });
});