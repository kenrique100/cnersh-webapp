import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
    LikeIcon,
    CelebrateIcon,
    LoveIcon,
    InsightfulIcon,
    CuriousIcon,
    FunnyIcon,
    SupportIcon,
    ReactionIcon,
    REACTION_ICONS,
    REACTION_COLORS,
} from "../reaction-icons";

describe("ReactionIcons", () => {
    afterEach(async () => {
        cleanup();
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    });

    it("renders an accessible SVG circle icon for each reaction", () => {
        const { getByRole } = render(
            <div>
                <LikeIcon />
                <CelebrateIcon />
                <LoveIcon />
                <InsightfulIcon />
                <CuriousIcon />
                <FunnyIcon />
                <SupportIcon />
            </div>
        );

        (["Like", "Celebrate", "Love", "Insightful", "Curious", "Funny", "Support"] as const).forEach(
            (label) => {
                const icon = getByRole("img", { name: label });
                expect(icon.tagName.toLowerCase()).toBe("svg");
            }
        );
    });

    it("fills each icon's background circle with its designated color", () => {
        const { getByRole } = render(
            <div>
                <LikeIcon />
                <CelebrateIcon />
                <LoveIcon />
                <InsightfulIcon />
                <CuriousIcon />
                <FunnyIcon />
                <SupportIcon />
            </div>
        );

        (Object.keys(REACTION_ICONS) as (keyof typeof REACTION_ICONS)[]).forEach((type) => {
            const icon = getByRole("img", { name: type });
            const bgCircle = icon.querySelector("circle");
            expect(bgCircle).toHaveAttribute("fill", REACTION_COLORS[type]);
        });
    });

    it("applies custom size to the svg width/height", () => {
        const { getByRole } = render(<LikeIcon size={48} />);
        const el = getByRole("img", { name: "Like" });
        expect(el).toHaveAttribute("width", "48");
        expect(el).toHaveAttribute("height", "48");
    });

    it("defaults to size 24 when not specified", () => {
        const { getByRole } = render(<LoveIcon />);
        const el = getByRole("img", { name: "Love" });
        expect(el).toHaveAttribute("width", "24");
        expect(el).toHaveAttribute("height", "24");
    });

    it("applies custom className to the svg element", () => {
        const { getByRole } = render(<CuriousIcon className="test-class" />);
        expect(getByRole("img", { name: "Curious" })).toHaveClass("test-class");
    });

    it("renders all reaction types through the ReactionIcon wrapper", () => {
        const { getByRole } = render(
            <div>
                <ReactionIcon type="Like" />
                <ReactionIcon type="Celebrate" />
                <ReactionIcon type="Love" />
                <ReactionIcon type="Insightful" />
                <ReactionIcon type="Curious" />
                <ReactionIcon type="Funny" />
                <ReactionIcon type="Support" />
            </div>
        );

        (["Like", "Celebrate", "Love", "Insightful", "Curious", "Funny", "Support"] as const).forEach(
            (label) => {
                expect(getByRole("img", { name: label })).toBeInTheDocument();
            }
        );
    });

    it("wraps the icon in a span and forwards size/className/style", () => {
        const { container, getByRole } = render(
            <ReactionIcon type="Love" size={32} className="wrapper-class" style={{ opacity: 0.5 }} />
        );
        const wrapper = container.querySelector(".wrapper-class");
        expect(wrapper).toBeInTheDocument();
        expect(wrapper).toHaveStyle({ opacity: "0.5" });
        expect(getByRole("img", { name: "Love" })).toHaveAttribute("width", "32");
    });

    it("renders a fallback glyph when type does not exist in REACTION_ICONS", () => {
        const { getByText } = render(
            // @ts-expect-error testing invalid type for fallback coverage
            <ReactionIcon type="Nonexistent" />
        );
        expect(getByText("❓")).toBeInTheDocument();
    });

    it("contains all reaction mappings", () => {
        expect(REACTION_ICONS).toHaveProperty("Like");
        expect(REACTION_ICONS).toHaveProperty("Celebrate");
        expect(REACTION_ICONS).toHaveProperty("Love");
        expect(REACTION_ICONS).toHaveProperty("Insightful");
        expect(REACTION_ICONS).toHaveProperty("Curious");
        expect(REACTION_ICONS).toHaveProperty("Funny");
        expect(REACTION_ICONS).toHaveProperty("Support");
    });

    it("maps each ReactionType to its matching icon component", () => {
        expect(REACTION_ICONS.Like).toBe(LikeIcon);
        expect(REACTION_ICONS.Celebrate).toBe(CelebrateIcon);
        expect(REACTION_ICONS.Love).toBe(LoveIcon);
        expect(REACTION_ICONS.Insightful).toBe(InsightfulIcon);
        expect(REACTION_ICONS.Curious).toBe(CuriousIcon);
        expect(REACTION_ICONS.Funny).toBe(FunnyIcon);
        expect(REACTION_ICONS.Support).toBe(SupportIcon);
    });
});