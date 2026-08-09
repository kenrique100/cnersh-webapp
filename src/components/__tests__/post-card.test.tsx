// src/components/__tests__/post-card.test.tsx
import React from "react";
import { render, screen, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
    getInitials,
    formatRelativeDate,
    formatFullDate,
    renderPostContent,
    postHasMedia,
    PostCard,
    PostHeader,
    PostTextContent,
    PostTags,
    PostEngagementSummary,
    CommentReactionSummary,
    REACTIONS,
    getReactionColor,
} from "../post-card";
import { REACTION_COLORS } from "../reaction-icons";

describe("Utility Functions", () => {
    afterEach(async () => {
        cleanup();
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    });

    describe("getInitials", () => {
        it("returns initials from full name", () => {
            expect(getInitials("John Doe")).toBe("JD");
        });

        it("handles single name", () => {
            expect(getInitials("John")).toBe("J");
        });

        it("handles three names", () => {
            expect(getInitials("John Middle Doe")).toBe("JM");
        });

        it("handles null", () => {
            expect(getInitials(null)).toBe("U");
        });

        it("handles undefined", () => {
            expect(getInitials(undefined)).toBe("U");
        });

        it("handles empty string", () => {
            expect(getInitials("")).toBe("U");
        });

        it("handles extra spaces", () => {
            expect(getInitials("  John   Doe  ")).toBe("JD");
        });

        it("converts to uppercase", () => {
            expect(getInitials("john doe")).toBe("JD");
        });
    });

    describe("formatRelativeDate", () => {
        const now = new Date();

        it("returns 'Just now' for recent dates", () => {
            const recent = new Date(now.getTime() - 30000);
            expect(formatRelativeDate(recent)).toBe("Just now");
        });

        it("returns minutes for dates within an hour", () => {
            const mins = new Date(now.getTime() - 5 * 60000);
            expect(formatRelativeDate(mins)).toBe("5m ago");
        });

        it("returns hours for dates within a day", () => {
            const hours = new Date(now.getTime() - 3 * 3600000);
            expect(formatRelativeDate(hours)).toBe("3h ago");
        });

        it("returns days for dates within a week", () => {
            const days = new Date(now.getTime() - 2 * 86400000);
            expect(formatRelativeDate(days)).toBe("2d ago");
        });

        it("returns formatted date for older dates", () => {
            const old = new Date(now.getTime() - 10 * 86400000);
            const result = formatRelativeDate(old);
            expect(result).toMatch(/[A-Za-z]{3}\s+\d{1,2}/);
        });
    });

    describe("formatFullDate", () => {
        it("formats date with time", () => {
            const date = new Date("2024-03-15T14:30:00");
            const result = formatFullDate(date);
            expect(result).toMatch(/Mar 15, 2024/);
            expect(result).toMatch(/\d{1,2}:\d{2}\s*[AP]M/i);
        });
    });

    describe("postHasMedia", () => {
        it("returns true for single image", () => {
            expect(postHasMedia({ image: "http://example.com/image.jpg" })).toBe(true);
        });

        it("returns true for multiple images", () => {
            expect(postHasMedia({ images: ["img1.jpg", "img2.jpg"] })).toBe(true);
        });

        it("returns true for single video", () => {
            expect(postHasMedia({ video: "http://example.com/video.mp4" })).toBe(true);
        });

        it("returns true for multiple videos", () => {
            expect(postHasMedia({ videos: ["vid1.mp4", "vid2.mp4"] })).toBe(true);
        });

        it("returns false for no media", () => {
            expect(postHasMedia({})).toBe(false);
        });

        it("returns false for null media", () => {
            expect(postHasMedia({ image: null, video: null })).toBe(false);
        });

        it("returns false for empty arrays", () => {
            expect(postHasMedia({ images: [], videos: [] })).toBe(false);
        });
    });

    describe("renderPostContent", () => {
        // renderPostContent returns an array of React nodes,
        // so we render them and check the rendered output.
        it("renders plain text", () => {
            const result = renderPostContent("Hello world");
            const { container } = render(<div>{result}</div>);
            expect(container.textContent).toBe("Hello world");
        });

        it("renders links as clickable", () => {
            const result = renderPostContent("Check https://example.com");
            render(<div>{result}</div>);
            const link = screen.getByText("https://example.com");
            expect(link.tagName).toBe("A");
            expect(link).toHaveAttribute("href", "https://example.com");
        });

        it("renders @mentions with styling", () => {
            const result = renderPostContent("Hello @john");
            render(<div>{result}</div>);
            const mention = screen.getByText("@john");
            expect(mention).toHaveClass("text-blue-600");
        });

        it("renders #hashtags with styling", () => {
            const result = renderPostContent("Great #coding");
            render(<div>{result}</div>);
            const hashtag = screen.getByText("#coding");
            expect(hashtag).toHaveClass("text-blue-600");
        });
    });
});

