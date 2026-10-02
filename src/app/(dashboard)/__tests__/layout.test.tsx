import React from "react";

jest.mock("@/lib/auth-utils", () => ({
    authIsRequired: jest.fn(),
}));

jest.mock("@/app/actions/notification", () => ({
    getUnreadNotificationCount: jest.fn(),
}));

jest.mock("@/app/actions/community", () => ({
    getCommunityUnreadCount: jest.fn(),
}));

jest.mock("@/app/actions/page-actions", () => ({
    getPages: jest.fn(),
}));

jest.mock("@/components/navbar", () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

jest.mock("@/components/dashboard-shell", () => ({
    __esModule: true,
    default: jest.fn(({ children }: { children: React.ReactNode }) => children),
}));

jest.mock("@/components/user-storage-guard", () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

// The layout is an async server component. We test it by directly awaiting
// the returned JSX rather than using @testing-library/react.
import DashboardLayout from "../layout";
import { authIsRequired } from "@/lib/auth-utils";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { getCommunityUnreadCount } from "@/app/actions/community";
import { getPages } from "@/app/actions/page-actions";
import Navbar from "@/components/navbar";

const mockAuthIsRequired = authIsRequired as unknown as jest.Mock;
const mockUnread = getUnreadNotificationCount as unknown as jest.Mock;
const mockCommunity = getCommunityUnreadCount as unknown as jest.Mock;
const mockPages = getPages as unknown as jest.Mock;

const SESSION = {
    session: { id: "s1", userId: "u1" },
    user: {
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        image: null as string | null,
        emailVerified: true,
        gender: "female",
        role: "admin",
        profession: "Researcher",
        title: "Dr.",
    },
};

function findElementByType(
    node: React.ReactNode,
    target: React.ElementType,
): React.ReactElement | null {
    if (!React.isValidElement(node)) return null;
    if (node.type === target) return node;

    const props = (
        node as React.ReactElement<{ children?: React.ReactNode }>
    ).props;
    const children = props?.children;
    if (!children) return null;

    const kids = Array.isArray(children) ? children : [children];
    for (const child of kids) {
        const found = findElementByType(child, target);
        if (found) return found;
    }
    return null;
}

beforeEach(() => {
    jest.clearAllMocks();
    mockUnread.mockResolvedValue(0);
    mockCommunity.mockResolvedValue(0);
    mockPages.mockResolvedValue([]);
});

describe("DashboardLayout", () => {
    it("performs exactly one authoritative session lookup", async () => {
        mockAuthIsRequired.mockResolvedValueOnce(SESSION);

        await DashboardLayout({ children: <div /> });

        expect(mockAuthIsRequired).toHaveBeenCalledTimes(1);
    });

    it("passes the session user directly to the Navbar", async () => {
        mockAuthIsRequired.mockResolvedValueOnce(SESSION);

        const tree = await DashboardLayout({ children: <div /> });
        const navbar = findElementByType(tree, Navbar);

        expect(navbar).not.toBeNull();

        const navbarProps = navbar!.props as {
            user: {
                name: string;
                email: string;
                image: string | null;
                gender: string | null;
                role: string | null;
            };
        };

        expect(navbarProps.user).toEqual({
            name: "Test User",
            email: "test@example.com",
            image: null,
            gender: "female",
            role: "admin",
        });
    });

    it("still renders when the unread/pages fan-out fails", async () => {
        mockAuthIsRequired.mockResolvedValueOnce(SESSION);
        mockUnread.mockRejectedValueOnce(new Error("boom"));

        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        await expect(
            DashboardLayout({ children: <div /> }),
        ).resolves.toBeTruthy();

        consoleError.mockRestore();
    });
});