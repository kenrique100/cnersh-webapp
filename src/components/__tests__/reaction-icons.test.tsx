import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
    LikeIcon,
    CelebrateIcon,
    LoveIcon,
    InsightfulIcon,
    FunnyIcon,
    SupportIcon,
    ReactionIcon,
    REACTION_ICONS,
} from "../reaction-icons";

describe("ReactionIcons", () => {
    describe("Individual Icons", () => {
        it("renders LikeIcon with default size", () => {
            const { container } = render(<LikeIcon />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
            expect(svg).toHaveAttribute("width", "24");
            expect(svg).toHaveAttribute("height", "24");
        });

        it("renders LikeIcon with custom size", () => {
            const { container } = render(<LikeIcon size={32} />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveAttribute("width", "32");
            expect(svg).toHaveAttribute("height", "32");
        });

        it("renders LikeIcon with custom className", () => {
            const { container } = render(<LikeIcon className="custom-class" />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveClass("custom-class");
        });

        it("renders CelebrateIcon", () => {
            const { container } = render(<CelebrateIcon />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("renders LoveIcon", () => {
            const { container } = render(<LoveIcon />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("renders InsightfulIcon", () => {
            const { container } = render(<InsightfulIcon />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("renders FunnyIcon", () => {
            const { container } = render(<FunnyIcon />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("renders SupportIcon", () => {
            const { container } = render(<SupportIcon />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });
    });

    describe("ReactionIcon Component", () => {
        it("renders Like reaction", () => {
            const { container } = render(<ReactionIcon type="Like" />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("renders Celebrate reaction", () => {
            const { container } = render(<ReactionIcon type="Celebrate" />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("renders Love reaction", () => {
            const { container } = render(<ReactionIcon type="Love" />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("renders Insightful reaction", () => {
            const { container } = render(<ReactionIcon type="Insightful" />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("renders Funny reaction", () => {
            const { container } = render(<ReactionIcon type="Funny" />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("renders Support reaction", () => {
            const { container } = render(<ReactionIcon type="Support" />);
            const svg = container.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("applies custom size to ReactionIcon", () => {
            const { container } = render(<ReactionIcon type="Like" size={48} />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveAttribute("width", "48");
            expect(svg).toHaveAttribute("height", "48");
        });

        it("applies custom className to ReactionIcon", () => {
            const { container } = render(<ReactionIcon type="Like" className="test-class" />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveClass("test-class");
        });
    });

    describe("REACTION_ICONS mapping", () => {
        it("contains all reaction types", () => {
            expect(REACTION_ICONS).toHaveProperty("Like");
            expect(REACTION_ICONS).toHaveProperty("Celebrate");
            expect(REACTION_ICONS).toHaveProperty("Love");
            expect(REACTION_ICONS).toHaveProperty("Insightful");
            expect(REACTION_ICONS).toHaveProperty("Funny");
            expect(REACTION_ICONS).toHaveProperty("Support");
        });

        it("maps to correct components", () => {
            expect(REACTION_ICONS.Like).toBe(LikeIcon);
            expect(REACTION_ICONS.Celebrate).toBe(CelebrateIcon);
            expect(REACTION_ICONS.Love).toBe(LoveIcon);
            expect(REACTION_ICONS.Insightful).toBe(InsightfulIcon);
            expect(REACTION_ICONS.Funny).toBe(FunnyIcon);
            expect(REACTION_ICONS.Support).toBe(SupportIcon);
        });
    });

    describe("SVG Structure", () => {
        it("LikeIcon contains gradient definition", () => {
            const { container } = render(<LikeIcon />);
            const gradient = container.querySelector("#likeGradient");
            expect(gradient).toBeInTheDocument();
        });

        it("LikeIcon contains shadow filter", () => {
            const { container } = render(<LikeIcon />);
            const shadow = container.querySelector("#likeShadow");
            expect(shadow).toBeInTheDocument();
        });

        it("CelebrateIcon contains gradient definition", () => {
            const { container } = render(<CelebrateIcon />);
            const gradient = container.querySelector("#celebrateGradient");
            expect(gradient).toBeInTheDocument();
        });

        it("all icons have proper viewBox", () => {
            const icons = [
                <LikeIcon key="like" />,
                <CelebrateIcon key="celebrate" />,
                <LoveIcon key="love" />,
                <InsightfulIcon key="insightful" />,
                <FunnyIcon key="funny" />,
                <SupportIcon key="support" />,
            ];

            icons.forEach((icon) => {
                const { container } = render(icon);
                const svg = container.querySelector("svg");
                expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
            });
        });
    });

    describe("Accessibility", () => {
        it("icons are presentational (no role needed as decorative)", () => {
            const { container } = render(<LikeIcon />);
            const svg = container.querySelector("svg");
            // SVG icons are decorative in this context, used alongside labels
            expect(svg).toBeInTheDocument();
        });

        it("parent components should provide aria-label", () => {
            // This test documents that parent components using these icons
            // should provide appropriate aria-labels for accessibility
            const { container } = render(
                <button aria-label="Like this post">
                    <LikeIcon />
                </button>
            );
            const button = container.querySelector("button");
            expect(button).toHaveAttribute("aria-label", "Like this post");
        });
    });
});