describe("PostCard Components", () => {
    afterEach(async () => {
        cleanup();
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    });

    describe("PostCard", () => {
        it("renders children", () => {
            render(
                <PostCard>
                    <div>Test Content</div>
                </PostCard>
            );
            expect(screen.getByText("Test Content")).toBeInTheDocument();
        });

        it("has proper card styling", () => {
            const { container } = render(<PostCard>Content</PostCard>);
            const card = container.firstChild;
            expect(card).toHaveClass("rounded-xl");
            expect(card).toHaveClass("shadow-sm");
        });
    });

    describe("PostHeader", () => {
        const defaultProps = {
            userName: "John Doe",
            userImage: "https://example.com/avatar.jpg",
            createdAt: new Date("2024-03-15T14:30:00"),
        };

        it("renders user name", () => {
            render(<PostHeader {...defaultProps} />);
            expect(screen.getByText("John Doe")).toBeInTheDocument();
        });

        it("renders default name for null", () => {
            render(<PostHeader {...defaultProps} userName={null} />);
            expect(screen.getByText("Anonymous")).toBeInTheDocument();
        });

        it("renders profession", () => {
            render(<PostHeader {...defaultProps} userProfession="Developer" />);
            expect(screen.getByText("Developer")).toBeInTheDocument();
        });

        it("renders default profession", () => {
            render(<PostHeader {...defaultProps} />);
            expect(screen.getByText("Community Member")).toBeInTheDocument();
        });

        it("renders action buttons", () => {
            render(
                <PostHeader
                    {...defaultProps}
                    actions={<button>Delete</button>}
                />
            );
            expect(screen.getByText("Delete")).toBeInTheDocument();
        });
    });

    describe("PostTextContent", () => {
        it("renders short content", () => {
            render(<PostTextContent content="Short post" />);
            expect(screen.getByText("Short post")).toBeInTheDocument();
        });

        it("shows 'See more' for long content", () => {
            const longContent = "a".repeat(400);
            render(<PostTextContent content={longContent} />);
            expect(screen.getByText("See more")).toBeInTheDocument();
        });

        it("expands long content on 'See more' click", async () => {
            const user = userEvent.setup();
            const longContent = "a".repeat(400);
            render(<PostTextContent content={longContent} />);

            const seeMore = screen.getByText("See more");
            await user.click(seeMore);
            expect(screen.getByText("See less")).toBeInTheDocument();
        });

        it("collapses on 'See less' click", async () => {
            const user = userEvent.setup();
            const longContent = "a".repeat(400);
            render(<PostTextContent content={longContent} />);

            await user.click(screen.getByText("See more"));
            await user.click(screen.getByText("See less"));
            expect(screen.getByText("See more")).toBeInTheDocument();
        });

        it("renders custom content", () => {
            render(
                <PostTextContent
                    content="Original"
                    customRender={<div>Custom</div>}
                />
            );
            expect(screen.getByText("Custom")).toBeInTheDocument();
            expect(screen.queryByText("Original")).not.toBeInTheDocument();
        });
    });

    describe("PostTags", () => {
        it("renders tags", () => {
            render(<PostTags tags={["coding", "react"]} />);
            expect(screen.getByText("#coding")).toBeInTheDocument();
            expect(screen.getByText("#react")).toBeInTheDocument();
        });

        it("renders nothing for empty tags", () => {
            const { container } = render(<PostTags tags={[]} />);
            expect(container.firstChild).toBeNull();
        });
    });

    describe("PostEngagementSummary", () => {
        const defaultProps = {
            likeCount: 5,
            commentCount: 3,
        };

        it("renders like count", () => {
            render(<PostEngagementSummary {...defaultProps} />);
            expect(screen.getByText("5")).toBeInTheDocument();
        });

        it("renders comment count", () => {
            render(<PostEngagementSummary {...defaultProps} />);
            expect(screen.getByText(/3 comments?/)).toBeInTheDocument();
        });

        it("handles singular comment", () => {
            render(<PostEngagementSummary likeCount={0} commentCount={1} />);
            expect(screen.getByText("1 comment")).toBeInTheDocument();
        });

        it("renders nothing for zero engagement", () => {
            const { container } = render(
                <PostEngagementSummary likeCount={0} commentCount={0} />
            );
            expect(container.firstChild).toBeNull();
        });

        it("calls onLikeCountClick when like count is clicked", async () => {
            const user = userEvent.setup();
            const mockClick = jest.fn();
            render(
                <PostEngagementSummary
                    {...defaultProps}
                    onLikeCountClick={mockClick}
                />
            );
            const likeButton = screen.getByLabelText(/reactions?/);
            await user.click(likeButton);
            expect(mockClick).toHaveBeenCalled();
        });

        it("renders first reactor name", () => {
            render(
                <PostEngagementSummary
                    {...defaultProps}
                    reactionUsers={[
                        { userId: "1", reactionType: "Like", userName: "Alice" },
                    ]}
                />
            );
            expect(screen.getByText("Alice")).toBeInTheDocument();
        });
    });

    describe("CommentReactionSummary", () => {
        it("renders reaction count", () => {
            render(
                <CommentReactionSummary reactionTypes={["Like", "Love"]} count={2} />
            );
            expect(screen.getByText("2")).toBeInTheDocument();
        });

        it("renders nothing for zero count", () => {
            const { container } = render(
                <CommentReactionSummary reactionTypes={[]} count={0} />
            );
            expect(container.firstChild).toBeNull();
        });
    });
});

describe("REACTIONS constant", () => {
    it("contains all 6 reaction types from REACTION_ORDER", () => {
        expect(REACTIONS).toHaveLength(6);
        expect(REACTIONS.map((r) => r.label)).toEqual([
            "Like",
            "Celebrate",
            "Support",
            "Love",
            "Insightful",
            "Funny",
        ]);
    });

    it("each reaction has a valid color", () => {
        REACTIONS.forEach((r) => {
            expect(r.color).toBe(REACTION_COLORS[r.label]);
        });
    });
});

describe("getReactionColor", () => {
    it("returns correct color for Like", () => {
        expect(getReactionColor("Like")).toBe(REACTION_COLORS.Like);
    });

    it("returns default color for unknown reaction", () => {
        expect(getReactionColor("Unknown")).toBe(REACTION_COLORS.Like);
    });
});