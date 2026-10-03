import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockGetPostComments = jest.fn();
const mockAddComment = jest.fn();
const mockToggleCommentLike = jest.fn();
const mockEditComment = jest.fn();
const mockDeleteComment = jest.fn();
jest.mock("@/app/actions/feed", () => ({
    getPostComments: (...a: unknown[]) => mockGetPostComments(...a),
    addComment: (...a: unknown[]) => mockAddComment(...a),
    toggleCommentLike: (...a: unknown[]) => mockToggleCommentLike(...a),
    editComment: (...a: unknown[]) => mockEditComment(...a),
    deleteComment: (...a: unknown[]) => mockDeleteComment(...a),
    updatePost: jest.fn(),
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

jest.mock("next/image", () => {
    function NextImage({ src, alt }: { src: string; alt: string }) {
        return <img src={src} alt={alt} />;
    }
    NextImage.displayName = "NextImage";
    return { __esModule: true, default: NextImage };
});

jest.mock("../video-upload-input", () => {
    function VideoUploadMock({ onUpload }: { onUpload: (url: string) => void }) {
        return (
            <button data-testid="video-upload" onClick={() => onUpload("https://cdn.test/v.mp4")}>
                Video
            </button>
        );
    }
    VideoUploadMock.displayName = "VideoUploadMock";
    return { __esModule: true, default: VideoUploadMock };
});

jest.mock("@/components/image-upload", () => {
    function ImageUploadMock({ onChange }: { onChange: (url: string) => void }) {
        return (
            <button onClick={() => onChange("https://cdn.test/img.jpg")}>
                Upload Image
            </button>
        );
    }
    ImageUploadMock.displayName = "ImageUploadMock";
    return { __esModule: true, default: ImageUploadMock };
});

jest.mock("@/components/cta-link-button", () => ({
    CTA_LINK_TYPES: [{ value: "learn_more", label: "Learn More" }],
    DEFAULT_LINK_TYPE: "learn_more",
}));

jest.mock("@/components/link-preview-card", () => {
    function LinkPreviewCardMock({ url }: { url: string }) {
        return <div data-testid="link-preview">{url}</div>;
    }
    LinkPreviewCardMock.displayName = "LinkPreviewCardMock";
    return { __esModule: true, default: LinkPreviewCardMock };
});

jest.mock("@/components/reactions-picker", () => ({
    ReactionsPicker: ({
                          onReact,
                          postId,
                      }: {
        onReact: (pid: string, r: string) => void;
        postId: string;
    }) => (
        <button data-testid="reactions-picker" onClick={() => onReact(postId, "Like")}>
            Like
        </button>
    ),
}));

jest.mock("@/components/ui/button", () => ({
    Button: ({
                 children,
                 onClick,
                 disabled,
                 type,
                 className,
                 title,
             }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        children: React.ReactNode;
    }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={className}
            title={title}
        >
            {children}
        </button>
    ),
}));

jest.mock("@/components/ui/badge", () => ({
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/textarea", () => ({
    Textarea: ({
                   value,
                   onChange,
                   placeholder,
               }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
        <textarea value={value} onChange={onChange} placeholder={placeholder} />
    ),
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
    Select: ({
                 children,
                 onValueChange,
             }: {
        children: React.ReactNode;
        onValueChange?: (v: string) => void;
    }) => (
        <div data-testid="select-wrapper" onClick={() => onValueChange?.("Spam")}>
            {children}
        </div>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
        <span>{placeholder}</span>
    ),
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
    PostCard: ({
                   children,
                   isUnread,
               }: {
        children: React.ReactNode;
        isUnread?: boolean;
    }) => (
        <div data-testid="post-card" data-unread={isUnread ? "true" : "false"}>
            {children}
        </div>
    ),
    PostContextBar: () => null,
    PostHeader: ({
                     userName,
                     actions,
                 }: {
        userName?: string | null;
        actions?: React.ReactNode;
    }) => (
        <div data-testid="post-header">
            {userName}
            <div data-testid="post-actions">{actions}</div>
        </div>
    ),
    PostTextContent: ({
                          content,
                          customRender,
                      }: {
        content: string;
        customRender?: React.ReactNode;
    }) => <div data-testid="post-text">{customRender ?? content}</div>,
    PostTags: ({ tags }: { tags: string[] }) => (
        <div data-testid="post-tags">{tags?.join(",")}</div>
    ),
    PostMediaContent: ({
                           onImageClick,
                       }: {
        onImageClick?: (i: number) => void;
    }) => (
        <div data-testid="post-media">
            <button data-testid="open-image-modal" onClick={() => onImageClick?.(0)}>
                Open
            </button>
        </div>
    ),
    PostEngagementSummary: ({
                                likeCount,
                                commentCount,
                                onLikeCountClick,
                                onCommentCountClick,
                            }: {
        likeCount: number;
        commentCount: number;
        onLikeCountClick: () => void;
        onCommentCountClick: () => void;
    }) => (
        <div>
            <button onClick={onLikeCountClick} data-testid="like-count">
                {likeCount} likes
            </button>
            <button onClick={onCommentCountClick} data-testid="comment-count">
                {commentCount} comments
            </button>
        </div>
    ),
    PostActionBar: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="action-bar">{children}</div>
    ),
    PostCommentsSection: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="comments-section">{children}</div>
    ),
    CommentReactionSummary: () => null,
    getInitials: (name?: string | null) => (name ?? "U")[0].toUpperCase(),
    formatRelativeDate: () => "2h ago",
    renderPostContent: (text: string) => text,
    REACTIONS: [{ label: "Like" }, { label: "Love" }],
    getReactionEmoji: (r: string) => (r === "Love" ? "❤️" : "👍"),
    getReactionBg: () => "bg-blue-100",
    postHasMedia: () => false,
}));

