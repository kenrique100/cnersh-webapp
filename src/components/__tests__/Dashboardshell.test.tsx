import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardShell from "@/components/dashboard-shell";

// Capture every prop the sidebar receives. Assertions on this capture are the
// most reliable way to prove that role and communityUnreadCount reach the
// sidebar unchanged.
const sidebarPropCapture = jest.fn();

jest.mock("@/components/dashboard-sidebar", () => {
    function SidebarMock({
                             collapsed,
                             onToggle,
                             role,
                             communityUnreadCount,
                         }: {
        collapsed: boolean;
        onToggle: () => void;
        role?: string | null;
        communityUnreadCount?: number;
    }) {
        sidebarPropCapture({ collapsed, role, communityUnreadCount });
        return (
            <div
                data-testid="sidebar"
                data-collapsed={String(collapsed)}
                data-role={role ?? ""}
                data-community={String(communityUnreadCount ?? 0)}
            >
                <button onClick={onToggle} data-testid="toggle-btn">
                    Toggle
                </button>
            </div>
        );
    }
    SidebarMock.displayName = "SidebarMock";
    return SidebarMock;
});

// `cn` is mocked with a simple join so class-string assertions are stable and
// we do not pull `clsx` / `tailwind-merge` into every render.
jest.mock("@/lib/utils", () => ({
    cn: (...classes: (string | boolean | undefined)[]) =>
        classes.filter(Boolean).join(" "),
}));

describe("DashboardShell", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("rendering", () => {
        it("renders children", () => {
            render(
                <DashboardShell>
                    <p>Page content</p>
                </DashboardShell>
            );
            expect(screen.getByText("Page content")).toBeInTheDocument();
        });

        it("renders the sidebar", () => {
            render(
                <DashboardShell>
                    <div />
                </DashboardShell>
            );
            expect(screen.getByTestId("sidebar")).toBeInTheDocument();
        });
    });

    describe("sidebar visibility contract (CSS-only)", () => {
        /**
         * Mobile behaviour is now CSS-driven, not JS-driven:
         *   - The sidebar wrapper is `hidden md:block`, so it disappears below 768px
         *     and reappears above it — no `useIsMobile` re-render required.
         *   - `<main>` carries `md:ml-*` classes only, which is why no margin is
         *     applied below 768px.
         *
         * These assertions lock the contract in case someone reintroduces a JS
         * width check.
         */
        it("wraps the sidebar in a `hidden md:block` container", () => {
            const { container } = render(
                <DashboardShell>
                    <div />
                </DashboardShell>
            );
            const sidebar = screen.getByTestId("sidebar");
            const wrapper = sidebar.parentElement;
            expect(wrapper?.className).toContain("hidden");
            expect(wrapper?.className).toContain("md:block");
            // Sanity check that the wrapper is the direct child of the shell.
            expect(container.firstChild?.contains(wrapper!)).toBe(true);
        });

        it("never emits an unprefixed `ml-*` class on <main>", () => {
            const { container } = render(
                <DashboardShell>
                    <div />
                </DashboardShell>
            );
            const main = container.querySelector("main");
            const classes = main?.className.split(/\s+/) ?? [];
            const hasUnprefixedLeftMargin = classes.some((c) =>
                /^ml-/.test(c)
            );
            expect(hasUnprefixedLeftMargin).toBe(false);
        });
    });

    describe("toggle behaviour", () => {
        it("starts expanded (collapsed=false)", () => {
            render(
                <DashboardShell>
                    <div />
                </DashboardShell>
            );
            expect(screen.getByTestId("sidebar").dataset.collapsed).toBe("false");
        });

        it("toggles to collapsed when the toggle button is clicked", () => {
            render(
                <DashboardShell>
                    <div />
                </DashboardShell>
            );
            expect(screen.getByTestId("sidebar").dataset.collapsed).toBe("false");
            fireEvent.click(screen.getByTestId("toggle-btn"));
            expect(screen.getByTestId("sidebar").dataset.collapsed).toBe("true");
        });

        it("toggles back to expanded on a second click", () => {
            render(
                <DashboardShell>
                    <div />
                </DashboardShell>
            );
            fireEvent.click(screen.getByTestId("toggle-btn"));
            fireEvent.click(screen.getByTestId("toggle-btn"));
            expect(screen.getByTestId("sidebar").dataset.collapsed).toBe("false");
        });

        it("applies md:ml-64 to <main> when expanded", () => {
            const { container } = render(
                <DashboardShell>
                    <div />
                </DashboardShell>
            );
            const main = container.querySelector("main");
            expect(main?.className).toContain("md:ml-64");
        });

        it("applies md:ml-16 to <main> when collapsed", () => {
            const { container } = render(
                <DashboardShell>
                    <div />
                </DashboardShell>
            );
            fireEvent.click(screen.getByTestId("toggle-btn"));
            const main = container.querySelector("main");
            expect(main?.className).toContain("md:ml-16");
        });
    });

    describe("role prop forwarding", () => {
        it("passes null role to sidebar", () => {
            render(
                <DashboardShell role={null}>
                    <div />
                </DashboardShell>
            );
            expect(sidebarPropCapture).toHaveBeenCalledWith(
                expect.objectContaining({ role: null })
            );
        });

        it("passes admin role to sidebar", () => {
            render(
                <DashboardShell role="admin">
                    <div />
                </DashboardShell>
            );
            expect(sidebarPropCapture).toHaveBeenCalledWith(
                expect.objectContaining({ role: "admin" })
            );
        });

        it("passes superadmin role to sidebar", () => {
            render(
                <DashboardShell role="superadmin">
                    <div />
                </DashboardShell>
            );
            expect(sidebarPropCapture).toHaveBeenCalledWith(
                expect.objectContaining({ role: "superadmin" })
            );
        });

        it("passes undefined role when not provided", () => {
            render(
                <DashboardShell>
                    <div />
                </DashboardShell>
            );
            expect(sidebarPropCapture).toHaveBeenCalledWith(
                expect.objectContaining({ role: undefined })
            );
        });
    });

    describe("communityUnreadCount prop forwarding", () => {
        it("defaults communityUnreadCount to 0", () => {
            render(
                <DashboardShell>
                    <div />
                </DashboardShell>
            );
            expect(screen.getByTestId("sidebar").dataset.community).toBe("0");
        });

        it("forwards an explicit communityUnreadCount to the sidebar", () => {
            render(
                <DashboardShell communityUnreadCount={42}>
                    <div />
                </DashboardShell>
            );
            expect(screen.getByTestId("sidebar").dataset.community).toBe("42");
        });

        it("forwards communityUnreadCount alongside role", () => {
            render(
                <DashboardShell role="admin" communityUnreadCount={7}>
                    <div />
                </DashboardShell>
            );
            expect(sidebarPropCapture).toHaveBeenCalledWith(
                expect.objectContaining({
                    role: "admin",
                    communityUnreadCount: 7,
                })
            );
        });
    });
});