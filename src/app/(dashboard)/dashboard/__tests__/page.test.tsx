import { render, screen, within } from "@testing-library/react";
import DashboardPage from "../page";
import { authIsRequired } from "@/lib/auth-utils";
import { updateProfile } from "@/app/actions/user";
import { getUserDashboardData } from "@/app/actions/dashboard";
import React from "react";

jest.mock("@/lib/auth-utils", () => ({
    authIsRequired: jest.fn(),
}));
jest.mock("@/app/actions/user", () => ({
    updateProfile: jest.fn(),
}));
jest.mock("@/app/actions/dashboard", () => ({
    getUserDashboardData: jest.fn(),
}));

type MockComponentProps = {
    children?: React.ReactNode;
    className?: string;
};

jest.mock("@/components/ui/card", () => ({
    Card: ({ children, className }: MockComponentProps) => (
        <div className={className}>{children}</div>
    ),
    CardContent: ({ children }: MockComponentProps) => <div>{children}</div>,
    CardHeader: ({ children }: MockComponentProps) => <div>{children}</div>,
    CardTitle: ({ children }: MockComponentProps) => <div>{children}</div>,
}));

type AvatarImageProps = {
    src?: string;
    alt?: string;
};

jest.mock("@/components/ui/avatar", () => ({
    Avatar: ({ children }: MockComponentProps) => (
        <div data-testid="avatar">{children}</div>
    ),
    AvatarFallback: ({ children }: MockComponentProps) => (
        <div data-testid="avatar-fallback">{children}</div>
    ),
    AvatarImage: ({ src, alt }: AvatarImageProps) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            {...(src ? { src } : {})}
            alt={alt}
            data-testid="avatar-image"
        />
    ),
}));

type LinkProps = {
    children: React.ReactNode;
    href: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

jest.mock("next/link", () => {
    function MockLink({ children, href, ...rest }: LinkProps) {
        return (
            <a href={href} {...rest}>
                {children}
            </a>
        );
    }
    MockLink.displayName = "MockLink";
    return MockLink;
});

jest.mock("lucide-react", () => ({
    PenSquareIcon: () => <div data-testid="icon-pen" />,
    FolderIcon: () => <div data-testid="icon-folder" />,
    BellIcon: () => <div data-testid="icon-bell" />,
    CheckCircle2Icon: () => <div data-testid="icon-check" />,
    ClockIcon: () => <div data-testid="icon-clock" />,
    MessageSquareIcon: () => <div data-testid="icon-message" />,
    FileTextIcon: () => <div data-testid="icon-file" />,
    ArrowRightIcon: () => <div data-testid="icon-arrow" />,
    ActivityIcon: () => <div data-testid="icon-activity" />,
}));

const mockUser = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    image: "https://example.com/avatar.jpg",
};

