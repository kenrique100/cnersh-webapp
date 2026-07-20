// src/components/__tests__/reactions-picker.test.tsx
import React from "react";
import {
    render,
    screen,
    fireEvent,
    act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReactionsPicker } from "@/components/reactions-picker";

// Mock the icon components – they are tested separately
jest.mock("@/components/reaction-icons", () => ({
    ...jest.requireActual("@/components/reaction-icons"),
    ReactionIcon: ({ type, size }: { type: string; size: number }) => (
        <span data-testid={`icon-${type}-${size}`}>{type}</span>
    ),
    REACTION_COLORS: {
        Like: "#0A66C2",
        Celebrate: "#17A34A",
        Support: "#5B7083",
        Love: "#F56B62",
        Insightful: "#F5B326",
        Funny: "#0284C7",
    },
}));

jest.mock("lucide-react", () => ({
    ThumbsUp: () => <span data-testid="thumbs-up" />,
}));

jest.mock("@/lib/utils", () => ({
    cn: (...args: string[]) => args.join(" "),
}));

describe("ReactionsPicker", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    describe("initial render", () => {
        it("shows the main Like button", () => {
            render(<ReactionsPicker postId="post1" />);
            expect(screen.getByRole("button", { name: /like/i })).toBeInTheDocument();
        });

        it("displays count when > 0", () => {
            render(<ReactionsPicker postId="post1" initialCount={7} />);
            expect(screen.getByText("7")).toBeInTheDocument();
        });

        it("does not show count when 0", () => {
            render(<ReactionsPicker postId="post1" initialCount={0} />);
            expect(screen.queryByText("0")).not.toBeInTheDocument();
        });

        it("shows selected reaction label and colour when active", () => {
            render(
                <ReactionsPicker
                    postId="post1"
                    initialReaction="Love"
                    initialCount={3}
                />
            );
            const btn = screen.getByRole("button");
            expect(btn).toHaveTextContent("Love");
            expect(btn).toHaveStyle({ color: "#F56B62" });
        });
    });

    describe("main button click – toggle Like", () => {
        it("activates Like when nothing was selected", () => {
            const onReact = jest.fn();
            render(<ReactionsPicker postId="post1" onReact={onReact} />);
            fireEvent.click(screen.getByRole("button"));
            expect(onReact).toHaveBeenCalledWith("post1", "Like");
            expect(screen.getByText("1")).toBeInTheDocument();
        });

        it("deselects when clicking the same reaction again", () => {
            const onReact = jest.fn();
            render(
                <ReactionsPicker
                    postId="post1"
                    initialReaction="Like"
                    initialCount={5}
                    onReact={onReact}
                />
            );
            fireEvent.click(screen.getByRole("button"));
            expect(onReact).toHaveBeenCalledWith("post1", null);
            expect(screen.getByText("4")).toBeInTheDocument();
        });

        it("prevents negative count after deselect", () => {
            const onReact = jest.fn();
            render(
                <ReactionsPicker
                    postId="post1"
                    initialReaction="Like"
                    initialCount={0}
                    onReact={onReact}
                />
            );
            fireEvent.click(screen.getByRole("button"));
            expect(onReact).toHaveBeenCalledWith("post1", null);
            expect(screen.queryByText("-1")).not.toBeInTheDocument();
        });
    });

    describe("quick reaction picker", () => {
        const hoverAndShow = (container: HTMLElement) => {
            fireEvent.mouseEnter(container);
            act(() => jest.advanceTimersByTime(400));
        };

        it("shows quick picker on hover after delay", () => {
            render(<ReactionsPicker postId="post1" />);
            const container = screen.getByRole("button").parentElement!;
            hoverAndShow(container);
            expect(screen.getByTitle("Celebrate")).toBeInTheDocument();
        });

        it("hides picker on mouse leave after delay", () => {
            render(<ReactionsPicker postId="post1" />);
            const container = screen.getByRole("button").parentElement!;
            hoverAndShow(container);
            expect(screen.getByTitle("Celebrate")).toBeInTheDocument();

            fireEvent.mouseLeave(container);
            act(() => jest.advanceTimersByTime(300));
            expect(screen.queryByTitle("Celebrate")).not.toBeInTheDocument();
        });

        it("picker stays open when mouse enters the picker itself", () => {
            render(<ReactionsPicker postId="post1" />);
            const container = screen.getByRole("button").parentElement!;
            hoverAndShow(container);

            const picker = screen.getByTitle("Celebrate").closest("div")!;
            fireEvent.mouseEnter(picker);
            act(() => jest.advanceTimersByTime(500));
            expect(screen.getByTitle("Celebrate")).toBeInTheDocument();
        });

        it("selecting a quick reaction calls onReact with that type", () => {
            const onReact = jest.fn();
            render(<ReactionsPicker postId="post1" onReact={onReact} />);
            const container = screen.getByRole("button").parentElement!;
            hoverAndShow(container);

            fireEvent.click(screen.getByTitle("Love"));
            expect(onReact).toHaveBeenCalledWith("post1", "Love");
        });

        it("increments count when selecting a new reaction", () => {
            render(<ReactionsPicker postId="post1" initialCount={2} />);
            const container = screen.getByRole("button").parentElement!;
            hoverAndShow(container);

            fireEvent.click(screen.getByTitle("Love"));
            expect(screen.getByText("3")).toBeInTheDocument();
        });

        it("toggles off when clicking the same quick reaction", () => {
            render(
                <ReactionsPicker
                    postId="post1"
                    initialReaction="Love"
                    initialCount={3}
                />
            );
            const container = screen.getAllByRole("button")[0].parentElement!;
            hoverAndShow(container);

            fireEvent.click(screen.getByTitle("Love"));
            expect(screen.getByText("2")).toBeInTheDocument();
        });

        it("closes quick picker on outside click", () => {
            render(
                <div>
                    <ReactionsPicker postId="post1" />
                    <button data-testid="outside">Outside</button>
                </div>
            );
            const container = screen.getByRole("button", { name: /like/i }).parentElement!;
            hoverAndShow(container);
            expect(screen.getByTitle("Celebrate")).toBeInTheDocument();

            fireEvent.mouseDown(screen.getByTestId("outside"));
            expect(screen.queryByTitle("Celebrate")).not.toBeInTheDocument();
        });
    });

    describe("prop sync", () => {
        it("updates selected reaction when initialReaction prop changes", () => {
            const { rerender } = render(
                <ReactionsPicker postId="post1" initialReaction={null} initialCount={0} />
            );
            rerender(
                <ReactionsPicker postId="post1" initialReaction="Love" initialCount={1} />
            );
            const btn = screen.getByRole("button");
            expect(btn).toHaveTextContent("Love");
            expect(screen.getByText("1")).toBeInTheDocument();
        });

        it("updates count when initialCount prop changes", () => {
            const { rerender } = render(
                <ReactionsPicker postId="post1" initialCount={0} />
            );
            rerender(<ReactionsPicker postId="post1" initialCount={5} />);
            expect(screen.getByText("5")).toBeInTheDocument();
        });
    });
});