// reactions-picker.test.tsx
import React from "react";
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactionsPicker, FullEmojiPicker } from "@/components/reactions-picker";
import {
    ReactionIcon,
    LikeIcon,
    CelebrateIcon,
    LoveIcon,
    InsightfulIcon,
    FunnyIcon,
    SupportIcon,
    WowIcon,
    REACTION_ICONS,
    REACTION_COLORS,
} from "@/components/reaction-icons";

beforeAll(() => {
    Element.prototype.scrollTo = jest.fn();
});

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        // Return an empty-array string instead of null so callers that
        // pass the result straight to JSON.parse never receive null.
        getItem:    jest.fn((k: string): string => store[k] ?? "[]"),
        setItem:    jest.fn((k: string, v: string) => { store[k] = v; }),
        removeItem: jest.fn((k: string) => { delete store[k]; }),
        clear:      jest.fn(() => { store = {}; }),
    };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

function getEmojiGridButtons(): HTMLElement[] {
    return screen
        .getAllByRole("button")
        .filter((b) => !b.title && /\p{Emoji}/u.test(b.textContent ?? ""));
}

describe("ReactionIcon and individual icon components", () => {
    describe("individual icon exports", () => {
        // These icons now render as an accessible <svg role="img" aria-label="...">
        // with a colored circle behind a white glyph, rather than a plain emoji span.

        it("LikeIcon renders an accessible svg icon", () => {
            render(<LikeIcon />);
            const icon = screen.getByRole("img", { name: "Like" });
            expect(icon.tagName.toLowerCase()).toBe("svg");
        });

        it("CelebrateIcon renders an accessible svg icon", () => {
            render(<CelebrateIcon />);
            expect(screen.getByRole("img", { name: "Celebrate" })).toBeInTheDocument();
        });

        it("LoveIcon renders an accessible svg icon", () => {
            render(<LoveIcon />);
            expect(screen.getByRole("img", { name: "Love" })).toBeInTheDocument();
        });

        it("InsightfulIcon renders an accessible svg icon", () => {
            render(<InsightfulIcon />);
            expect(screen.getByRole("img", { name: "Insightful" })).toBeInTheDocument();
        });

        it("FunnyIcon renders an accessible svg icon", () => {
            render(<FunnyIcon />);
            expect(screen.getByRole("img", { name: "Funny" })).toBeInTheDocument();
        });

        it("SupportIcon renders an accessible svg icon", () => {
            render(<SupportIcon />);
            expect(screen.getByRole("img", { name: "Support" })).toBeInTheDocument();
        });

        it("WowIcon renders an accessible svg icon", () => {
            render(<WowIcon />);
            expect(screen.getByRole("img", { name: "Wow" })).toBeInTheDocument();
        });

        it("each icon's background circle uses its designated muted color", () => {
            render(
                <div>
                    <LikeIcon />
                    <CelebrateIcon />
                    <LoveIcon />
                    <InsightfulIcon />
                    <FunnyIcon />
                    <SupportIcon />
                    <WowIcon />
                </div>,
            );
            (Object.keys(REACTION_ICONS) as (keyof typeof REACTION_ICONS)[]).forEach((type) => {
                const icon = screen.getByRole("img", { name: type });
                const bgCircle = icon.querySelector("circle");
                expect(bgCircle).toHaveAttribute("fill", REACTION_COLORS[type]);
            });
        });

        it("applies custom size to the svg width/height", () => {
            render(<LikeIcon size={40} />);
            const icon = screen.getByRole("img", { name: "Like" });
            expect(icon).toHaveAttribute("width", "40");
            expect(icon).toHaveAttribute("height", "40");
        });

        it("defaults to size 24 when not specified", () => {
            render(<LoveIcon />);
            const icon = screen.getByRole("img", { name: "Love" });
            expect(icon).toHaveAttribute("width", "24");
            expect(icon).toHaveAttribute("height", "24");
        });

        it("applies custom className to the svg element", () => {
            render(<WowIcon className="custom-icon" />);
            expect(screen.getByRole("img", { name: "Wow" })).toHaveClass("custom-icon");
        });
    });

    describe("REACTION_ICONS map", () => {
        it("contains an entry for every ReactionType", () => {
            expect(Object.keys(REACTION_ICONS)).toEqual([
                "Like", "Celebrate", "Love", "Insightful", "Funny", "Support", "Wow",
            ]);
        });

        it("maps Like to LikeIcon component", () => {
            expect(REACTION_ICONS.Like).toBe(LikeIcon);
        });
    });

    describe("ReactionIcon wrapper", () => {
        it("renders the correct icon for a given type", () => {
            render(<ReactionIcon type="Funny" />);
            expect(screen.getByRole("img", { name: "Funny" })).toBeInTheDocument();
        });

        it("passes size down to the underlying svg icon", () => {
            render(<ReactionIcon type="Love" size={32} />);
            expect(screen.getByRole("img", { name: "Love" })).toHaveAttribute("width", "32");
        });

        it("applies className to wrapper span", () => {
            const { container } = render(<ReactionIcon type="Like" className="wrapper-class" />);
            expect(container.querySelector(".wrapper-class")).toBeInTheDocument();
        });

        it("applies style prop to wrapper span", () => {
            const { container } = render(
                <ReactionIcon type="Like" style={{ opacity: 0.5 }} />,
            );
            const span = container.querySelector("span");
            expect(span).toHaveStyle({ opacity: "0.5" });
        });

        it("renders fallback when type does not exist in REACTION_ICONS", () => {
            // @ts-expect-error testing invalid type for fallback coverage
            render(<ReactionIcon type="Nonexistent" />);
            expect(screen.getByText("❓")).toBeInTheDocument();
        });
    });
});

