import React from "react";
import { render, screen } from "@testing-library/react";
import FeedRightSidebar from "@/components/feed-right-sidebar";

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
        SearchIcon: icon("Search"),
        PenLineIcon: icon("PenLine"),
        MessageCircleIcon: icon("MessageCircle"),
        HeartIcon: icon("Heart"),
    };
});

const sampleActivity = [
    { type: "post" as const, id: "a1", description: "You published a post", createdAt: new Date(Date.now() - 30000) },
    { type: "comment" as const, id: "a2", description: "You commented on a post", createdAt: new Date(Date.now() - 3600000) },
    { type: "reaction" as const, id: "a3", description: "You reacted to a post", createdAt: new Date(Date.now() - 86400000 * 2) },
];

describe("FeedRightSidebar", () => {
    it("renders the protocol tracker", () => {
        render(<FeedRightSidebar />);
        expect(screen.getByTestId("project-tracker")).toBeInTheDocument();
    });

    it("renders the sidebar footer", () => {
        render(<FeedRightSidebar />);
        expect(screen.getByTestId("sidebar-footer")).toBeInTheDocument();
    });

    it("renders user activity when logged in", () => {
        render(<FeedRightSidebar isLoggedIn userActivity={sampleActivity} />);
        expect(screen.getByText("Your Activity")).toBeInTheDocument();
        expect(screen.getByText("You published a post")).toBeInTheDocument();
    });

    it("shows empty activity message when no activity", () => {
        render(<FeedRightSidebar isLoggedIn userActivity={[]} />);
        expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
    });

    it("renders Stay Connected when not logged in", () => {
        render(<FeedRightSidebar isLoggedIn={false} />);
        expect(screen.getByText("Stay Connected")).toBeInTheDocument();
    });

    it("does not render Stay Connected when logged in", () => {
        render(<FeedRightSidebar isLoggedIn />);
        expect(screen.queryByText("Stay Connected")).not.toBeInTheDocument();
    });
});
