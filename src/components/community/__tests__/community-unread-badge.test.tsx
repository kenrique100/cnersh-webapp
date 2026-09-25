import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CommunityUnreadBadge, {
    formatBadgeCount,
} from "@/components/community/community-unread-badge";

describe("formatBadgeCount", () => {
    it.each([
        [1, "1"],
        [27, "27"],
        [99, "99"],
        [100, "99+"],
        [1000, "99+"],
        [100_000_000, "99+"],
    ])("formats %i as %s", (input, expected) => {
        expect(formatBadgeCount(input)).toBe(expected);
    });
});

describe("CommunityUnreadBadge", () => {
    it("renders nothing when count is 0", () => {
        const { container } = render(<CommunityUnreadBadge count={0} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders nothing when count is negative", () => {
        const { container } = render(<CommunityUnreadBadge count={-5} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders the exact count up to 99", () => {
        render(<CommunityUnreadBadge count={27} />);
        expect(screen.getByText("27")).toBeInTheDocument();
    });

    it("renders '99+' for counts above 99", () => {
        render(<CommunityUnreadBadge count={1234} />);
        expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("exposes an accessible label with the exact count", () => {
        render(<CommunityUnreadBadge count={1234} />);
        expect(
            screen.getByRole("status", { name: "1234 unread community items" })
        ).toBeInTheDocument();
    });

    it("renders a dot (no numeric text) in collapsed mode", () => {
        const { container } = render(
            <CommunityUnreadBadge count={42} collapsed />
        );
        const dot = screen.getByRole("status", { name: "42 unread community items" });
        expect(dot).toBeInTheDocument();
        expect(dot).toHaveTextContent("");
        expect(container.querySelector("span span")).toBeNull();
    });

    it("accepts an extra className", () => {
        render(<CommunityUnreadBadge count={5} className="custom-class" />);
        const badge = screen.getByText("5");
        expect(badge).toHaveClass("custom-class");
    });
});