describe("ReactionsPicker", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
        jest.useRealTimers();
    });

    describe("initial render", () => {
        it("renders the Like button by default", () => {
            render(<ReactionsPicker postId="p1" />);
            expect(screen.getByRole("button", { name: /like/i })).toBeInTheDocument();
        });

        it("shows reaction count when initialCount > 0", () => {
            render(<ReactionsPicker postId="p1" initialCount={7} />);
            expect(screen.getByText("7")).toBeInTheDocument();
        });

        it("does not show count when initialCount is 0", () => {
            render(<ReactionsPicker postId="p1" initialCount={0} />);
            expect(screen.queryByText("0")).not.toBeInTheDocument();
        });

        it("does not show the emoji picker button by default", () => {
            render(<ReactionsPicker postId="p1" />);
            expect(screen.getAllByRole("button")).toHaveLength(1);
        });

        it("shows the emoji picker toggle button when showEmojiPicker is true", () => {
            render(<ReactionsPicker postId="p1" showEmojiPicker />);
            expect(screen.getByTitle("Emoji")).toBeInTheDocument();
        });
    });

    describe("main button click — toggle Like", () => {
        it("calls onReact with postId and 'Like' on first click", async () => {
            const onReact = jest.fn();
            const user = userEvent.setup();
            render(<ReactionsPicker postId="p1" onReact={onReact} />);
            await user.click(screen.getByRole("button", { name: /like/i }));
            expect(onReact).toHaveBeenCalledWith("p1", "Like");
        });

        it("increments count when no reaction was active", async () => {
            const user = userEvent.setup();
            render(<ReactionsPicker postId="p1" initialCount={3} />);
            await user.click(screen.getByRole("button", { name: /like/i }));
            expect(screen.getByText("4")).toBeInTheDocument();
        });

        it("decrements count when the same reaction is toggled off", async () => {
            const user = userEvent.setup();
            render(<ReactionsPicker postId="p1" initialReaction="Like" initialCount={5} />);
            await user.click(screen.getByRole("button"));
            expect(screen.getByText("4")).toBeInTheDocument();
        });

        it("count does not go below zero", async () => {
            const user = userEvent.setup();
            render(<ReactionsPicker postId="p1" initialReaction="Like" initialCount={0} />);
            await user.click(screen.getByRole("button"));
            expect(screen.queryByText("-1")).not.toBeInTheDocument();
        });
    });

    describe("quick reaction picker", () => {
        it("shows the quick picker on mouse enter after delay", () => {
            jest.useFakeTimers();
            render(<ReactionsPicker postId="p1" />);
            const btn = screen.getByRole("button", { name: /like/i });

            act(() => { fireEvent.mouseEnter(btn); });
            expect(screen.queryByTitle("Like")).not.toBeInTheDocument();

            act(() => { jest.advanceTimersByTime(400); });
            expect(screen.getByTitle("Like")).toBeInTheDocument();
            jest.useRealTimers();
        });

        it("hides quick picker on mouse leave after delay", () => {
            jest.useFakeTimers();
            render(<ReactionsPicker postId="p1" />);
            const btn = screen.getByRole("button", { name: /like/i });

            act(() => {
                fireEvent.mouseEnter(btn);
                jest.advanceTimersByTime(400);
            });
            expect(screen.getByTitle("Like")).toBeInTheDocument();

            act(() => {
                fireEvent.mouseLeave(btn);
                jest.advanceTimersByTime(300);
            });
            expect(screen.queryByTitle("Like")).not.toBeInTheDocument();
            jest.useRealTimers();
        });

        it("selecting a quick reaction calls onReact", () => {
            jest.useFakeTimers();
            const onReact = jest.fn();
            render(<ReactionsPicker postId="p1" onReact={onReact} />);
            const btn = screen.getByRole("button", { name: /like/i });

            act(() => {
                fireEvent.mouseEnter(btn);
                jest.advanceTimersByTime(400);
            });

            const loveBtn = screen.getByTitle("Love");
            act(() => { fireEvent.click(loveBtn); });
            expect(onReact).toHaveBeenCalledWith("p1", "Love");
            jest.useRealTimers();
        });

        it("increments count when picking a new quick reaction", () => {
            jest.useFakeTimers();
            render(<ReactionsPicker postId="p1" initialCount={2} />);
            const btn = screen.getByRole("button", { name: /like/i });

            act(() => {
                fireEvent.mouseEnter(btn);
                jest.advanceTimersByTime(400);
            });

            act(() => { fireEvent.click(screen.getByTitle("Love")); });
            expect(screen.getByText("3")).toBeInTheDocument();
            jest.useRealTimers();
        });

        it("toggling the same quick reaction decrements count", () => {
            jest.useFakeTimers();
            render(
                <ReactionsPicker postId="p1" initialReaction="Love" initialCount={3} />,
            );
            const btn = screen.getAllByRole("button")[0];

            act(() => {
                fireEvent.mouseEnter(btn);
                jest.advanceTimersByTime(400);
            });

            act(() => { fireEvent.click(screen.getByTitle("Love")); });
            expect(screen.getByText("2")).toBeInTheDocument();
            jest.useRealTimers();
        });

        it("picker stays open when mouse enters the picker itself", () => {
            jest.useFakeTimers();
            render(<ReactionsPicker postId="p1" />);
            const btn = screen.getByRole("button", { name: /like/i });

            act(() => {
                fireEvent.mouseEnter(btn);
                jest.advanceTimersByTime(400);
            });
            expect(screen.getByTitle("Like")).toBeInTheDocument();

            act(() => { fireEvent.mouseLeave(btn); });
            const picker = screen.getByTitle("Like").closest("div")!;
            act(() => { fireEvent.mouseEnter(picker); });

            act(() => { jest.advanceTimersByTime(500); });
            expect(screen.getByTitle("Like")).toBeInTheDocument();
            jest.useRealTimers();
        });
    });

    describe("prop sync — initialReaction and initialCount updates", () => {
        it("updates selected reaction when initialReaction prop changes", () => {
            const { rerender } = render(
                <ReactionsPicker postId="p1" initialReaction={undefined} initialCount={0} />,
            );
            rerender(
                <ReactionsPicker postId="p1" initialReaction="Love" initialCount={1} />,
            );
            expect(screen.getByText("1")).toBeInTheDocument();
        });

        it("does not re-sync when prop value has not changed", () => {
            const { rerender } = render(<ReactionsPicker postId="p1" initialCount={5} />);
            rerender(<ReactionsPicker postId="p1" initialCount={5} />);
            expect(screen.getByText("5")).toBeInTheDocument();
        });
    });

    describe("emoji picker toggle", () => {
        it("opens FullEmojiPicker when emoji button is clicked", async () => {
            const user = userEvent.setup();
            render(<ReactionsPicker postId="p1" showEmojiPicker />);
            await user.click(screen.getByTitle("Emoji"));
            expect(screen.getByPlaceholderText("Search emoji")).toBeInTheDocument();
        });

        it("calls onEmojiSelect when an emoji grid button is clicked", async () => {
            const onEmojiSelect = jest.fn();
            const user = userEvent.setup();
            localStorageMock.getItem.mockReturnValue(JSON.stringify(["😀"]));
            render(
                <ReactionsPicker
                    postId="p1"
                    showEmojiPicker
                    onEmojiSelect={onEmojiSelect}
                />,
            );
            await user.click(screen.getByTitle("Emoji"));

            const gridButtons = getEmojiGridButtons();
            expect(gridButtons.length).toBeGreaterThan(0);
            await user.click(gridButtons[0]);
            expect(onEmojiSelect).toHaveBeenCalled();
        });

        it("closes FullEmojiPicker when the close button is clicked", async () => {
            const user = userEvent.setup();
            render(<ReactionsPicker postId="p1" showEmojiPicker />);
            await user.click(screen.getByTitle("Emoji"));
            expect(screen.getByPlaceholderText("Search emoji")).toBeInTheDocument();

            const closeBtn = screen.getAllByRole("button").find(
                (b) => b.querySelector("svg") && !b.title && !b.closest("[data-testid]"),
            );
            if (closeBtn) await user.click(closeBtn);
            await waitFor(() => {
                expect(
                    screen.queryByPlaceholderText("Search emoji"),
                ).not.toBeInTheDocument();
            });
        });
    });

    describe("outside click closes pickers", () => {
        it("closes quick picker when clicking outside", () => {
            jest.useFakeTimers();
            render(
                <div>
                    <ReactionsPicker postId="p1" />
                    <button data-testid="outside">Outside</button>
                </div>,
            );
            const btn = screen.getByRole("button", { name: /like/i });

            act(() => {
                fireEvent.mouseEnter(btn);
                jest.advanceTimersByTime(400);
            });
            expect(screen.getByTitle("Like")).toBeInTheDocument();

            act(() => { fireEvent.mouseDown(screen.getByTestId("outside")); });
            expect(screen.queryByTitle("Like")).not.toBeInTheDocument();
            jest.useRealTimers();
        });
    });
});

