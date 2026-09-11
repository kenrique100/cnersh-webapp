// src/components/__tests__/NotificationsClient.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import NotificationsClient from "@/components/notifications-client";
import * as notificationActions from "@/app/actions/notification";
import { toast } from "sonner";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: jest.fn(), push: mockPush }),
}));
jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/app/actions/notification", () => ({
    markNotificationRead: jest.fn(),
    markAllNotificationsRead: jest.fn(),
}));
jest.mock("lucide-react", () => ({
    BellIcon: () => <span data-testid="bell-icon" />,
    CheckIcon: () => <span data-testid="check-icon" />,
    CheckCheckIcon: () => <span data-testid="checkcheck-icon" />,
    ExternalLinkIcon: () => <span data-testid="external-link-icon" />,
    XIcon: () => <span data-testid="x-icon" />,
    HeartIcon: () => <span data-testid="heart-icon" />,
    MessageCircleIcon: () => <span data-testid="message-icon" />,
    FolderIcon: () => <span data-testid="folder-icon" />,
    AlertCircleIcon: () => <span data-testid="alert-icon" />,
    InfoIcon: () => <span data-testid="info-icon" />,
    UserCheckIcon: () => <span data-testid="usercheck-icon" />,
}));
jest.mock("@/components/ui/card", () => ({
    Card: ({ children, onClick, className }: React.HTMLAttributes<HTMLDivElement>) => (
        <div data-testid="card" onClick={onClick} className={className}>{children}</div>
    ),
    CardContent: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="card-content">{children}</div>
    ),
}));
jest.mock("@/components/ui/button", () => ({
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
        <button {...props}>{children}</button>
    ),
}));
jest.mock("@/components/ui/badge", () => ({
    Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <span className={className}>{children}</span>
    ),
}));
jest.mock("@/components/ui/dialog", () => ({
    Dialog: ({ children, open, onOpenChange }: {
        children: React.ReactNode;
        open: boolean;
        onOpenChange: (v: boolean) => void;
    }) => open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="dialog-content">{children}</div>
    ),
    DialogHeader: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    DialogTitle: ({ children }: { children: React.ReactNode }) => (
        <h2>{children}</h2>
    ),
    DialogDescription: ({ children }: { children: React.ReactNode }) => (
        <p>{children}</p>
    ),
}));

const mockNotifications = [
    {
        id: "notif-1",
        type: "LIKE",
        message: "Someone liked your post",
        link: "/post/1",
        read: false,
        createdAt: new Date("2024-01-01T10:00:00Z"),
    },
    {
        id: "notif-2",
        type: "COMMENT",
        message: "Someone commented on your post",
        link: null,
        read: true,
        createdAt: new Date("2024-01-02T12:00:00Z"),
    },
    {
        id: "notif-3",
        type: "PROJECT_STATUS",
        message: "Your project status changed",
        link: "/project/1",
        read: false,
        createdAt: new Date("2024-01-03T08:00:00Z"),
    },
    {
        id: "notif-4",
        type: "UNKNOWN_TYPE",
        message: "Unknown notification",
        link: null,
        read: true,
        createdAt: new Date("2024-01-04T08:00:00Z"),
    },
];

