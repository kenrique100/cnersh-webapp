import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import PublicFeedClient from "@/components/public-feed-client";

jest.mock("next/image", () => {
    function NextImage({ src, alt }: { src: string; alt: string }) {
        return <img src={src} alt={alt} />;
    }
    NextImage.displayName = "NextImage";
    return NextImage;
});

jest.mock("next/link", () => {
    function NextLink({ children, href }: { children: React.ReactNode; href: string }) {
        return <a href={href}>{children}</a>;
    }
    NextLink.displayName = "NextLink";
    return NextLink;
});

jest.mock("@/components/ui/card", () => ({
    Card: function Card({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
        return <div data-testid="card" {...props}>{children}</div>;
    },
    CardContent: function CardContent({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
        return <div data-testid="card-content" {...props}>{children}</div>;
    },
}));

jest.mock("@/components/ui/avatar", () => ({
    Avatar: function Avatar({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
        return <div data-testid="avatar" {...props}>{children}</div>;
    },
    AvatarImage: function AvatarImage({ src, alt }: { src?: string; alt?: string }) {
        return src ? <img src={src} alt={alt} data-testid="avatar-image" /> : null;
    },
    AvatarFallback: function AvatarFallback({ children }: { children: React.ReactNode }) {
        return <span data-testid="avatar-fallback">{children}</span>;
    },
}));

jest.mock("@/components/ui/button", () => ({
    Button: function Button({
                                children,
                                ...props
                            }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) {
        return <button {...props}>{children}</button>;
    },
}));

jest.mock("@/components/ui/dialog", () => ({
    Dialog: function Dialog({
                                children,
                                open,
                            }: {
        children: React.ReactNode;
        open: boolean;
        onOpenChange?: (open: boolean) => void;
    }) {
        return open ? <div data-testid="dialog">{children}</div> : null;
    },
    DialogContent: function DialogContent({ children }: { children: React.ReactNode }) {
        return <div data-testid="dialog-content">{children}</div>;
    },
}));

jest.mock("lucide-react", () => ({
    MessageCircleIcon: function MessageCircleIcon() { return <span data-testid="icon-message-circle" />; },
    ThumbsUpIcon: function ThumbsUpIcon() { return <span data-testid="icon-thumbs-up" />; },
    ShareIcon: function ShareIcon() { return <span data-testid="icon-share" />; },
    LockIcon: function LockIcon() { return <span data-testid="icon-lock" />; },
    ChevronLeftIcon: function ChevronLeftIcon() { return <span data-testid="icon-chevron-left" />; },
    ChevronRightIcon: function ChevronRightIcon() { return <span data-testid="icon-chevron-right" />; },
    ExternalLinkIcon: function ExternalLinkIcon() { return <span data-testid="icon-external-link" />; },
    GlobeIcon: function GlobeIcon() { return <span data-testid="icon-globe" />; },
}));

jest.mock("@/components/reaction-icons", () => ({
    ReactionIcon: function ReactionIcon({ type }: { type: string; size?: number }) {
        return <span data-testid={`reaction-icon-${type}`} />;
    },
    REACTION_ICONS: {
        Like: true, Celebrate: true, Support: true,
        Love: true, Insightful: true, Funny: true, Wow: true,
    },
}));

jest.mock("@/components/post-card", () => ({
    PostCard: function PostCard({ children }: { children: React.ReactNode }) {
        return <div data-testid="post-card">{children}</div>;
    },
    PostHeader: function PostHeader({ userName }: { userName: string | null; userImage: string | null; createdAt: Date }) {
        return <div data-testid="post-header"><span data-testid="post-header-name">{userName}</span></div>;
    },
    PostTextContent: function PostTextContent({ content }: { content: string }) {
        return <div data-testid="post-text-content">{content}</div>;
    },
    PostTags: function PostTags({ tags }: { tags: string[] }) {
        return <div data-testid="post-tags">{tags.map((t, i) => <span key={i}>{t}</span>)}</div>;
    },
    PostMediaContent: function PostMediaContent({
                                                    image, images, onImageClick,
                                                }: {
        image?: string | null; images?: string[]; video?: string | null; videos?: string[];
        onImageClick?: (idx: number) => void;
    }) {
        return (
            <div data-testid="post-media-content">
                {image && (
                    <button onClick={() => onImageClick?.(0)} data-testid="media-image-btn">
                        <img src={image} alt="media" />
                    </button>
                )}
                {images?.map((img, i) => (
                    <button key={i} onClick={() => onImageClick?.(i)} data-testid={`media-image-btn-${i}`}>
                        <img src={img} alt={`media-${i}`} />
                    </button>
                ))}
            </div>
        );
    },
    PostEngagementSummary: function PostEngagementSummary({
                                                              likeCount, commentCount, reactionTypes,
                                                          }: { likeCount: number; commentCount: number; reactionTypes?: string[] }) {
        return (
            <div data-testid="post-engagement-summary">
                <span data-testid="like-count">{likeCount}</span>
                <span data-testid="comment-count">{commentCount}</span>
                {reactionTypes?.map((r, i) => <span key={i} data-testid={`reaction-${i}`}>{r}</span>)}
            </div>
        );
    },
    PostActionBar: function PostActionBar({ children }: { children: React.ReactNode }) {
        return <div data-testid="post-action-bar">{children}</div>;
    },
    getInitials: (name: string | null | undefined) => {
        if (!name) return "U";
        return name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    },
    formatRelativeDate: (date: Date) => new Date(date).toISOString(),
    renderPostContent: (content: string) => content,
    postHasMedia: (post: { image?: string | null; images?: string[]; video?: string | null; videos?: string[] }) =>
        !!(post.image || post.images?.length || post.video || post.videos?.length),
}));

jest.mock("@/components/link-preview-card", () => {
    function LinkPreviewCard({ url }: { url: string; linkType?: string | null; hasMedia?: boolean }) {
        return <div data-testid="link-preview-card">{url}</div>;
    }
    LinkPreviewCard.displayName = "LinkPreviewCard";
    return LinkPreviewCard;
});

const basePost = {
    id: "post-1",
    content: "Hello world",
    image: null as string | null,
    video: null as string | null,
    images: [] as string[],
    videos: [] as string[],
    tags: [] as string[],
    linkUrl: null as string | null,
    linkType: null as string | null,
    createdAt: new Date("2024-01-15T10:00:00Z"),
    user: { id: "user-1", name: "Alice Smith", image: null as string | null },
    _count: { comments: 2, likes: 5 },
    likes: [{ reactionType: "Like" }],
};

const postWithMultipleImages = {
    ...basePost,
    id: "post-5",
    image: null as string | null,
    images: [
        "https://example.com/img1.jpg",
        "https://example.com/img2.jpg",
        "https://example.com/img3.jpg",
    ],
};

const openModal = async (testId = "media-image-btn") => {
    await act(async () => {
        fireEvent.click(screen.getByTestId(testId));
    });
};

describe("PublicFeedClient", () => {
    beforeEach(() => jest.clearAllMocks());

    describe("empty state", () => {
        it("renders empty state when posts array is empty", () => {
            render(<PublicFeedClient posts={[]} />);
            expect(screen.getByText("No posts yet. Check back later!")).toBeInTheDocument();
        });

        it("does not render post cards when empty", () => {
            render(<PublicFeedClient posts={[]} />);
            expect(screen.queryByTestId("post-card")).not.toBeInTheDocument();
        });
    });

    describe("post list", () => {
        it("renders one PostCard per post", () => {
            render(<PublicFeedClient posts={[basePost, { ...basePost, id: "post-2" }]} />);
            expect(screen.getAllByTestId("post-card")).toHaveLength(2);
        });

        it("renders PostHeader for each post", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            expect(screen.getByTestId("post-header")).toBeInTheDocument();
        });

        it("renders PostTextContent when post has content", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            expect(screen.getByTestId("post-text-content")).toBeInTheDocument();
        });

        it("does not render PostTextContent when content is empty", () => {
            render(<PublicFeedClient posts={[{ ...basePost, content: "" }]} />);
            expect(screen.queryByTestId("post-text-content")).not.toBeInTheDocument();
        });

        it("renders PostTags for each post", () => {
            render(<PublicFeedClient posts={[{ ...basePost, tags: ["health"] }]} />);
            expect(screen.getByTestId("post-tags")).toBeInTheDocument();
        });

        it("renders PostEngagementSummary for each post", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            expect(screen.getByTestId("post-engagement-summary")).toBeInTheDocument();
        });

        it("passes correct like and comment counts to PostEngagementSummary", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            expect(screen.getByTestId("like-count").textContent).toBe("5");
            expect(screen.getByTestId("comment-count").textContent).toBe("2");
        });

        it("passes reactionTypes from post.likes", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            expect(screen.getByTestId("reaction-0").textContent).toBe("Like");
        });

        it("handles empty likes array", () => {
            render(<PublicFeedClient posts={[{ ...basePost, likes: [] }]} />);
            expect(screen.getByTestId("post-engagement-summary")).toBeInTheDocument();
        });

        it("renders PostActionBar with sign-in links", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            expect(screen.getByTestId("post-action-bar")).toBeInTheDocument();
            const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
            expect(hrefs.filter((h) => h === "/sign-in").length).toBeGreaterThanOrEqual(3);
        });

        it("renders sign-in CTA card after the post list", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            expect(screen.getByText("Sign in to interact with the community")).toBeInTheDocument();
        });

        it("renders posts in order", () => {
            const posts = [
                { ...basePost, id: "a", content: "First" },
                { ...basePost, id: "b", content: "Second" },
            ];
            render(<PublicFeedClient posts={posts} />);
            const nodes = screen.getAllByTestId("post-text-content");
            expect(nodes[0]).toHaveTextContent("First");
            expect(nodes[1]).toHaveTextContent("Second");
        });
    });

    describe("media rendering", () => {
        it("renders PostMediaContent when post has image", () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            expect(screen.getByTestId("post-media-content")).toBeInTheDocument();
        });

        it("renders PostMediaContent when post has images array", () => {
            render(<PublicFeedClient posts={[{ ...basePost, images: ["https://example.com/a.jpg"] }]} />);
            expect(screen.getByTestId("post-media-content")).toBeInTheDocument();
        });

        it("renders PostMediaContent when post has video", () => {
            render(<PublicFeedClient posts={[{ ...basePost, video: "https://example.com/v.mp4" }]} />);
            expect(screen.getByTestId("post-media-content")).toBeInTheDocument();
        });

        it("renders PostMediaContent when post has videos array", () => {
            render(<PublicFeedClient posts={[{ ...basePost, videos: ["https://example.com/v.mp4"] }]} />);
            expect(screen.getByTestId("post-media-content")).toBeInTheDocument();
        });

        it("does not render PostMediaContent when post has no media", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            expect(screen.queryByTestId("post-media-content")).not.toBeInTheDocument();
        });
    });

    describe("link preview", () => {
        it("renders LinkPreviewCard when post has linkUrl", () => {
            render(<PublicFeedClient posts={[{ ...basePost, linkUrl: "https://example.com", linkType: "visit_website" }]} />);
            expect(screen.getByTestId("link-preview-card")).toBeInTheDocument();
        });

        it("does not render LinkPreviewCard when no linkUrl", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            expect(screen.queryByTestId("link-preview-card")).not.toBeInTheDocument();
        });
    });

    describe("image modal", () => {
        it("is closed by default", () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
        });

        it("opens when PostMediaContent image is clicked", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            await openModal();
            expect(screen.getByTestId("dialog")).toBeInTheDocument();
        });

        it("shows the correct image in modal", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            await openModal();
            expect(screen.getByAltText("Post attachment")).toHaveAttribute("src", "https://example.com/photo.jpg");
        });

        it("displays post author name in modal sidebar", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            await openModal();
            const names = screen.getAllByText("Alice Smith");
            expect(names.length).toBeGreaterThan(0);
        });

        it("displays post content in modal sidebar", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            await openModal();
            const instances = screen.getAllByText("Hello world");
            expect(instances.length).toBeGreaterThan(0);
        });

        it("shows tags in modal sidebar", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg", tags: ["ai", "health"] }]} />);
            await openModal();
            expect(screen.getByText("#ai")).toBeInTheDocument();
            expect(screen.getByText("#health")).toBeInTheDocument();
        });

        it("shows link preview in modal sidebar when post has linkUrl", async () => {
            const post = { ...basePost, image: "https://example.com/photo.jpg", linkUrl: "https://example.com", linkType: "visit_website" };
            render(<PublicFeedClient posts={[post]} />);
            await openModal();
            expect(screen.getAllByTestId("link-preview-card")).toHaveLength(2);
        });

        it("shows likes count when likeCount > 0", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            await openModal();
            expect(screen.getByText(/5 likes/)).toBeInTheDocument();
        });

        it("shows comment count when commentCount > 0", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            await openModal();
            expect(screen.getByText(/2 comment/)).toBeInTheDocument();
        });

        it("does not show like count section when likeCount is 0", async () => {
            const post = { ...basePost, image: "https://example.com/photo.jpg", _count: { comments: 0, likes: 0 } };
            render(<PublicFeedClient posts={[post]} />);
            await openModal();
            expect(screen.queryByText(/likes/)).not.toBeInTheDocument();
        });

        it("shows singular 'like' when likeCount is 1", async () => {
            const post = { ...basePost, image: "https://example.com/photo.jpg", _count: { comments: 0, likes: 1 } };
            render(<PublicFeedClient posts={[post]} />);
            await openModal();
            expect(screen.getByText(/1 like/)).toBeInTheDocument();
        });

        it("shows singular 'comment' when commentCount is 1", async () => {
            const post = { ...basePost, image: "https://example.com/photo.jpg", _count: { comments: 1, likes: 0 } };
            render(<PublicFeedClient posts={[post]} />);
            await openModal();
            expect(screen.getByText(/1 comment/)).toBeInTheDocument();
        });

        it("shows 'Anonymous' when user has no name", async () => {
            const post = { ...basePost, image: "https://example.com/photo.jpg", user: { id: "u1", name: null, image: null } };
            render(<PublicFeedClient posts={[post]} />);
            await openModal();
            expect(screen.getByText("Anonymous")).toBeInTheDocument();
        });

        it("shows navigation arrows when post has multiple images", async () => {
            render(<PublicFeedClient posts={[postWithMultipleImages]} />);
            await openModal("media-image-btn-0");
            expect(screen.getByTestId("icon-chevron-left")).toBeInTheDocument();
            expect(screen.getByTestId("icon-chevron-right")).toBeInTheDocument();
        });

        it("does not show navigation arrows for a single image", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            await openModal();
            expect(screen.queryByTestId("icon-chevron-left")).not.toBeInTheDocument();
        });

        it("shows image counter for multiple images", async () => {
            render(<PublicFeedClient posts={[postWithMultipleImages]} />);
            await openModal("media-image-btn-0");
            expect(screen.getByText("1 / 3")).toBeInTheDocument();
        });

        it("navigates to next image on right arrow click", async () => {
            render(<PublicFeedClient posts={[postWithMultipleImages]} />);
            await openModal("media-image-btn-0");
            const right = screen.getByTestId("icon-chevron-right").closest("button")!;
            await act(async () => { fireEvent.click(right); });
            expect(screen.getByText("2 / 3")).toBeInTheDocument();
        });

        it("navigates to previous image on left arrow click", async () => {
            render(<PublicFeedClient posts={[postWithMultipleImages]} />);
            await openModal("media-image-btn-0");
            const right = screen.getByTestId("icon-chevron-right").closest("button")!;
            await act(async () => { fireEvent.click(right); });
            const left = screen.getByTestId("icon-chevron-left").closest("button")!;
            await act(async () => { fireEvent.click(left); });
            expect(screen.getByText("1 / 3")).toBeInTheDocument();
        });

        it("wraps to last image when navigating left from first", async () => {
            render(<PublicFeedClient posts={[postWithMultipleImages]} />);
            await openModal("media-image-btn-0");
            const left = screen.getByTestId("icon-chevron-left").closest("button")!;
            await act(async () => { fireEvent.click(left); });
            expect(screen.getByText("3 / 3")).toBeInTheDocument();
        });

        it("wraps to first image when navigating right from last", async () => {
            render(<PublicFeedClient posts={[postWithMultipleImages]} />);
            await openModal("media-image-btn-0");
            const right = screen.getByTestId("icon-chevron-right").closest("button")!;
            await act(async () => { fireEvent.click(right); });
            await act(async () => { fireEvent.click(right); });
            await act(async () => { fireEvent.click(right); });
            expect(screen.getByText("1 / 3")).toBeInTheDocument();
        });

        it("opens at correct index when second image is clicked", async () => {
            render(<PublicFeedClient posts={[postWithMultipleImages]} />);
            await openModal("media-image-btn-1");
            expect(screen.getByText("2 / 3")).toBeInTheDocument();
        });

        it("shows avatar image when user has one", async () => {
            const post = { ...basePost, image: "https://example.com/photo.jpg", user: { id: "u1", name: "Bob", image: "https://example.com/avatar.jpg" } };
            render(<PublicFeedClient posts={[post]} />);
            await openModal();
            const avatarImages = screen.getAllByTestId("avatar-image");
            expect(avatarImages.some((img) => img.getAttribute("src") === "https://example.com/avatar.jpg")).toBe(true);
        });

        it("shows user initials fallback when user has no image", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            await openModal();
            const fallbacks = screen.getAllByTestId("avatar-fallback");
            expect(fallbacks.some((f) => f.textContent === "AS")).toBe(true);
        });

        it("combines post.image and post.images for modal", async () => {
            const post = { ...basePost, image: "https://example.com/main.jpg", images: ["https://example.com/extra.jpg"] };
            render(<PublicFeedClient posts={[post]} />);
            await openModal();
            expect(screen.getByText("1 / 2")).toBeInTheDocument();
        });

        it("modal without content does not show content section", async () => {
            const post = { ...basePost, content: "", image: "https://example.com/photo.jpg" };
            render(<PublicFeedClient posts={[post]} />);
            await openModal();
            expect(screen.getByTestId("dialog")).toBeInTheDocument();
            expect(screen.queryByTestId("post-text-content")).not.toBeInTheDocument();
        });

        it("does not show tag section in modal when post has no tags", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg", tags: [] }]} />);
            await openModal();
            expect(screen.queryByText(/#\w/)).not.toBeInTheDocument();
        });

        it("navigating to index 1 shows the second image src", async () => {
            const post = { ...basePost, image: "https://example.com/first.jpg", images: ["https://example.com/second.jpg"] };
            render(<PublicFeedClient posts={[post]} />);
            await openModal();
            const right = screen.getByTestId("icon-chevron-right").closest("button")!;
            await act(async () => { fireEvent.click(right); });
            expect(screen.getByAltText("Post attachment")).toHaveAttribute("src", "https://example.com/second.jpg");
        });
    });

    describe("sign-in CTA", () => {
        it("shows lock icon", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            expect(screen.getByTestId("icon-lock")).toBeInTheDocument();
        });

        it("Sign In link points to /sign-in", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            const link = screen.getAllByRole("link").find((l) => l.textContent?.trim() === "Sign In");
            expect(link).toHaveAttribute("href", "/sign-in");
        });

        it("Sign Up link points to /sign-up", () => {
            render(<PublicFeedClient posts={[basePost]} />);
            const link = screen.getAllByRole("link").find((l) => l.textContent?.trim() === "Sign Up");
            expect(link).toHaveAttribute("href", "/sign-up");
        });
    });

    describe("edge cases", () => {
        it("handles post with all optional fields null/empty", () => {
            const post = { ...basePost, image: null, video: null, images: [], videos: [], tags: [], linkUrl: null, likes: [], _count: { comments: 0, likes: 0 } };
            expect(() => render(<PublicFeedClient posts={[post]} />)).not.toThrow();
        });

        it("opens correct post modal when multiple posts have media", async () => {
            const posts = [
                { ...basePost, id: "a", image: null as string | null },
                { ...basePost, id: "b", image: "https://example.com/second.jpg", images: ["https://example.com/extra.jpg"] },
            ];
            render(<PublicFeedClient posts={posts} />);
            await openModal();
            expect(screen.getByText("1 / 2")).toBeInTheDocument();
        });

        it("renders dialog-content inside dialog", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            await openModal();
            expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
        });

        it("shows Community Member label in modal sidebar", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            await openModal();
            expect(screen.getByText("Community Member")).toBeInTheDocument();
        });

        it("modal becomes visible after state update", async () => {
            render(<PublicFeedClient posts={[{ ...basePost, image: "https://example.com/photo.jpg" }]} />);
            fireEvent.click(screen.getByTestId("media-image-btn"));
            await waitFor(() => {
                expect(screen.getByTestId("dialog")).toBeInTheDocument();
            });
        });
    });
});