describe("FullEmojiPicker", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
    });

    it("renders the search input", () => {
        render(<FullEmojiPicker onSelect={jest.fn()} onClose={jest.fn()} />);
        expect(screen.getByPlaceholderText("Search emoji")).toBeInTheDocument();
    });

    it("renders category tabs", () => {
        render(<FullEmojiPicker onSelect={jest.fn()} onClose={jest.fn()} />);
        expect(screen.getByTitle("Recent")).toBeInTheDocument();
        expect(screen.getByTitle("Smileys & People")).toBeInTheDocument();
    });

    it("shows 'No recent emoji yet' when no recent emojis", () => {
        // Return an empty array so getRecentEmojis() yields []
        localStorageMock.getItem.mockReturnValue("[]");
        render(<FullEmojiPicker onSelect={jest.fn()} onClose={jest.fn()} />);
        expect(screen.getByText("No recent emoji yet")).toBeInTheDocument();
    });

    it("shows recent emojis when they exist in localStorage", () => {
        localStorageMock.getItem.mockReturnValue(JSON.stringify(["😀", "❤️"]));
        render(<FullEmojiPicker onSelect={jest.fn()} onClose={jest.fn()} />);
        const buttons = screen.getAllByRole("button");
        const texts = buttons.map((b) => b.textContent);
        expect(texts).toContain("😀");
    });

    it("calls onSelect when a grid emoji button is clicked", async () => {
        const onSelect = jest.fn();
        const user = userEvent.setup();
        localStorageMock.getItem.mockReturnValue(JSON.stringify(["😀"]));
        render(<FullEmojiPicker onSelect={onSelect} onClose={jest.fn()} />);

        const gridButtons = getEmojiGridButtons();
        expect(gridButtons.length).toBeGreaterThan(0);
        await user.click(gridButtons[0]);
        expect(onSelect).toHaveBeenCalled();
    });

    it("filters emojis when searching", async () => {
        const user = userEvent.setup();
        localStorageMock.getItem.mockReturnValue("[]");
        render(<FullEmojiPicker onSelect={jest.fn()} onClose={jest.fn()} />);
        await user.type(screen.getByPlaceholderText("Search emoji"), "😀");
        expect(screen.getByText("Search Results")).toBeInTheDocument();
    });

    it("shows 'No results' message when search has no matches", async () => {
        const user = userEvent.setup();
        localStorageMock.getItem.mockReturnValue("[]");
        render(<FullEmojiPicker onSelect={jest.fn()} onClose={jest.fn()} />);
        await user.type(
            screen.getByPlaceholderText("Search emoji"),
            "xyznotanemoji",
        );
        expect(screen.getByText(/No results for/i)).toBeInTheDocument();
    });

    it("clears the search when the clear button is clicked", async () => {
        const user = userEvent.setup();
        localStorageMock.getItem.mockReturnValue("[]");
        render(<FullEmojiPicker onSelect={jest.fn()} onClose={jest.fn()} />);
        const input = screen.getByPlaceholderText("Search emoji") as HTMLInputElement;
        await user.type(input, "hello");
        expect(input.value).toBe("hello");

        const clearBtn = screen.getAllByRole("button").find(
            (b) => b.querySelector("svg") && !b.title,
        );
        if (clearBtn) await user.click(clearBtn);
        expect(input.value).toBe("");
    });

    it("calls onClose when the X button is clicked with empty search", async () => {
        const onClose = jest.fn();
        const user = userEvent.setup();
        localStorageMock.getItem.mockReturnValue("[]");
        render(<FullEmojiPicker onSelect={jest.fn()} onClose={onClose} />);

        const closeBtn = screen.getAllByRole("button").find(
            (b) => b.querySelector("svg") && !b.title,
        );
        if (closeBtn) await user.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it("switches active tab when a category is clicked", async () => {
        const user = userEvent.setup();
        localStorageMock.getItem.mockReturnValue("[]");
        render(<FullEmojiPicker onSelect={jest.fn()} onClose={jest.fn()} />);
        const animalsTab = screen.getByTitle("Animals & Nature");
        await user.click(animalsTab);
        expect(animalsTab.className).toContain("border-green-500");
    });

    it("saves emoji to recent on select", async () => {
        const onSelect = jest.fn();
        const user = userEvent.setup();
        localStorageMock.getItem.mockReturnValue(JSON.stringify(["😀"]));
        render(<FullEmojiPicker onSelect={onSelect} onClose={jest.fn()} />);

        const gridButtons = getEmojiGridButtons();
        expect(gridButtons.length).toBeGreaterThan(0);
        await user.click(gridButtons[0]);
        expect(localStorageMock.setItem).toHaveBeenCalled();
    });
});