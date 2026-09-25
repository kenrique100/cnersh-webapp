import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import DashboardSidebar from "@/components/dashboard-sidebar";


jest.mock("next/navigation", () => ({
    usePathname: jest.fn(() => "/dashboard"),
    useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("@/lib/auth-client", () => ({
    authClient: { signOut: jest.fn() },
}));

jest.mock("next/link", () => {
    function LinkMock({
                          children,
                          href,
                          className,
                          title,
                      }: React.PropsWithChildren<{
        href: string;
        className?: string;
        title?: string;
    }>) {
        return (
            <a href={href} className={className} title={title}>
                {children}
            </a>
        );
    }
    LinkMock.displayName = "LinkMock";
    return LinkMock;
});

jest.mock("@/lib/utils", () => ({
    cn: (...classes: (string | boolean | undefined)[]) =>
        classes.filter(Boolean).join(" "),
}));

jest.mock("lucide-react", () => {
    const icon = (name: string) => {
        function Icon({ className }: { className?: string }) {
            return <span data-testid={`icon-${name}`} className={className} />;
        }
        Icon.displayName = name;
        return Icon;
    };
    return {
        LayoutDashboardIcon: icon("LayoutDashboard"),
        UserIcon: icon("User"),
        PenSquareIcon: icon("PenSquare"),
        FolderPlusIcon: icon("FolderPlus"),
        FolderIcon: icon("Folder"),
        MessageSquareIcon: icon("MessageSquare"),
        SettingsIcon: icon("Settings"),
        LogOutIcon: icon("LogOut"),
        UsersIcon: icon("Users"),
        CheckSquareIcon: icon("CheckSquare"),
        ShieldIcon: icon("Shield"),
        BarChart3Icon: icon("BarChart3"),
        ScrollTextIcon: icon("ScrollText"),
        FlagIcon: icon("Flag"),
        ChevronLeftIcon: icon("ChevronLeft"),
        ChevronRightIcon: icon("ChevronRight"),
        FileTextIcon: icon("FileText"),
        BellIcon: icon("Bell"),
    };
});

jest.mock("@/components/community/community-unread-badge", () => {
    function BadgeMock({
                           count,
                           collapsed,
                       }: {
        count: number;
        collapsed?: boolean;
    }) {
        if (count <= 0) return null;
        return (
            <span
                data-testid="community-badge"
                data-count={count}
                data-collapsed={String(Boolean(collapsed))}
            >
                {count > 99 ? "99+" : String(count)}
            </span>
        );
    }
    BadgeMock.displayName = "CommunityUnreadBadge";
    return BadgeMock;
});

jest.mock("@/app/actions/community", () => ({
    markCommunityRead: jest.fn().mockResolvedValue(undefined),
}));


const { usePathname, useRouter } = jest.requireMock("next/navigation") as {
    usePathname: jest.Mock;
    useRouter: jest.Mock;
};

const { authClient } = jest.requireMock("@/lib/auth-client") as {
    authClient: { signOut: jest.Mock };
};

const { markCommunityRead } = jest.requireMock("@/app/actions/community") as {
    markCommunityRead: jest.Mock;
};


describe("DashboardSidebar", () => {
    const mockPush = jest.fn();
    const onToggle = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        usePathname.mockReturnValue("/dashboard");
        useRouter.mockReturnValue({ push: mockPush });
        markCommunityRead.mockResolvedValue(undefined);
    });

    describe("role-based navigation sections", () => {
        it("renders user sections for undefined role", () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText("Dashboard")).toBeInTheDocument();
            expect(screen.getByText("Protocols")).toBeInTheDocument();
            expect(screen.getByText("Notifications")).toBeInTheDocument();
            expect(screen.getByText("Feeds")).toBeInTheDocument();
            expect(screen.getByText("Submit Protocol")).toBeInTheDocument();
            expect(screen.getByText("My Profile")).toBeInTheDocument();
            expect(screen.getByText("Settings")).toBeInTheDocument();
            expect(screen.queryByText("User Management")).not.toBeInTheDocument();
            expect(screen.queryByText("Community")).not.toBeInTheDocument();
        });

        it("renders admin sections for admin role (includes Community)", () => {
            render(<DashboardSidebar role="admin" collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText("Community")).toBeInTheDocument();
            expect(screen.getByText("User Management")).toBeInTheDocument();
            expect(screen.getByText("Protocol Review")).toBeInTheDocument();
            expect(screen.getByText("Feed Moderation")).toBeInTheDocument();
            expect(screen.getByText("Manage Pages")).toBeInTheDocument();
            expect(screen.getByText("Reports")).toBeInTheDocument();
            expect(screen.getByText("Audit Logs")).toBeInTheDocument();
            expect(screen.queryByText("Platform Stats")).not.toBeInTheDocument();
        });

        it("renders superadmin sections including Analytics", () => {
            render(<DashboardSidebar role="superadmin" collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText("Platform Stats")).toBeInTheDocument();
            expect(screen.getByText("User Management")).toBeInTheDocument();
            expect(screen.getByText("Community")).toBeInTheDocument();
        });

        it("renders section titles when not collapsed", () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText("Main")).toBeInTheDocument();
            expect(screen.getByText("Actions")).toBeInTheDocument();
            expect(screen.getByText("Account")).toBeInTheDocument();
        });

        it("hides section titles when collapsed", () => {
            render(<DashboardSidebar collapsed={true} onToggle={onToggle} />);
            expect(screen.queryByText("Main")).not.toBeInTheDocument();
            expect(screen.queryByText("Actions")).not.toBeInTheDocument();
        });
    });

    describe("collapsed state", () => {
        it("hides label text when collapsed", () => {
            render(<DashboardSidebar collapsed={true} onToggle={onToggle} />);
            expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
        });

        it("shows label text when expanded", () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText("Dashboard")).toBeInTheDocument();
        });

        it("renders ChevronRight icon when collapsed", () => {
            render(<DashboardSidebar collapsed={true} onToggle={onToggle} />);
            expect(screen.getByTestId("icon-ChevronRight")).toBeInTheDocument();
        });

        it("renders ChevronLeft icon when expanded", () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            expect(screen.getByTestId("icon-ChevronLeft")).toBeInTheDocument();
        });

        it("calls onToggle when the toggle button is clicked", () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            fireEvent.click(screen.getByTestId("icon-ChevronLeft").closest("button")!);
            expect(onToggle).toHaveBeenCalledTimes(1);
        });
    });

    describe("active link highlighting", () => {
        it("applies active class to current path link", () => {
            usePathname.mockReturnValue("/dashboard");
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            const dashboardLink = screen.getByText("Dashboard").closest("a");
            expect(dashboardLink?.className).toContain("bg-blue-600");
        });

        it("does not apply active class to other links", () => {
            usePathname.mockReturnValue("/dashboard");
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            const feedsLink = screen.getByText("Feeds").closest("a");
            expect(feedsLink?.className).not.toContain("bg-blue-600");
        });

        it("activates nested paths via startsWith", () => {
            usePathname.mockReturnValue("/protocols/submit");
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            const protocolsLink = screen.getByText("Protocols").closest("a");
            expect(protocolsLink?.className).toContain("bg-blue-600");
        });
    });

    describe("logout", () => {
        it("calls signOut on logout click", () => {
            authClient.signOut.mockResolvedValueOnce(undefined);
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            fireEvent.click(screen.getByText("Logout"));
            expect(authClient.signOut).toHaveBeenCalledTimes(1);
        });

        it("shows Logout text when expanded", () => {
            render(<DashboardSidebar collapsed={false} onToggle={onToggle} />);
            expect(screen.getByText("Logout")).toBeInTheDocument();
        });

        it("hides Logout text when collapsed", () => {
            render(<DashboardSidebar collapsed={true} onToggle={onToggle} />);
            expect(screen.queryByText("Logout")).not.toBeInTheDocument();
        });
    });

    describe("aside width classes", () => {
        it("has w-64 class when expanded", () => {
            const { container } = render(
                <DashboardSidebar collapsed={false} onToggle={onToggle} />
            );
            const aside = container.querySelector("aside");
            expect(aside?.className).toContain("w-64");
        });

        it("has w-16 class when collapsed", () => {
            const { container } = render(
                <DashboardSidebar collapsed={true} onToggle={onToggle} />
            );
            const aside = container.querySelector("aside");
            expect(aside?.className).toContain("w-16");
        });
    });


    describe("community unread badge", () => {
        it("does not render a badge when communityUnreadCount is 0", () => {
            render(
                <DashboardSidebar
                    role="admin"
                    collapsed={false}
                    onToggle={onToggle}
                    communityUnreadCount={0}
                />
            );
            expect(screen.queryByTestId("community-badge")).not.toBeInTheDocument();
        });

        it("renders the badge with the exact count on the Community link", () => {
            render(
                <DashboardSidebar
                    role="admin"
                    collapsed={false}
                    onToggle={onToggle}
                    communityUnreadCount={27}
                />
            );
            const badge = screen.getByTestId("community-badge");
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveAttribute("data-count", "27");
            expect(badge).toHaveTextContent("27");
        });

        it("formats counts above 99 as '99+'", () => {
            render(
                <DashboardSidebar
                    role="admin"
                    collapsed={false}
                    onToggle={onToggle}
                    communityUnreadCount={1234}
                />
            );
            const badge = screen.getByTestId("community-badge");
            expect(badge).toHaveAttribute("data-count", "1234");
            expect(badge).toHaveTextContent("99+");
        });

        it("passes collapsed=true to the badge when the sidebar is collapsed", () => {
            render(
                <DashboardSidebar
                    role="admin"
                    collapsed={true}
                    onToggle={onToggle}
                    communityUnreadCount={5}
                />
            );
            const badge = screen.getByTestId("community-badge");
            expect(badge).toHaveAttribute("data-collapsed", "true");
        });

        it("passes collapsed=false to the badge when the sidebar is expanded", () => {
            render(
                <DashboardSidebar
                    role="admin"
                    collapsed={false}
                    onToggle={onToggle}
                    communityUnreadCount={5}
                />
            );
            const badge = screen.getByTestId("community-badge");
            expect(badge).toHaveAttribute("data-collapsed", "false");
        });

        it("hides the badge while the user is on /community", () => {
            usePathname.mockReturnValue("/community");
            render(
                <DashboardSidebar
                    role="admin"
                    collapsed={false}
                    onToggle={onToggle}
                    communityUnreadCount={9}
                />
            );
            expect(screen.queryByTestId("community-badge")).not.toBeInTheDocument();
        });

        it("does not render a badge for regular users", () => {
            render(
                <DashboardSidebar
                    role="user"
                    collapsed={false}
                    onToggle={onToggle}
                    communityUnreadCount={9}
                />
            );
            expect(screen.queryByTestId("community-badge")).not.toBeInTheDocument();
        });
    });

    /* -------------------------------------------------------------- */
    /* markCommunityRead side effect                                   */
    /* -------------------------------------------------------------- */

    describe("markCommunityRead side effect", () => {
        it("calls markCommunityRead when on /community with unread > 0", async () => {
            usePathname.mockReturnValue("/community");
            await act(async () => {
                render(
                    <DashboardSidebar
                        role="admin"
                        collapsed={false}
                        onToggle={onToggle}
                        communityUnreadCount={3}
                    />
                );
            });
            expect(markCommunityRead).toHaveBeenCalledTimes(1);
        });

        it("does not call markCommunityRead when unread count is 0", async () => {
            usePathname.mockReturnValue("/community");
            await act(async () => {
                render(
                    <DashboardSidebar
                        role="admin"
                        collapsed={false}
                        onToggle={onToggle}
                        communityUnreadCount={0}
                    />
                );
            });
            expect(markCommunityRead).not.toHaveBeenCalled();
        });

        it("does not call markCommunityRead on other routes", async () => {
            usePathname.mockReturnValue("/dashboard");
            await act(async () => {
                render(
                    <DashboardSidebar
                        role="admin"
                        collapsed={false}
                        onToggle={onToggle}
                        communityUnreadCount={5}
                    />
                );
            });
            expect(markCommunityRead).not.toHaveBeenCalled();
        });

        it("logs an error if markCommunityRead rejects", async () => {
            usePathname.mockReturnValue("/community");
            markCommunityRead.mockRejectedValueOnce(new Error("boom"));
            const consoleErr = jest
                .spyOn(console, "error")
                .mockImplementation(() => undefined);

            await act(async () => {
                render(
                    <DashboardSidebar
                        role="admin"
                        collapsed={false}
                        onToggle={onToggle}
                        communityUnreadCount={1}
                    />
                );
                // Let the rejected promise settle.
                await Promise.resolve();
            });

            expect(consoleErr).toHaveBeenCalledWith(
                "[sidebar] markCommunityRead failed:",
                expect.any(Error)
            );
            consoleErr.mockRestore();
        });
    });
});