import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSearchUsers = jest.fn();
jest.mock("@/app/actions/feed", () => ({
    searchUsers: (...a: unknown[]) => mockSearchUsers(...a),
}));

const mockCreateReport = jest.fn();
jest.mock("@/app/actions/admin", () => ({
    createReport: (...a: unknown[]) => mockCreateReport(...a),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
    toast: {
        success: (...a: unknown[]) => mockToastSuccess(...a),
        error: (...a: unknown[]) => mockToastError(...a),
    },
}));

/**
 * `next/dynamic` normally loads its component asynchronously, which triggers
 * "An update … was not wrapped in act(...)" warnings in Jest. The emoji
 * picker is not under test here, so we replace the dynamic wrapper with a
 * synchronous no-op that renders nothing.
 */
jest.mock("next/dynamic", () => {
    return function mockDynamic(_loader: () => Promise<unknown>) {
        void _loader;
        function DynamicPlaceholder() {
            return null;
        }
        DynamicPlaceholder.displayName = "DynamicPlaceholder";
        return DynamicPlaceholder;
    };
});

jest.mock("@/components/ui/button", () => ({
    Button: ({
                 children, onClick, disabled, type, className, title,
             }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
        <button onClick={onClick} disabled={disabled} type={type} className={className} title={title}>
            {children}
        </button>
    ),
}));

jest.mock("@/components/ui/avatar", () => ({
    Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AvatarImage: () => null,
    AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/badge", () => ({
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/textarea", () => ({
    Textarea: ({ value, onChange, placeholder }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
        <textarea value={value} onChange={onChange} placeholder={placeholder} />
    ),
}));