jest.mock("../comment-thread", () => {
    function CommentThreadMock({ postId }: { postId: string }) {
        return <div data-testid="comment-thread" data-post-id={postId} />;
    }
    CommentThreadMock.displayName = "CommentThreadMock";
    return { __esModule: true, default: CommentThreadMock };
});

jest.mock("@/lib/utils", () => ({
    cn: (...c: (string | boolean | undefined)[]) => c.filter(Boolean).join(" "),
}));

import PostItem, { type PostData } from "../post-item";

const FIXED_ISO = "2024-01-01T00:00:00.000Z";

const currentUser = {
    id: "current-user",
    name: "Current User",
    image: null as string | null,
    gender: null as string | null,
};

function makePost(overrides: Partial<PostData> = {}): PostData {
    return {
        id: "post-1",
        content: "Hello world",
        image: null,
        video: null,
        images: [],
        videos: [],
        tags: [],
        linkUrl: null,
        linkType: null,
        commentsEnabled: true,
        createdAt: FIXED_ISO,
        user: {
            id: "post-author",
            name: "Alice",
            image: null,
            profession: "Researcher",
        },
        _count: { comments: 2, likes: 3 },
        likes: [],
        isUnread: false,
        ...overrides,
    };
}

const onLike = jest.fn().mockResolvedValue(undefined);
const onDelete = jest.fn().mockResolvedValue(undefined);
const onUpdate = jest.fn();
const onToggleCommentsEnabled = jest.fn().mockResolvedValue(undefined);
const onCommentAdded = jest.fn();
const onCommentDeleted = jest.fn();
const onShowLikers = jest.fn();
const onShare = jest.fn();
const onOpenImageModal = jest.fn();

const defaultProps = {
    post: makePost(),
    shareCount: 0,
    currentUser,
    isAdmin: false,
    onLike,
    onDelete,
    onUpdate,
    onToggleCommentsEnabled,
    onCommentAdded,
    onCommentDeleted,
    onShowLikers,
    onShare,
    onOpenImageModal,
};

function setup(overrides: Partial<typeof defaultProps> = {}) {
    const user = userEvent.setup();
    const utils = render(<PostItem {...defaultProps} {...overrides} />);
    return { user, ...utils };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockGetPostComments.mockResolvedValue([]);
});