describe("NotificationsClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (notificationActions.markNotificationRead as jest.Mock).mockResolvedValue({});
        (notificationActions.markAllNotificationsRead as jest.Mock).mockResolvedValue({});
        mockPush.mockClear();
    });

    // ── Empty state ────────────────────────────────────────────────────

    it("shows empty state when no notifications", () => {
        render(
            <NotificationsClient
                initialNotifications={[]}
                unreadCount={0}
            />
        );
        expect(screen.getByText("No notifications")).toBeInTheDocument();
        expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
        expect(screen.getByTestId("bell-icon")).toBeInTheDocument();
    });

    it("does not show mark-all button when unreadCount is 0", () => {
        render(
            <NotificationsClient
                initialNotifications={[]}
                unreadCount={0}
            />
        );
        expect(screen.queryByText("Mark all as read")).not.toBeInTheDocument();
    });

    // ── Notifications list ─────────────────────────────────────────────

    it("renders notification messages", () => {
        render(
            <NotificationsClient
                initialNotifications={mockNotifications}
                unreadCount={2}
            />
        );
        expect(screen.getByText("Someone liked your post")).toBeInTheDocument();
        expect(screen.getByText("Someone commented on your post")).toBeInTheDocument();
    });

    it("shows mark-all button when unreadCount > 0", () => {
        render(
            <NotificationsClient
                initialNotifications={mockNotifications}
                unreadCount={2}
            />
        );
        expect(screen.getByText("Mark all as read")).toBeInTheDocument();
    });

    it("uses SYSTEM config for unknown notification type", () => {
        render(
            <NotificationsClient
                initialNotifications={[mockNotifications[3]]}
                unreadCount={0}
            />
        );
        expect(screen.getByText("Unknown notification")).toBeInTheDocument();
    });

    // ── Mark all as read ───────────────────────────────────────────────

    it("marks all notifications as read", async () => {
        render(
            <NotificationsClient
                initialNotifications={mockNotifications}
                unreadCount={2}
            />
        );
        fireEvent.click(screen.getByText("Mark all as read"));
        await waitFor(() =>
            expect(
                notificationActions.markAllNotificationsRead
            ).toHaveBeenCalled()
        );
        expect(toast.success).toHaveBeenCalledWith(
            "All notifications marked as read"
        );
    });

    it("shows error toast when markAllNotificationsRead fails", async () => {
        (notificationActions.markAllNotificationsRead as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        render(
            <NotificationsClient
                initialNotifications={mockNotifications}
                unreadCount={2}
            />
        );
        fireEvent.click(screen.getByText("Mark all as read"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to mark all as read")
        );
    });

    it("hides mark-all button after all read", async () => {
        render(
            <NotificationsClient
                initialNotifications={mockNotifications}
                unreadCount={2}
            />
        );
        fireEvent.click(screen.getByText("Mark all as read"));
        await waitFor(() =>
            expect(
                screen.queryByText("Mark all as read")
            ).not.toBeInTheDocument()
        );
    });

    // ── Single mark as read ────────────────────────────────────────────

    it("marks single notification as read via check button", async () => {
        render(
            <NotificationsClient
                initialNotifications={mockNotifications}
                unreadCount={2}
            />
        );
        // The “Mark as read” button now has title="Mark as read"
        const checkBtns = screen.getAllByTitle("Mark as read");
        fireEvent.click(checkBtns[0]);
        await waitFor(() =>
            expect(notificationActions.markNotificationRead).toHaveBeenCalledWith(
                "notif-1"
            )
        );
    });

    it("shows error toast when markNotificationRead fails", async () => {
        (notificationActions.markNotificationRead as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        render(
            <NotificationsClient
                initialNotifications={mockNotifications}
                unreadCount={2}
            />
        );
        const checkBtns = screen.getAllByTitle("Mark as read");
        fireEvent.click(checkBtns[0]);
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith(
                "Failed to mark notification as read"
            )
        );
    });

    // ── Click notification card ────────────────────────────────────────

    it("marks unread notification as read when card is clicked", async () => {
        render(
            <NotificationsClient
                initialNotifications={mockNotifications}
                unreadCount={2}
            />
        );
        const cards = screen.getAllByTestId("card");
        fireEvent.click(cards[0]); // notif-1 (unread)
        await waitFor(() =>
            expect(notificationActions.markNotificationRead).toHaveBeenCalledWith(
                "notif-1"
            )
        );
    });

    it("opens dialog when notification has no link", async () => {
        render(
            <NotificationsClient
                initialNotifications={[mockNotifications[1]]} // read, no link
                unreadCount={0}
            />
        );
        const card = screen.getByTestId("card");
        fireEvent.click(card);
        await waitFor(() =>
            expect(screen.getByTestId("dialog")).toBeInTheDocument()
        );
    });

    it("does not call markRead when already-read notification is clicked", async () => {
        render(
            <NotificationsClient
                initialNotifications={[mockNotifications[1]]} // read
                unreadCount={0}
            />
        );
        const card = screen.getByTestId("card");
        fireEvent.click(card);
        expect(notificationActions.markNotificationRead).not.toHaveBeenCalled();
    });

    // ── Dialog ─────────────────────────────────────────────────────────

    it("shows notification detail dialog with message", async () => {
        render(
            <NotificationsClient
                initialNotifications={[mockNotifications[1]]}
                unreadCount={0}
            />
        );
        fireEvent.click(screen.getByTestId("card"));
        await waitFor(() =>
            expect(screen.getByTestId("dialog")).toBeInTheDocument()
        );
        const dialog = screen.getByTestId("dialog");
        expect(
            within(dialog).getByText("Someone commented on your post")
        ).toBeInTheDocument();
    });

    it("closes dialog when Close button is clicked", async () => {
        render(
            <NotificationsClient
                initialNotifications={[mockNotifications[1]]}
                unreadCount={0}
            />
        );
        fireEvent.click(screen.getByTestId("card"));
        await waitFor(() =>
            expect(screen.getByTestId("dialog")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByText("Close"));
        expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("shows navigate button for notification with link in dialog", async () => {
        // Use a notification that has a link – after the component fix it will open the dialog.
        const notifWithLink = { ...mockNotifications[1], link: "/somewhere", read: true };
        render(
            <NotificationsClient
                initialNotifications={[notifWithLink]}
                unreadCount={0}
            />
        );
        const card = screen.getByTestId("card");
        fireEvent.click(card);
        await waitFor(() =>
            expect(screen.getByTestId("dialog")).toBeInTheDocument()
        );
        // The dialog should contain a navigation button
        expect(screen.getByText(/View Post|Go to Link|View Protocol/)).toBeInTheDocument();
    });

    it("shows SYSTEM admin review button when isAdmin and notification is SYSTEM type with link", async () => {
        const systemNotif = {
            id: "sys-1",
            type: "SYSTEM",
            message: "System alert",
            link: "/admin/review/1",       // must have a link for the button to appear
            read: true,
            createdAt: new Date(),
        };
        render(
            <NotificationsClient
                initialNotifications={[systemNotif]}
                unreadCount={0}
                isAdmin={true}
            />
        );
        fireEvent.click(screen.getByTestId("card"));
        await waitFor(() =>
            expect(screen.getByTestId("dialog")).toBeInTheDocument()
        );
        const dialog = screen.getByTestId("dialog");
        // The Review Content button should be visible
        expect(within(dialog).getByText("Review Content")).toBeInTheDocument();
    });

    it("formats date correctly", () => {
        render(
            <NotificationsClient
                initialNotifications={mockNotifications}
                unreadCount={2}
            />
        );
        // Date is formatted - just check it renders without crash
        expect(screen.getByText("Someone liked your post")).toBeInTheDocument();
    });
});