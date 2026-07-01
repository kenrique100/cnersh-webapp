import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeedRightSidebar from "@/components/feed-right-sidebar";

// ── fetch mock ────────────────────────────────────────────────────
const mockFetch = jest.fn();
(global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

jest.mock("@/components/ui/card", () => ({
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));
jest.mock("@/components/project-tracker", () => {
    function ProjectTrackerMock() {
        return <div data-testid="project-tracker" />;
    }
    ProjectTrackerMock.displayName = "ProjectTrackerMock";
    return ProjectTrackerMock;
});
jest.mock("@/components/sidebar-footer", () => {
    function SidebarFooterMock() {
        return <div data-testid="sidebar-footer" />;
    }
    SidebarFooterMock.displayName = "SidebarFooterMock";
    return SidebarFooterMock;
});
jest.mock("@/lib/utils", () => ({
    cn: (...c: (string | boolean | undefined)[]) => c.filter(Boolean).join(" "),
}));
jest.mock("lucide-react", () => {
    const icon = (name: string) => {
        function Icon() {
            return <span data-testid={`icon-${name}`} />;
        }
        Icon.displayName = name;
        return Icon;
    };
    return {
        Newspaper: icon("Newspaper"),
        MoreHorizontal: icon("MoreHorizontal"),
        SearchIcon: icon("Search"),
        PenLineIcon: icon("PenLine"),
        MessageCircleIcon: icon("MessageCircle"),
        HeartIcon: icon("Heart"),
    };
});

const sampleTags = [
    { tag: "ethics", posts: 120 },
    { tag: "health", posts: 85 },
    { tag: "research", posts: 2500 },
    { tag: "protocol", posts: 42 },
    { tag: "policy", posts: 1_200_000 },
    { tag: "extra", posts: 10 },
];

const sampleActivity = [
    { type: "post" as const, id: "a1", description: "You published a post", createdAt: new Date(Date.now() - 30000) },
    { type: "comment" as const, id: "a2", description: "You commented on a post", createdAt: new Date(Date.now() - 3600000) },
    { type: "reaction" as const, id: "a3", description: "You reacted to a post", createdAt: new Date(Date.now() - 86400000 * 2) },
];

// Helper to let fetch promises flush so state updates are captured.
const flushFetch = () => act(async () => {
    await new Promise((r) => setTimeout(r, 0));
});

describe("FeedRightSidebar", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockResolvedValue({ ok: false });
    });

    describe("static layout", () => {
        it("renders the protocol tracker", () => {
            render(<FeedRightSidebar trendingTags={sampleTags} />);
            expect(screen.getByTestId("project-tracker")).toBeInTheDocument();
        });

        it("renders the sidebar footer", () => {
            render(<FeedRightSidebar trendingTags={sampleTags} />);
            expect(screen.getByTestId("sidebar-footer")).toBeInTheDocument();
        });

        it('renders "Trends for you" heading', () => {
            render(<FeedRightSidebar trendingTags={sampleTags} />);
            expect(screen.getByText("Trends for you")).toBeInTheDocument();
        });
    });

    describe("trending tags — server-provided", () => {
        it("renders tag names when tags are provided", () => {
            render(<FeedRightSidebar trendingTags={sampleTags} />);
            expect(screen.getByText("#ethics")).toBeInTheDocument();
            expect(screen.getByText("#health")).toBeInTheDocument();
        });

        it("limits initial display to 5 tags", () => {
            render(<FeedRightSidebar trendingTags={sampleTags} />);
            expect(screen.queryByText("#extra")).not.toBeInTheDocument();
        });

        it('shows "Show more" button when there are more than 5 tags', () => {
            render(<FeedRightSidebar trendingTags={sampleTags} />);
            expect(screen.getByRole("button", { name: /show more/i })).toBeInTheDocument();
        });

        it("expands to show all tags after Show more click", async () => {
            const user = userEvent.setup();
            render(<FeedRightSidebar trendingTags={sampleTags} />);
            await user.click(screen.getByRole("button", { name: /show more/i }));
            expect(screen.getByText("#extra")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
        });

        it("collapses back after Show less click", async () => {
            const user = userEvent.setup();
            render(<FeedRightSidebar trendingTags={sampleTags} />);
            await user.click(screen.getByRole("button", { name: /show more/i }));
            await user.click(screen.getByRole("button", { name: /show less/i }));
            expect(screen.queryByText("#extra")).not.toBeInTheDocument();
        });

        it("does not show Show more when 5 or fewer tags", () => {
            render(<FeedRightSidebar trendingTags={sampleTags.slice(0, 4)} />);
            expect(screen.queryByRole("button", { name: /show more/i })).not.toBeInTheDocument();
        });

        it("formats post counts correctly: K suffix", () => {
            render(<FeedRightSidebar trendingTags={[{ tag: "big", posts: 2500 }]} />);
            expect(screen.getByText("2.5K posts")).toBeInTheDocument();
        });

        it("formats post counts correctly: M suffix", () => {
            render(<FeedRightSidebar trendingTags={[{ tag: "huge", posts: 1_200_000 }]} />);
            expect(screen.getByText("1.2M posts")).toBeInTheDocument();
        });

        it("formats post counts correctly: exact K", () => {
            render(<FeedRightSidebar trendingTags={[{ tag: "exact", posts: 3000 }]} />);
            expect(screen.getByText("3K posts")).toBeInTheDocument();
        });

        it('uses singular "post" for count of 1', () => {
            render(<FeedRightSidebar trendingTags={[{ tag: "one", posts: 1 }]} />);
            expect(screen.getByText("1 post")).toBeInTheDocument();
        });

        it("renders More options button for each tag", () => {
            render(<FeedRightSidebar trendingTags={[{ tag: "ethics", posts: 5 }]} />);
            expect(screen.getByLabelText("More options for #ethics")).toBeInTheDocument();
        });
    });

    describe("trending tags — empty state", () => {
        it("shows empty state message when no tags provided and fetch fails", async () => {
            mockFetch.mockResolvedValue({ ok: false });
            render(<FeedRightSidebar trendingTags={[]} />);
            await flushFetch();
            await waitFor(() => {
                expect(screen.getByText(/no trending topics yet/i)).toBeInTheDocument();
            });
        });

        it("shows skeleton while loading when no tags initially", () => {
            // Keep fetch pending so loading state persists
            mockFetch.mockReturnValue(new Promise(() => {}));
            const { container } = render(<FeedRightSidebar trendingTags={[]} />);
            expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
        });

        it("fetches and displays tags from API when none provided", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{ tag: "api-tag", posts: 99 }],
            });
            render(<FeedRightSidebar trendingTags={[]} />);
            await flushFetch();
            await waitFor(() => {
                expect(screen.getByText("#api-tag")).toBeInTheDocument();
            });
        });
    });

    describe("user activity", () => {
        it("renders Your Activity section when logged in", () => {
            render(<FeedRightSidebar isLoggedIn trendingTags={sampleTags} userActivity={sampleActivity} />);
            expect(screen.getByText("Your Activity")).toBeInTheDocument();
        });

        it("does not render Your Activity when not logged in", () => {
            render(<FeedRightSidebar isLoggedIn={false} trendingTags={sampleTags} />);
            expect(screen.queryByText("Your Activity")).not.toBeInTheDocument();
        });

        it("renders activity descriptions", () => {
            render(<FeedRightSidebar isLoggedIn trendingTags={sampleTags} userActivity={sampleActivity} />);
            expect(screen.getByText("You published a post")).toBeInTheDocument();
            expect(screen.getByText("You commented on a post")).toBeInTheDocument();
        });

        it("shows empty activity message when no activity", () => {
            render(<FeedRightSidebar isLoggedIn trendingTags={sampleTags} userActivity={[]} />);
            expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
        });

        it("limits to 8 activity items", () => {
            const manyActivities = Array.from({ length: 12 }, (_, i) => ({
                type: "post" as const,
                id: `a${i}`,
                description: `Activity ${i}`,
                createdAt: new Date(),
            }));
            render(<FeedRightSidebar isLoggedIn trendingTags={sampleTags} userActivity={manyActivities} />);
            expect(screen.getAllByText(/Activity \d+/).length).toBe(8);
        });

        it('formats date as "Just now" for very recent activity', () => {
            const activity = [
                { type: "post" as const, id: "a1", description: "Fresh post", createdAt: new Date(Date.now() - 5000) },
            ];
            render(<FeedRightSidebar isLoggedIn trendingTags={sampleTags} userActivity={activity} />);
            expect(screen.getByText("Just now")).toBeInTheDocument();
        });

        it("formats date as minutes ago", () => {
            const activity = [
                { type: "post" as const, id: "a1", description: "Recent", createdAt: new Date(Date.now() - 5 * 60000) },
            ];
            render(<FeedRightSidebar isLoggedIn trendingTags={sampleTags} userActivity={activity} />);
            expect(screen.getByText("5m ago")).toBeInTheDocument();
        });

        it("formats date as hours ago", () => {
            const activity = [
                { type: "comment" as const, id: "a1", description: "Old comment", createdAt: new Date(Date.now() - 3 * 3600000) },
            ];
            render(<FeedRightSidebar isLoggedIn trendingTags={sampleTags} userActivity={activity} />);
            expect(screen.getByText("3h ago")).toBeInTheDocument();
        });

        it("formats date as days ago", () => {
            const activity = [
                { type: "reaction" as const, id: "a1", description: "Old reaction", createdAt: new Date(Date.now() - 2 * 86400000) },
            ];
            render(<FeedRightSidebar isLoggedIn trendingTags={sampleTags} userActivity={activity} />);
            expect(screen.getByText("2d ago")).toBeInTheDocument();
        });
    });

    describe("Stay Connected card", () => {
        it("renders Stay Connected when not logged in", () => {
            render(<FeedRightSidebar isLoggedIn={false} trendingTags={sampleTags} />);
            expect(screen.getByText("Stay Connected")).toBeInTheDocument();
        });

        it("does not render Stay Connected when logged in", () => {
            render(<FeedRightSidebar isLoggedIn trendingTags={sampleTags} />);
            expect(screen.queryByText("Stay Connected")).not.toBeInTheDocument();
        });
    });
});