jest.mock("@/components/ui/popover", () => ({
    Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/dialog", () => ({
    Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
        open ? <div role="dialog">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock("@/components/ui/select", () => ({
    Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => (
        <div data-testid="select-wrapper" onClick={() => onValueChange?.("Spam")}>{children}</div>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
        <div data-value={value}>{children}</div>
    ),
}));

jest.mock("lucide-react", () => {
    const icon = (name: string) => {
        function Icon({ className }: { className?: string }) {
            return <span data-testid={`icon-${name}`} className={className} />;
        }
        Icon.displayName = name;
        return Icon;
    };
    const cache = new Map<string, ReturnType<typeof icon>>();
    return new Proxy({} as Record<string, ReturnType<typeof icon>>, {
        get(_target, prop: string) {
            if (prop === "__esModule") return true;
            if (typeof prop !== "string") return undefined;
            if (!cache.has(prop)) {
                const label = prop.endsWith("Icon") ? prop.slice(0, -4) : prop;
                cache.set(prop, icon(label));
            }
            return cache.get(prop);
        },
    });
});

jest.mock("@/components/post-card", () => ({
    CommentReactionSummary: ({ count }: { count: number }) => (
        <span data-testid="reaction-summary">{count}</span>
    ),
    getInitials: (name?: string | null) => (name ?? "U")[0].toUpperCase(),
    formatRelativeDate: () => "2h ago",
    renderPostContent: (text: string) => text,
    REACTIONS: [{ label: "Like" }, { label: "Love" }],
    getReactionEmoji: (r: string) => (r === "Love" ? "❤️" : "👍"),
}));

jest.mock("../emoji-picker", () => {
    function EmojiPickerMock({ onSelect }: { onSelect: (e: string) => void }) {
        return <button data-testid="emoji-picker" onClick={() => onSelect("🚀")}>pick</button>;
    }
    EmojiPickerMock.displayName = "EmojiPickerMock";
    return { __esModule: true, default: EmojiPickerMock };
});

jest.mock("@/lib/utils", () => ({
    cn: (...c: (string | boolean | undefined)[]) => c.filter(Boolean).join(" "),
}));

import CommentThread, { type CommentData } from "../comment-thread";

const FIXED_ISO = "2024-01-01T00:00:00.000Z";

const currentUser = {
    id: "current-user",
    name: "Current User",
    image: null as string | null,
    gender: null as string | null,
};

function makeComment(overrides: Partial<CommentData> = {}): CommentData {
    return {
        id: "c1",
        content: "A comment",
        createdAt: FIXED_ISO,
        user: { id: "user-2", name: "Bob", image: null, role: "user", profession: null },
        _count: { commentLikes: 0, replies: 0 },
        commentLikes: [],
        replies: [],
        ...overrides,
    };
}

const defaultProps = {
    postId: "post-1",
    postAuthorId: "post-author",
    commentsEnabled: true,
    comments: [makeComment()],
    currentUser,
    isAdmin: false,
    onSubmit: jest.fn().mockResolvedValue(undefined),
    onEdit: jest.fn().mockResolvedValue(undefined),
    onDelete: jest.fn().mockResolvedValue(undefined),
    onLike: jest.fn().mockResolvedValue(undefined),
};

function setup(overrides: Partial<typeof defaultProps> = {}) {
    const user = userEvent.setup();
    const utils = render(<CommentThread {...defaultProps} {...overrides} />);
    return { user, ...utils };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockSearchUsers.mockResolvedValue([]);
});

describe("CommentThread", () => {
    describe("rendering", () => {
        it("renders nothing when comments are disabled", () => {
            const { container } = setup({ commentsEnabled: false });
            expect(container).toBeEmptyDOMElement();
        });

        it("renders a comment's content, author name and timestamp", () => {
            setup({ comments: [makeComment({ content: "Hello world" })] });
            expect(screen.getByText("Hello world")).toBeInTheDocument();
            expect(screen.getByText("Bob")).toBeInTheDocument();
            expect(screen.getByText("2h ago")).toBeInTheDocument();
        });

        it("renders the Author badge when the comment author owns the post", () => {
            setup({
                comments: [makeComment({ user: { id: "post-author", name: "Alice", image: null, role: "user" } })],
            });
            expect(screen.getByText("Author")).toBeInTheDocument();
        });

        it("renders the Admin badge for admin comment authors", () => {
            setup({
                comments: [makeComment({ user: { id: "user-2", name: "Bob", image: null, role: "admin" } })],
            });
            expect(screen.getByText("Admin")).toBeInTheDocument();
        });

        it("renders nested replies", () => {
            setup({
                comments: [
                    makeComment({
                        replies: [
                            makeComment({
                                id: "r1",
                                content: "A reply",
                                user: { id: "user-3", name: "Charlie", image: null, role: "user" },
                            }),
                        ],
                    }),
                ],
            });
            expect(screen.getByText("A reply")).toBeInTheDocument();
            expect(screen.getByText("Charlie")).toBeInTheDocument();
        });

        it("renders the comment input with a placeholder", () => {
            setup();
            expect(screen.getByPlaceholderText(/write a comment/i)).toBeInTheDocument();
        });
    });

    describe("submitting", () => {
        it("disables the send button when the input is empty", () => {
            setup();
            const input = screen.getByPlaceholderText(/write a comment/i);
            expect(input).toHaveValue("");

            // Locate the icon-only send button by the mock testid it renders
            // for its `SendIcon` child. There is exactly one such button when
            // the reply indicator is not open.
            const sendIcon = screen.getByTestId("icon-Send");
            const sendBtn = sendIcon.closest("button");
            expect(sendBtn).not.toBeNull();
            expect(sendBtn).toBeDisabled();
        });

        it("calls onSubmit with the trimmed comment text on Enter", async () => {
            const { user } = setup();
            const input = screen.getByPlaceholderText(/write a comment/i);
            await user.type(input, "My comment");
            await user.keyboard("{Enter}");
            expect(defaultProps.onSubmit).toHaveBeenCalledWith("post-1", "My comment", undefined);
        });

        it("clears the input and closes the reply indicator after a successful submit", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /^reply$/i }));
            const input = screen.getByPlaceholderText(/reply to/i);
            await user.type(input, "text");
            await user.keyboard("{Enter}");
            await waitFor(() => {
                expect(screen.queryByText(/replying to/i)).not.toBeInTheDocument();
            });
            expect((input as HTMLInputElement).value).toBe("");
        });

        it("does not call onSubmit with an empty input", async () => {
            const { user } = setup();
            const input = screen.getByPlaceholderText(/write a comment/i);
            await user.click(input);
            await user.keyboard("{Enter}");
            expect(defaultProps.onSubmit).not.toHaveBeenCalled();
        });
    });

    describe("reply flow", () => {
        it("shows the reply indicator when Reply is clicked", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /^reply$/i }));

            expect(screen.getByText(/replying to/i)).toBeInTheDocument();

            // "Bob" appears in two places now: the comment author's <p> and
            // the reply indicator's <strong>. Use getAllByText.
            const bobs = screen.getAllByText("Bob");
            expect(bobs.length).toBeGreaterThanOrEqual(2);
        });

        it("prepends @mention to the input when Reply is clicked", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /^reply$/i }));
            const input = screen.getByPlaceholderText(/reply to/i) as HTMLInputElement;
            expect(input.value).toBe("@Bob ");
        });

        it("cancels the reply state via the X button", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /^reply$/i }));
            expect(screen.getByText(/replying to/i)).toBeInTheDocument();

            // The X button lives inside the reply indicator and is the only
            // element rendering an XIcon at this point.
            const xIcons = screen.getAllByTestId("icon-X");
            const cancelBtn = xIcons[0].closest("button");
            expect(cancelBtn).not.toBeNull();
            await user.click(cancelBtn!);

            expect(screen.queryByText(/replying to/i)).not.toBeInTheDocument();
        });

        it("submits the reply with the parent comment id", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /^reply$/i }));
            const input = screen.getByPlaceholderText(/reply to/i);
            await user.clear(input);
            await user.type(input, "Reply text");
            await user.keyboard("{Enter}");
            expect(defaultProps.onSubmit).toHaveBeenCalledWith("post-1", "Reply text", "c1");
        });
    });

    describe("editing", () => {
        it("shows the Edit button only for the comment author", () => {
            setup({ currentUser: { ...currentUser, id: "someone-else" } });
            expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
        });

        it("shows the Edit button for the comment author", () => {
            setup({ currentUser: { ...currentUser, id: "user-2" } });
            expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
        });

        it("opens an inline editor with the current content", async () => {
            const { user } = setup({ currentUser: { ...currentUser, id: "user-2" } });
            await user.click(screen.getByRole("button", { name: /^edit$/i }));
            expect(screen.getByDisplayValue("A comment")).toBeInTheDocument();
        });

        it("calls onEdit with the new content on Save", async () => {
            const { user } = setup({ currentUser: { ...currentUser, id: "user-2" } });
            await user.click(screen.getByRole("button", { name: /^edit$/i }));
            const editInput = screen.getByDisplayValue("A comment");
            await user.clear(editInput);
            await user.type(editInput, "Edited!");
            await user.click(screen.getByRole("button", { name: /^save$/i }));
            expect(defaultProps.onEdit).toHaveBeenCalledWith("post-1", "c1", "Edited!");
        });

        it("saves on Enter", async () => {
            const { user } = setup({ currentUser: { ...currentUser, id: "user-2" } });
            await user.click(screen.getByRole("button", { name: /^edit$/i }));
            const editInput = screen.getByDisplayValue("A comment");
            await user.clear(editInput);
            await user.type(editInput, "Saved via Enter{Enter}");
            expect(defaultProps.onEdit).toHaveBeenCalledWith("post-1", "c1", "Saved via Enter");
        });

        it("cancels editing on Escape", async () => {
            const { user } = setup({ currentUser: { ...currentUser, id: "user-2" } });
            await user.click(screen.getByRole("button", { name: /^edit$/i }));
            await user.keyboard("{Escape}");
            expect(screen.queryByDisplayValue("A comment")).not.toBeInTheDocument();
        });

        it("cancels editing via the Cancel button", async () => {
            const { user } = setup({ currentUser: { ...currentUser, id: "user-2" } });
            await user.click(screen.getByRole("button", { name: /^edit$/i }));
            await user.click(screen.getByRole("button", { name: /^cancel$/i }));
            expect(screen.queryByDisplayValue("A comment")).not.toBeInTheDocument();
            expect(defaultProps.onEdit).not.toHaveBeenCalled();
        });
    });

    describe("delete", () => {
        it("shows the Delete button for the comment author", () => {
            setup({ currentUser: { ...currentUser, id: "user-2" } });
            expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
        });

        it("shows the Delete button for admins on other users' comments", () => {
            setup({ isAdmin: true, currentUser: { ...currentUser, id: "admin-user" } });
            expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
        });

        it("does not show the Delete button for unrelated users", () => {
            setup({ isAdmin: false, currentUser: { ...currentUser, id: "someone-else" } });
            expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
        });

        it("calls onDelete with the comment id", async () => {
            const { user } = setup({ currentUser: { ...currentUser, id: "user-2" } });
            await user.click(screen.getByRole("button", { name: /^delete$/i }));
            expect(defaultProps.onDelete).toHaveBeenCalledWith("post-1", "c1");
        });
    });

    describe("liking", () => {
        it("calls onLike with the default Like reaction", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /^like$/i }));
            expect(defaultProps.onLike).toHaveBeenCalledWith("post-1", "c1", false, "Like");
        });

        it("renders the reaction emoji when the current user already liked", () => {
            setup({
                comments: [
                    makeComment({
                        commentLikes: [
                            { userId: "current-user", isDislike: false, reactionType: "Love" },
                        ],
                    }),
                ],
            });
            expect(screen.getByText("❤️")).toBeInTheDocument();
        });

        it("uses the current user's reaction type when re-clicking Like", async () => {
            const { user } = setup({
                comments: [
                    makeComment({
                        commentLikes: [
                            { userId: "current-user", isDislike: false, reactionType: "Love" },
                        ],
                    }),
                ],
            });
            await user.click(screen.getByRole("button", { name: /love/i }));
            expect(defaultProps.onLike).toHaveBeenCalledWith("post-1", "c1", false, "Love");
        });
    });

    describe("long comment", () => {
        it("collapses long comments and shows a See more button", () => {
            setup({ comments: [makeComment({ content: "x".repeat(250) })] });
            expect(screen.getByRole("button", { name: /see more/i })).toBeInTheDocument();
        });

        it("toggles to See less after expanding", async () => {
            const { user } = setup({ comments: [makeComment({ content: "x".repeat(250) })] });
            await user.click(screen.getByRole("button", { name: /see more/i }));
            expect(screen.getByRole("button", { name: /see less/i })).toBeInTheDocument();
        });

        it("toggles back to See more after collapsing again", async () => {
            const { user } = setup({ comments: [makeComment({ content: "x".repeat(250) })] });
            await user.click(screen.getByRole("button", { name: /see more/i }));
            await user.click(screen.getByRole("button", { name: /see less/i }));
            expect(screen.getByRole("button", { name: /see more/i })).toBeInTheDocument();
        });
    });

    describe("load more", () => {
        it("renders at most three comments initially", () => {
            const many = Array.from({ length: 6 }, (_, i) =>
                makeComment({ id: `c${i}`, content: `Comment ${i}` }),
            );
            setup({ comments: many });
            for (let i = 0; i < 3; i++) {
                expect(screen.getByText(`Comment ${i}`)).toBeInTheDocument();
            }
            for (let i = 3; i < 6; i++) {
                expect(screen.queryByText(`Comment ${i}`)).not.toBeInTheDocument();
            }
        });

        it("shows a Load more button when there are more than three comments", () => {
            const many = Array.from({ length: 6 }, (_, i) =>
                makeComment({ id: `c${i}`, content: `Comment ${i}` }),
            );
            setup({ comments: many });
            expect(screen.getByText(/load more comments/i)).toBeInTheDocument();
        });

        it("reveals five more comments when Load more is clicked", async () => {
            const many = Array.from({ length: 6 }, (_, i) =>
                makeComment({ id: `c${i}`, content: `Comment ${i}` }),
            );
            const { user } = setup({ comments: many });
            await user.click(screen.getByText(/load more comments/i));
            expect(screen.queryByText(/load more comments/i)).not.toBeInTheDocument();
        });
    });

    describe("mention search", () => {
        it("shows the mention dropdown after typing @", async () => {
            mockSearchUsers.mockResolvedValueOnce([
                { id: "u1", name: "Alice", image: null },
            ]);
            const { user } = setup();
            const input = screen.getByPlaceholderText(/write a comment/i);
            await user.type(input, "@Al");
            await waitFor(() => {
                expect(screen.getByText("Alice")).toBeInTheDocument();
            });
        });

        it("calls searchUsers with the text after the @", async () => {
            mockSearchUsers.mockResolvedValueOnce([]);
            const { user } = setup();
            const input = screen.getByPlaceholderText(/write a comment/i);
            await user.type(input, "@Al");
            await waitFor(() => {
                expect(mockSearchUsers).toHaveBeenCalledWith("Al");
            });
        });

        it("inserts the full name and a space when a mention is clicked", async () => {
            mockSearchUsers.mockResolvedValueOnce([
                { id: "u1", name: "Alice", image: null },
            ]);
            const { user } = setup();
            const input = screen.getByPlaceholderText(/write a comment/i) as HTMLInputElement;
            await user.type(input, "@Al");
            const option = await screen.findByText("Alice");
            await user.click(option);
            await waitFor(() => {
                expect(input.value).toBe("@Alice ");
            });
        });

        it("closes the dropdown after a mention is inserted", async () => {
            mockSearchUsers.mockResolvedValueOnce([
                { id: "u1", name: "Alice", image: null },
            ]);
            const { user } = setup();
            const input = screen.getByPlaceholderText(/write a comment/i);
            await user.type(input, "@Al");
            const option = await screen.findByText("Alice");
            await user.click(option);
            expect(screen.queryByText("Alice")).not.toBeInTheDocument();
        });

        it("does not open the dropdown when there is no @", async () => {
            const { user } = setup();
            const input = screen.getByPlaceholderText(/write a comment/i);
            await user.type(input, "hello");
            expect(mockSearchUsers).not.toHaveBeenCalled();
        });

        it("submits on Enter even when the dropdown is closed", async () => {
            const { user } = setup();
            const input = screen.getByPlaceholderText(/write a comment/i);
            await user.type(input, "hi{Enter}");
            expect(defaultProps.onSubmit).toHaveBeenCalledWith("post-1", "hi", undefined);
        });
    });

    describe("report dialog", () => {
        it("shows the Report button for other users' comments", () => {
            setup({ currentUser: { ...currentUser, id: "someone-else" } });
            expect(screen.getByRole("button", { name: /^report$/i })).toBeInTheDocument();
        });

        it("opens the report dialog when Report is clicked", async () => {
            const { user } = setup({ currentUser: { ...currentUser, id: "someone-else" } });
            await user.click(screen.getByRole("button", { name: /^report$/i }));
            expect(screen.getByRole("heading", { name: /report comment/i })).toBeInTheDocument();
        });

        it("submits the report and shows a success toast", async () => {
            mockCreateReport.mockResolvedValueOnce(undefined);
            const { user } = setup({ currentUser: { ...currentUser, id: "someone-else" } });
            await user.click(screen.getByRole("button", { name: /^report$/i }));
            await user.click(screen.getByTestId("select-wrapper"));
            await user.click(screen.getByRole("button", { name: /submit report/i }));
            await waitFor(() => {
                expect(mockCreateReport).toHaveBeenCalledWith(
                    expect.objectContaining({ contentType: "COMMENT", contentId: "c1" }),
                );
                expect(mockToastSuccess).toHaveBeenCalledWith("Comment reported successfully");
            });
        });

        it("shows an error toast when the report fails", async () => {
            mockCreateReport.mockRejectedValueOnce(new Error("fail"));
            const { user } = setup({ currentUser: { ...currentUser, id: "someone-else" } });
            await user.click(screen.getByRole("button", { name: /^report$/i }));
            await user.click(screen.getByTestId("select-wrapper"));
            await user.click(screen.getByRole("button", { name: /submit report/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith("Failed to report comment");
            });
        });
    });
});