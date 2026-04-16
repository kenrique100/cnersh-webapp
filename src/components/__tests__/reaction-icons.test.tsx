import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
    LikeIcon,
    CelebrateIcon,
    LoveIcon,
    InsightfulIcon,
    FunnyIcon,
    SupportIcon,
    WowIcon,
    ReactionIcon,
    REACTION_ICONS,
} from "../reaction-icons";

describe("ReactionIcons", () => {
    it("renders emoji-based icons", () => {
        const { getByText } = render(
            <div>
                <LikeIcon />
                <CelebrateIcon />
                <LoveIcon />
                <InsightfulIcon />
                <FunnyIcon />
                <SupportIcon />
                <WowIcon />
            </div>
        );
        expect(getByText("👍")).toBeInTheDocument();
        expect(getByText("🎉")).toBeInTheDocument();
        expect(getByText("❤️")).toBeInTheDocument();
        expect(getByText("💡")).toBeInTheDocument();
        expect(getByText("😂")).toBeInTheDocument();
        expect(getByText("🤝")).toBeInTheDocument();
        expect(getByText("😮")).toBeInTheDocument();
    });

    it("applies custom size and className", () => {
        const { getByText } = render(<LikeIcon size={48} className="test-class" />);
        const el = getByText("👍");
        expect(el).toHaveClass("test-class");
        expect(el).toHaveStyle({ fontSize: "48px" });
    });

    it("renders all reaction types with ReactionIcon", () => {
        const { getByText } = render(
            <div>
                <ReactionIcon type="Like" />
                <ReactionIcon type="Celebrate" />
                <ReactionIcon type="Love" />
                <ReactionIcon type="Insightful" />
                <ReactionIcon type="Funny" />
                <ReactionIcon type="Support" />
                <ReactionIcon type="Wow" />
            </div>
        );
        expect(getByText("👍")).toBeInTheDocument();
        expect(getByText("🎉")).toBeInTheDocument();
        expect(getByText("❤️")).toBeInTheDocument();
        expect(getByText("💡")).toBeInTheDocument();
        expect(getByText("😂")).toBeInTheDocument();
        expect(getByText("🤝")).toBeInTheDocument();
        expect(getByText("😮")).toBeInTheDocument();
    });

    it("contains all reaction mappings", () => {
        expect(REACTION_ICONS).toHaveProperty("Like");
        expect(REACTION_ICONS).toHaveProperty("Celebrate");
        expect(REACTION_ICONS).toHaveProperty("Love");
        expect(REACTION_ICONS).toHaveProperty("Insightful");
        expect(REACTION_ICONS).toHaveProperty("Funny");
        expect(REACTION_ICONS).toHaveProperty("Support");
        expect(REACTION_ICONS).toHaveProperty("Wow");
    });
});
