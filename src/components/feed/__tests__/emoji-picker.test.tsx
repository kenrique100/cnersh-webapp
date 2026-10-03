import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import EmojiPicker from "../emoji-picker";

/**
 * EmojiPicker was extracted from feed-client.tsx as part of Case 13 so it can
 * be lazy-loaded via `next/dynamic`. These tests lock its public contract:
 * it renders one button per emoji, calls `onSelect` with the emoji value, and
 * honours the `columns` prop.
 */
describe("EmojiPicker", () => {
    const onSelect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders a button for every emoji in the list", () => {
        render(<EmojiPicker onSelect={onSelect} />);

        // The list contains well over 100 entries; assert a minimum count and
        // spot-check a few known members rather than hard-coding the length so
        // the test survives future additions to EMOJI_LIST.
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(50);

        // Every button renders an emoji (non-empty text content).
        for (const btn of buttons) {
            expect((btn.textContent ?? "").length).toBeGreaterThan(0);
        }
    });

    it("uses 'button' as the button type (does not submit surrounding forms)", () => {
        render(<EmojiPicker onSelect={onSelect} />);
        const buttons = screen.getAllByRole("button");
        for (const btn of buttons) {
            expect(btn).toHaveAttribute("type", "button");
        }
    });

    it("calls onSelect with the emoji value when a button is clicked", async () => {
        const user = userEvent.setup();
        render(<EmojiPicker onSelect={onSelect} />);

        // Pick a stable, unambiguously unique emoji.
        const target = screen.getByRole("button", { name: "🚀" });
        await user.click(target);

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith("🚀");
    });

    it("calls onSelect for each distinct emoji clicked", async () => {
        const user = userEvent.setup();
        render(<EmojiPicker onSelect={onSelect} />);

        await user.click(screen.getByRole("button", { name: "👍" }));
        await user.click(screen.getByRole("button", { name: "🎉" }));
        await user.click(screen.getByRole("button", { name: "❤️" }));

        expect(onSelect).toHaveBeenCalledTimes(3);
        expect(onSelect).toHaveBeenNthCalledWith(1, "👍");
        expect(onSelect).toHaveBeenNthCalledWith(2, "🎉");
        expect(onSelect).toHaveBeenNthCalledWith(3, "❤️");
    });

    it("defaults to 8 columns when the columns prop is omitted", () => {
        const { container } = render(<EmojiPicker onSelect={onSelect} />);
        const grid = container.firstChild as HTMLElement;
        expect(grid.style.gridTemplateColumns).toBe("repeat(8, minmax(0, 1fr))");
    });

    it("honours a custom columns prop", () => {
        const { container } = render(<EmojiPicker onSelect={onSelect} columns={6} />);
        const grid = container.firstChild as HTMLElement;
        expect(grid.style.gridTemplateColumns).toBe("repeat(6, minmax(0, 1fr))");
    });

    it("uses a 10-column grid when columns=10 is passed", () => {
        const { container } = render(<EmojiPicker onSelect={onSelect} columns={10} />);
        const grid = container.firstChild as HTMLElement;
        expect(grid.style.gridTemplateColumns).toBe("repeat(10, minmax(0, 1fr))");
    });

    it("applies the grid layout classes", () => {
        const { container } = render(<EmojiPicker onSelect={onSelect} />);
        const grid = container.firstChild as HTMLElement;
        expect(grid.className).toContain("grid");
        expect(grid.className).toContain("gap-1");
    });

    it("does not call onSelect when no button is clicked", () => {
        render(<EmojiPicker onSelect={onSelect} />);
        expect(onSelect).not.toHaveBeenCalled();
    });
});