describe("PostItem", () => {
    describe("rendering", () => {
        it("renders the post content", () => {
            setup();
            expect(screen.getByTestId("post-text")).toHaveTextContent("Hello world");
        });

        it("renders the post header with the author's name", () => {
            setup();
            expect(screen.getByTestId("post-header")).toHaveTextContent("Alice");
        });

        it("renders engagement counts", () => {
            setup();
            expect(screen.getByTestId("like-count")).toHaveTextContent("3 likes");
            expect(screen.getByTestId("comment-count")).toHaveTextContent("2 comments");
        });

        it("renders tags when present", () => {
            setup({ post: makePost({ tags: ["health", "ethics"] }) });
            expect(screen.getByTestId("post-tags")).toHaveTextContent("health,ethics");
        });

        it("renders media when the post has an image", () => {
            setup({ post: makePost({ image: "https://cdn.test/i.jpg" }) });
            expect(screen.getByTestId("post-media")).toBeInTheDocument();
        });

        it("renders the link preview when the post has a link", () => {
            setup({
                post: makePost({
                    linkUrl: "https://example.com",
                    linkType: "learn_more",
                }),
            });
            expect(screen.getByTestId("link-preview")).toBeInTheDocument();
        });

        it("hides the link preview while editing", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "post-author" },
                post: makePost({
                    linkUrl: "https://example.com",
                    linkType: "learn_more",
                }),
            });
            await user.click(screen.getByTitle("Edit post"));
            expect(screen.queryByTestId("link-preview")).not.toBeInTheDocument();
        });

        it("passes isUnread to PostCard when the post is unread", () => {
            setup({ post: makePost({ isUnread: true }) });
            expect(screen.getByTestId("post-card")).toHaveAttribute(
                "data-unread",
                "true",
            );
        });
    });

    describe("actions by non-owner", () => {
        it("does not render Edit or Delete buttons", () => {
            setup({ currentUser: { ...currentUser, id: "someone-else" } });
            expect(screen.queryByTitle("Edit post")).not.toBeInTheDocument();
            expect(screen.queryByTitle("Delete post")).not.toBeInTheDocument();
        });

        it("renders the Report button", () => {
            setup({ currentUser: { ...currentUser, id: "someone-else" } });
            expect(screen.getByTitle("Report post")).toBeInTheDocument();
        });

        it("does not render the comment toggle", () => {
            setup({ currentUser: { ...currentUser, id: "someone-else" } });
            expect(screen.queryByTitle("Disable comments")).not.toBeInTheDocument();
            expect(screen.queryByTitle("Enable comments")).not.toBeInTheDocument();
        });
    });

    describe("actions by owner", () => {
        it("renders Edit, Delete and comment-toggle buttons", () => {
            setup({ currentUser: { ...currentUser, id: "post-author" } });
            expect(screen.getByTitle("Edit post")).toBeInTheDocument();
            expect(screen.getByTitle("Delete post")).toBeInTheDocument();
            expect(screen.getByTitle("Disable comments")).toBeInTheDocument();
        });

        it("does not render the Report button for the owner", () => {
            setup({ currentUser: { ...currentUser, id: "post-author" } });
            expect(screen.queryByTitle("Report post")).not.toBeInTheDocument();
        });

        it("renders the Enable title when comments are disabled", () => {
            setup({
                currentUser: { ...currentUser, id: "post-author" },
                post: makePost({ commentsEnabled: false }),
            });
            expect(screen.getByTitle("Enable comments")).toBeInTheDocument();
            expect(screen.queryByTitle("Disable comments")).not.toBeInTheDocument();
        });
    });

    describe("admin override", () => {
        it("renders Delete for admins on other users' posts", () => {
            setup({ isAdmin: true, currentUser: { ...currentUser, id: "admin-1" } });
            expect(screen.getByTitle("Delete post")).toBeInTheDocument();
        });

        it("still does not render Edit for admins on other users' posts", () => {
            setup({ isAdmin: true, currentUser: { ...currentUser, id: "admin-1" } });
            expect(screen.queryByTitle("Edit post")).not.toBeInTheDocument();
        });

        it("does not render the comment toggle for admins on other users' posts", () => {
            setup({ isAdmin: true, currentUser: { ...currentUser, id: "admin-1" } });
            expect(screen.queryByTitle("Disable comments")).not.toBeInTheDocument();
        });
    });

    describe("like", () => {
        it("calls onLike when the ReactionsPicker fires", async () => {
            const { user } = setup();
            await user.click(screen.getByTestId("reactions-picker"));
            expect(onLike).toHaveBeenCalledWith("post-1", "Like");
        });

        it("calls onShowLikers when the like count is clicked", async () => {
            const { user } = setup();
            await user.click(screen.getByTestId("like-count"));
            expect(onShowLikers).toHaveBeenCalledWith("post-1");
        });
    });

    describe("share", () => {
        it("calls onShare when the Repost button is clicked", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /repost/i }));
            expect(onShare).toHaveBeenCalledWith(defaultProps.post);
        });

        it("does NOT call onShare when Send is clicked", async () => {
            const clipboardSpy = jest
                .spyOn(navigator.clipboard, "writeText")
                .mockResolvedValue(undefined);
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /send/i }));
            expect(onShare).not.toHaveBeenCalled();
            clipboardSpy.mockRestore();
        });

        it("copies the post link and shows a toast when Send is clicked", async () => {
            const clipboardSpy = jest
                .spyOn(navigator.clipboard, "writeText")
                .mockResolvedValue(undefined);
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /send/i }));
            await waitFor(() => {
                expect(clipboardSpy).toHaveBeenCalledWith(
                    expect.stringContaining("/feeds#post-post-1"),
                );
                expect(mockToastSuccess).toHaveBeenCalledWith(
                    "Link copied - share it anywhere!",
                );
            });
            clipboardSpy.mockRestore();
        });
    });

    describe("comments expansion", () => {
        it("loads comments lazily on the first comment-count click", async () => {
            mockGetPostComments.mockResolvedValueOnce([]);
            const { user } = setup();
            await user.click(screen.getByTestId("comment-count"));
            await waitFor(() => {
                expect(mockGetPostComments).toHaveBeenCalledWith("post-1");
            });
        });

        it("renders the CommentThread when expanded", async () => {
            mockGetPostComments.mockResolvedValueOnce([]);
            const { user } = setup();
            await user.click(screen.getByTestId("comment-count"));
            await waitFor(() => {
                expect(screen.getByTestId("comment-thread")).toBeInTheDocument();
            });
        });

        it("hides the comment section when the same count is clicked again", async () => {
            mockGetPostComments.mockResolvedValueOnce([]);
            const { user } = setup();
            await user.click(screen.getByTestId("comment-count"));
            await waitFor(() =>
                expect(screen.getByTestId("comment-thread")).toBeInTheDocument(),
            );
            await user.click(screen.getByTestId("comment-count"));
            expect(
                screen.queryByTestId("comments-section"),
            ).not.toBeInTheDocument();
        });

        it("does not reload comments when re-expanding", async () => {
            mockGetPostComments.mockResolvedValueOnce([]);
            const { user } = setup();
            await user.click(screen.getByTestId("comment-count"));
            await waitFor(() =>
                expect(mockGetPostComments).toHaveBeenCalledTimes(1),
            );
            await user.click(screen.getByTestId("comment-count"));
            await user.click(screen.getByTestId("comment-count"));
            expect(mockGetPostComments).toHaveBeenCalledTimes(1);
        });

        it("shows a Loading placeholder while comments are being fetched", async () => {
            let resolveFetch!: (v: unknown) => void;
            mockGetPostComments.mockReturnValueOnce(
                new Promise((r) => {
                    resolveFetch = r;
                }),
            );
            const { user } = setup();
            await user.click(screen.getByTestId("comment-count"));
            expect(screen.getByText(/loading comments/i)).toBeInTheDocument();
            resolveFetch([]);
            await waitFor(() => {
                expect(
                    screen.queryByText(/loading comments/i),
                ).not.toBeInTheDocument();
            });
        });

        it("shows an error toast when comments fail to load", async () => {
            mockGetPostComments.mockRejectedValueOnce(new Error("fail"));
            const { user } = setup();
            await user.click(screen.getByTestId("comment-count"));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith(
                    "Failed to load comments",
                );
            });
        });
    });

    describe("disabled comments", () => {
        it("disables the Comment action button", () => {
            setup({ post: makePost({ commentsEnabled: false }) });
            expect(
                screen.getByRole("button", { name: /^comment$/i }),
            ).toBeDisabled();
        });

        it("shows the MessageCircleOff icon", () => {
            setup({ post: makePost({ commentsEnabled: false }) });
            expect(
                screen.getByTestId("icon-MessageCircleOff"),
            ).toBeInTheDocument();
        });

        it("does not expand the comment section even after the count is clicked", async () => {
            const { user } = setup({ post: makePost({ commentsEnabled: false }) });
            await user.click(screen.getByTestId("comment-count"));
            expect(
                screen.queryByTestId("comments-section"),
            ).not.toBeInTheDocument();
        });
    });

    describe("editing", () => {
        it("opens the inline editor with the current content", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "post-author" },
            });
            await user.click(screen.getByTitle("Edit post"));
            expect(screen.getByDisplayValue("Hello world")).toBeInTheDocument();
        });

        it("calls onUpdate and shows a toast when Save is clicked", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "post-author" },
            });
            await user.click(screen.getByTitle("Edit post"));
            const editInput = screen.getByDisplayValue("Hello world");
            await user.clear(editInput);
            await user.type(editInput, "New content");
            await user.click(screen.getByRole("button", { name: /^save$/i }));
            await waitFor(() => {
                expect(onUpdate).toHaveBeenCalledWith(
                    "post-1",
                    expect.objectContaining({ content: "New content" }),
                );
                expect(mockToastSuccess).toHaveBeenCalledWith("Post updated");
            });
        });

        it("cancels editing without calling onUpdate", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "post-author" },
            });
            await user.click(screen.getByTitle("Edit post"));
            await user.click(screen.getByRole("button", { name: /cancel/i }));
            expect(onUpdate).not.toHaveBeenCalled();
            expect(
                screen.queryByDisplayValue("Hello world"),
            ).not.toBeInTheDocument();
        });

        it("shows the image upload control when Image is clicked in edit mode", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "post-author" },
            });
            await user.click(screen.getByTitle("Edit post"));
            await user.click(screen.getByRole("button", { name: /image/i }));
            expect(
                screen.getByRole("button", { name: /upload image/i }),
            ).toBeInTheDocument();
        });

        it("shows the link input when Link is clicked in edit mode", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "post-author" },
            });
            await user.click(screen.getByTitle("Edit post"));
            await user.click(screen.getByRole("button", { name: /link/i }));
            expect(screen.getByPlaceholderText(/enter url/i)).toBeInTheDocument();
        });

        it("adds a tag when pressing Enter in the tag input", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "post-author" },
            });
            await user.click(screen.getByTitle("Edit post"));
            const tagInput = screen.getByPlaceholderText(/add tag/i);
            await user.type(tagInput, "newtag{Enter}");
            await user.click(screen.getByRole("button", { name: /^save$/i }));
            await waitFor(() => {
                expect(onUpdate).toHaveBeenCalledWith(
                    "post-1",
                    expect.objectContaining({ tags: ["newtag"] }),
                );
            });
        });
    });

    describe("delete", () => {
        it("calls onDelete when the trash button is clicked", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "post-author" },
            });
            await user.click(screen.getByTitle("Delete post"));
            expect(onDelete).toHaveBeenCalledWith("post-1");
        });

        it("calls onDelete when an admin clicks the trash button", async () => {
            const { user } = setup({
                isAdmin: true,
                currentUser: { ...currentUser, id: "admin-1" },
            });
            await user.click(screen.getByTitle("Delete post"));
            expect(onDelete).toHaveBeenCalledWith("post-1");
        });
    });

    describe("toggle comments", () => {
        it("calls onToggleCommentsEnabled when the toggle is clicked", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "post-author" },
            });
            await user.click(screen.getByTitle("Disable comments"));
            expect(onToggleCommentsEnabled).toHaveBeenCalledWith("post-1");
        });

        it("shows the Enable title when comments are disabled", () => {
            setup({
                currentUser: { ...currentUser, id: "post-author" },
                post: makePost({ commentsEnabled: false }),
            });
            expect(screen.getByTitle("Enable comments")).toBeInTheDocument();
        });
    });

    describe("image modal", () => {
        it("calls onOpenImageModal with the post and index", async () => {
            // Compare against the same post instance that was rendered, not
            // against `defaultProps.post` (whose `image` is null).
            const postWithImage = makePost({ image: "https://cdn.test/i.jpg" });
            const { user } = setup({ post: postWithImage });
            await user.click(screen.getByTestId("open-image-modal"));
            expect(onOpenImageModal).toHaveBeenCalledWith(postWithImage, 0);
        });
    });

    describe("report post", () => {
        it("opens the report dialog when the flag button is clicked", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "someone-else" },
            });
            await user.click(screen.getByTitle("Report post"));
            expect(
                screen.getByRole("heading", { name: /report post/i }),
            ).toBeInTheDocument();
        });

        it("submits the report and shows a success toast", async () => {
            mockCreateReport.mockResolvedValueOnce(undefined);
            const { user } = setup({
                currentUser: { ...currentUser, id: "someone-else" },
            });
            await user.click(screen.getByTitle("Report post"));
            await user.click(screen.getByTestId("select-wrapper"));
            await user.click(screen.getByRole("button", { name: /submit report/i }));
            await waitFor(() => {
                expect(mockCreateReport).toHaveBeenCalledWith(
                    expect.objectContaining({
                        contentType: "POST",
                        contentId: "post-1",
                    }),
                );
                expect(mockToastSuccess).toHaveBeenCalledWith(
                    "Report submitted successfully",
                );
            });
        });

        it("shows an error toast when the report fails", async () => {
            mockCreateReport.mockRejectedValueOnce(new Error("fail"));
            const { user } = setup({
                currentUser: { ...currentUser, id: "someone-else" },
            });
            await user.click(screen.getByTitle("Report post"));
            await user.click(screen.getByTestId("select-wrapper"));
            await user.click(screen.getByRole("button", { name: /submit report/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith(
                    "Failed to submit report",
                );
            });
        });

        it("cancels the report dialog", async () => {
            const { user } = setup({
                currentUser: { ...currentUser, id: "someone-else" },
            });
            await user.click(screen.getByTitle("Report post"));
            await user.click(screen.getByRole("button", { name: /cancel/i }));
            expect(
                screen.queryByRole("heading", { name: /report post/i }),
            ).not.toBeInTheDocument();
        });
    });
});