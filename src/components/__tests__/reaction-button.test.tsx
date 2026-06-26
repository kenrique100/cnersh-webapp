import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ReactionButton, ReactionPicker } from "../reaction-button";

describe("ReactionButton", () => {
    const mockReaction = {
        label: "Like",
        color: "#0A66C2",
    };

    const mockOnClick = jest.fn();

    beforeEach(() => {
        mockOnClick.mockClear();
    });

    // Clean up micro/macro task queues between iterations
    afterEach(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    describe("Rendering", () => {
        it("renders button with reaction label", () => {
            render(<ReactionButton reaction={mockReaction} onClick={mockOnClick} />);
            expect(screen.getByRole("button")).toBeInTheDocument();
        });

        it("renders with custom className", () => {
            const { container } = render(
                <ReactionButton
                    reaction={mockReaction}
                    onClick={mockOnClick}
                    className="custom-class"
                />
            );
            const button = container.querySelector("button");
            expect(button).toHaveClass("custom-class");
        });

        it("renders with active state", () => {
            const { container } = render(
                <ReactionButton reaction={mockReaction} onClick={mockOnClick} isActive={true} />
            );
            const button = container.querySelector("button");
            expect(button).toHaveClass("bg-blue-50");
        });

        it("renders without active state by default", () => {
            const { container } = render(
                <ReactionButton reaction={mockReaction} onClick={mockOnClick} />
            );
            const button = container.querySelector("button");
            expect(button).not.toHaveClass("bg-blue-50");
        });
    });

    describe("Interaction", () => {
        it("calls onClick when clicked", async () => {
            const user = userEvent.setup();
            render(<ReactionButton reaction={mockReaction} onClick={mockOnClick} />);
            const button = screen.getByRole("button");
            await user.click(button);
            expect(mockOnClick).toHaveBeenCalledTimes(1);
        });

        it("triggers animation on click", async () => {
            jest.useFakeTimers();
            render(<ReactionButton reaction={mockReaction} onClick={mockOnClick} />);
            const button = screen.getByRole("button");

            act(() => {
                fireEvent.click(button);
            });

            expect(mockOnClick).toHaveBeenCalled();

            act(() => {
                jest.runAllTimers();
            });

            jest.useRealTimers();
            // Critical macro-task flush right after swapping back to real timers
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        it("handles multiple rapid clicks", async () => {
            const user = userEvent.setup();
            render(<ReactionButton reaction={mockReaction} onClick={mockOnClick} />);
            const button = screen.getByRole("button");

            await user.click(button);
            await user.click(button);
            await user.click(button);

            expect(mockOnClick).toHaveBeenCalledTimes(3);
        });
    });

    describe("Accessibility", () => {
        it("has button role", () => {
            render(<ReactionButton reaction={mockReaction} onClick={mockOnClick} />);
            expect(screen.getByRole("button")).toBeInTheDocument();
        });

        it("is keyboard accessible", async () => {
            const _user = userEvent.setup();
            render(<ReactionButton reaction={mockReaction} onClick={mockOnClick} />);
            const button = screen.getByRole("button");

            button.focus();
            expect(button).toHaveFocus();

            act(() => {
                fireEvent.keyDown(button, { key: "Enter" });
            });

            await waitFor(() => {
                expect(mockOnClick).toHaveBeenCalled();
            });
        });
    });

    describe("Hover Effects", () => {
        it("shows label on hover", () => {
            const { container } = render(
                <ReactionButton reaction={mockReaction} onClick={mockOnClick} />
            );
            const label = container.querySelector(".opacity-0");
            expect(label).toBeInTheDocument();
            expect(label).toHaveClass("group-hover:opacity-100");
        });

        it("applies hover scale transform", () => {
            const { container } = render(
                <ReactionButton reaction={mockReaction} onClick={mockOnClick} />
            );
            const button = container.querySelector("button");
            expect(button).toHaveClass("hover:scale-110");
        });

        it("applies hover shadow", () => {
            const { container } = render(
                <ReactionButton reaction={mockReaction} onClick={mockOnClick} />
            );
            const button = container.querySelector("button");
            expect(button).toHaveClass("hover:shadow-lg");
        });
    });
});

describe("ReactionPicker", () => {
    const mockReactions = [
        { label: "Like", color: "#0A66C2" },
        { label: "Celebrate", color: "#57C27D" },
        { label: "Love", color: "#F5666C" },
    ] as const;

    const mockOnReaction = jest.fn();

    beforeEach(() => {
        mockOnReaction.mockClear();
    });

    afterEach(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    describe("Rendering", () => {
        it("renders all reaction buttons", () => {
            render(<ReactionPicker reactions={mockReactions} onReaction={mockOnReaction} />);
            const buttons = screen.getAllByRole("button");
            expect(buttons.length).toBe(3);
        });

        it("renders with custom className", () => {
            const { container } = render(
                <ReactionPicker
                    reactions={mockReactions}
                    onReaction={mockOnReaction}
                    className="custom-picker"
                />
            );
            const picker = container.firstChild;
            expect(picker).toHaveClass("custom-picker");
        });

        it("highlights user's current reaction", () => {
            const { container } = render(
                <ReactionPicker
                    reactions={mockReactions}
                    onReaction={mockOnReaction}
                    userReaction="Like"
                />
            );
            const buttons = container.querySelectorAll("button");
            const likeButton = Array.from(buttons).find((btn) =>
                btn.className.includes("bg-blue-50")
            );
            expect(likeButton).toBeInTheDocument();
        });
    });

    describe("Interaction", () => {
        it("calls onReaction with correct label when reaction is clicked", async () => {
            const user = userEvent.setup();
            render(<ReactionPicker reactions={mockReactions} onReaction={mockOnReaction} />);
            const buttons = screen.getAllByRole("button");

            if (buttons[0]) {
                await user.click(buttons[0]);
                expect(mockOnReaction).toHaveBeenCalledWith("Like");
            }
        });

        it("handles clicking different reactions", async () => {
            const user = userEvent.setup();
            render(<ReactionPicker reactions={mockReactions} onReaction={mockOnReaction} />);
            const buttons = screen.getAllByRole("button");

            if (buttons[0] && buttons[1]) {
                await user.click(buttons[0]);
                expect(mockOnReaction).toHaveBeenCalledWith("Like");

                await user.click(buttons[1]);
                expect(mockOnReaction).toHaveBeenCalledWith("Celebrate");
            }

            expect(mockOnReaction).toHaveBeenCalledTimes(2);
        });
    });

    describe("Layout", () => {
        it("has proper container styling", () => {
            const { container } = render(
                <ReactionPicker reactions={mockReactions} onReaction={mockOnReaction} />
            );
            const picker = container.firstChild;
            expect(picker).toHaveClass("flex");
            expect(picker).toHaveClass("items-center");
            expect(picker).toHaveClass("bg-white");
            expect(picker).toHaveClass("rounded-lg");
            expect(picker).toHaveClass("shadow-lg");
        });
    });

    describe("Edge Cases", () => {
        it("handles empty reactions array", () => {
            const { container } = render(
                <ReactionPicker reactions={[]} onReaction={mockOnReaction} />
            );
            const buttons = container.querySelectorAll("button");
            expect(buttons.length).toBe(0);
        });

        it("handles single reaction", () => {
            const singleReaction = [{ label: "Like", color: "#0A66C2" }] as const;
            render(<ReactionPicker reactions={singleReaction} onReaction={mockOnReaction} />);
            const buttons = screen.getAllByRole("button");
            expect(buttons.length).toBe(1);
        });

        it("handles undefined userReaction", () => {
            const { container } = render(
                <ReactionPicker reactions={mockReactions} onReaction={mockOnReaction} />
            );
            const buttons = container.querySelectorAll("button");
            buttons.forEach((button) => {
                expect(button).not.toHaveClass("bg-blue-50");
            });
        });

        it("handles null userReaction", () => {
            const { container } = render(
                <ReactionPicker
                    reactions={mockReactions}
                    onReaction={mockOnReaction}
                    userReaction={null}
                />
            );
            const buttons = container.querySelectorAll("button");
            buttons.forEach((button) => {
                expect(button).not.toHaveClass("bg-blue-50");
            });
        });
    });
});