const mockDashboardData = {
    stats: {
        totalPosts: 5,
        pendingProjects: 2,
        approvedProjects: 3,
        unreadNotifications: 1,
    },
    recentPosts: [
        {
            id: "post1",
            content:
                "This is a recent post with more than 80 characters to test truncation, yes indeed more than eighty characters.",
            createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            _count: { likes: 2, comments: 1 },
        },
        {
            id: "post2",
            content: "Short post",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            _count: { likes: 0, comments: 0 },
        },
    ],
    recentProjects: [
        {
            id: "proj1",
            title: "A project title",
            status: "PENDING_REVIEW",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        },
        {
            id: "proj2",
            title: "Another project",
            status: "APPROVED",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        },
    ],
    recentCommunityTopics: [
        {
            id: "topic1",
            title: "Community topic title",
            category: "General",
            user: { name: "John Doe" },
            _count: { replies: 3 },
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
    ],
};

function getQuickActionsSection() {
    const heading = screen.getByText("Quick Actions");
    return heading.parentElement as HTMLElement;
}

describe("DashboardPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authIsRequired as jest.Mock).mockResolvedValue(undefined);
        (updateProfile as jest.Mock).mockResolvedValue(mockUser);
        (getUserDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    });

    it("renders the profile header with user data", async () => {
        const page = await DashboardPage();
        render(page);

        expect(screen.getByText("Test User")).toBeInTheDocument();
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
        expect(screen.getByTestId("avatar-image")).toHaveAttribute(
            "src",
            "https://example.com/avatar.jpg"
        );
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
        expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("TU");
    });

    it("links Edit Profile to /update-profile", async () => {
        const page = await DashboardPage();
        render(page);
        expect(screen.getByText("Edit Profile")).toHaveAttribute(
            "href",
            "/update-profile"
        );
    });

    it("renders stat cards with correct values", async () => {
        const page = await DashboardPage();
        render(page);

        expect(screen.getByText("My Posts")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("Pending Protocols")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("Approved Protocols")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();

        const notifLabels = screen.getAllByText("Notifications");
        expect(notifLabels.length).toBeGreaterThanOrEqual(1);

        expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("renders recent posts with truncation, time ago, and metadata", async () => {
        const page = await DashboardPage();
        render(page);

        const longPost = mockDashboardData.recentPosts[0].content;
        expect(
            screen.getByText(longPost.slice(0, 80) + "...")
        ).toBeInTheDocument();
        expect(screen.getByText("Short post")).toBeInTheDocument();

        expect(screen.getByText("5m ago")).toBeInTheDocument();
        expect(screen.getByText("2h ago")).toBeInTheDocument();
        expect(screen.getByText("2 likes")).toBeInTheDocument();
        expect(screen.getByText("1 comments")).toBeInTheDocument();
    });

    it("renders recent projects with status badges and time", async () => {
        const page = await DashboardPage();
        render(page);

        expect(screen.getByText("A project title")).toBeInTheDocument();
        expect(screen.getByText("Another project")).toBeInTheDocument();
        expect(screen.getByText("PENDING REVIEW")).toBeInTheDocument();
        expect(screen.getByText("APPROVED")).toBeInTheDocument();
        expect(screen.getByText("2d ago")).toBeInTheDocument();
        expect(screen.getByText("5d ago")).toBeInTheDocument();
    });

    it("renders recent posts as links to /feeds", async () => {
        const page = await DashboardPage();
        render(page);

        const shortPostLink = screen.getByText("Short post").closest("a");
        expect(shortPostLink).toHaveAttribute("href", "/feeds");
    });

    it("renders recent projects as links to their protocol page", async () => {
        const page = await DashboardPage();
        render(page);

        const projectLink = screen.getByText("A project title").closest("a");
        expect(projectLink).toHaveAttribute("href", "/protocols/proj1");
    });

    it("renders community topics with metadata", async () => {
        const page = await DashboardPage();
        render(page);

        expect(screen.getByText("Community topic title")).toBeInTheDocument();
        expect(screen.getByText("by John Doe")).toBeInTheDocument();
        expect(screen.getByText("3 replies")).toBeInTheDocument();
        expect(screen.getByText("General")).toBeInTheDocument();
        expect(screen.getByText("30m ago")).toBeInTheDocument();
    });

    it("renders community topics as links to /community", async () => {
        const page = await DashboardPage();
        render(page);

        const topicLink = screen.getByText("Community topic title").closest("a");
        expect(topicLink).toHaveAttribute("href", "/community");
    });

    it("renders all quick action cards with correct labels and links", async () => {
        const page = await DashboardPage();
        render(page);

        const section = getQuickActionsSection();

        const feedsLabel = within(section).getByText("Feeds");
        expect(feedsLabel.closest("a")).toHaveAttribute("href", "/feeds");

        const submitLabel = within(section).getByText("Submit Protocol");
        expect(submitLabel.closest("a")).toHaveAttribute(
            "href",
            "/protocols/submit"
        );

        const protocolsLabel = within(section).getByText("My Protocols");
        expect(protocolsLabel.closest("a")).toHaveAttribute("href", "/protocols");

        const notifLabel = within(section).getByText("Notifications");
        expect(notifLabel.closest("a")).toHaveAttribute(
            "href",
            "/notifications"
        );
    });

    it("renders quick action subtitles", async () => {
        const page = await DashboardPage();
        render(page);

        const section = getQuickActionsSection();
        expect(within(section).getByText("Share & interact")).toBeInTheDocument();
        expect(within(section).getByText("New submission")).toBeInTheDocument();
        expect(within(section).getByText("Track submissions")).toBeInTheDocument();
        expect(within(section).getByText("Stay updated")).toBeInTheDocument();
    });

    it("renders section navigation links", async () => {
        const page = await DashboardPage();
        render(page);

        const viewAllLinks = screen.getAllByText(/View all/i);
        expect(viewAllLinks).toHaveLength(2);

        const hrefs = viewAllLinks.map((el) =>
            el.closest("a")?.getAttribute("href")
        );
        expect(hrefs).toContain("/feeds");
        expect(hrefs).toContain("/community");
    });

    it("renders section headings", async () => {
        const page = await DashboardPage();
        render(page);

        expect(screen.getByText("Recent Activity")).toBeInTheDocument();
        expect(screen.getByText("Community Updates")).toBeInTheDocument();
        expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    });

    it("shows empty state when no posts and no community topics", async () => {
        (getUserDashboardData as jest.Mock).mockResolvedValue({
            stats: {
                totalPosts: 0,
                pendingProjects: 0,
                approvedProjects: 0,
                unreadNotifications: 0,
            },
            recentPosts: [],
            recentProjects: [],
            recentCommunityTopics: [],
        });

        const page = await DashboardPage();
        render(page);

        expect(screen.getByText("No recent posts yet.")).toBeInTheDocument();
        const createLink = screen.getByText("Create one");
        expect(createLink).toHaveAttribute("href", "/feeds");

        expect(
            screen.getByText("No community discussions yet.")
        ).toBeInTheDocument();

        expect(screen.getAllByText("0")).toHaveLength(4);
    });

    it("does not render a divider when there are no recent projects", async () => {
        (getUserDashboardData as jest.Mock).mockResolvedValue({
            ...mockDashboardData,
            recentProjects: [],
        });

        const page = await DashboardPage();
        const { container } = render(page);

        const dividers = container.querySelectorAll(
            ".border-t.border-gray-100"
        );
        expect(dividers).toHaveLength(0);
    });

    it("handles missing user gracefully (null user)", async () => {
        (updateProfile as jest.Mock).mockResolvedValue(null);

        const page = await DashboardPage();
        render(page);

        expect(screen.getByText("Welcome")).toBeInTheDocument();
        expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("U");
    });

    it("handles missing user image (null image)", async () => {
        (updateProfile as jest.Mock).mockResolvedValue({
            ...mockUser,
            image: null,
        });

        const page = await DashboardPage();
        render(page);

        const avatarImage = screen.getByTestId("avatar-image");
        expect(avatarImage).not.toHaveAttribute("src");
        expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("TU");
    });

    it("uses email initials when name is an empty string", async () => {
        (updateProfile as jest.Mock).mockResolvedValue({
            ...mockUser,
            name: "",
        });

        const page = await DashboardPage();
        render(page);

        expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("TE");
    });

    it("shows only first 2 initials for multi-word names", async () => {
        (updateProfile as jest.Mock).mockResolvedValue({
            ...mockUser,
            name: "Alice Bob Charlie",
        });

        const page = await DashboardPage();
        render(page);

        expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("AB");
    });

    it("redirects when authIsRequired throws NEXT_REDIRECT", async () => {
        (authIsRequired as jest.Mock).mockImplementation(() => {
            throw new Error("NEXT_REDIRECT");
        });

        await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("handles undefined dashboard data stats gracefully", async () => {
        (getUserDashboardData as jest.Mock).mockResolvedValue(null);

        const page = await DashboardPage();
        render(page);

        expect(screen.getAllByText("0")).toHaveLength(4);
    });
});