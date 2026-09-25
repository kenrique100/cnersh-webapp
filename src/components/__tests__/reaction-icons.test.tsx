import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
    LikeIcon,
    CelebrateIcon,
    SupportIcon,
    LoveIcon,
    InsightfulIcon,
    FunnyIcon,
    ReactionIcon,
    REACTION_ICONS,
    REACTION_EMOJI,
    REACTION_ORDER,
    isReactionType,
    getReactionEmojiChar,
} from "../reaction-icons";

describe("ReactionIcons", () => {
    afterEach(async () => {
        cleanup();
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    });

    /* ─── Basic rendering ─────────────────────────────────────────── */

    it("renders a span with role=img and the emoji for each reaction", () => {
        const { getByRole } = render(
            <div>
                <LikeIcon />
                <CelebrateIcon />
                <SupportIcon />
                <LoveIcon />
                <InsightfulIcon />
                <FunnyIcon />
            </div>
        );

        (Object.keys(REACTION_EMOJI) as (keyof typeof REACTION_EMOJI)[]).forEach(
            (label) => {
                const el = getByRole("img", { name: label });
                expect(el.tagName.toLowerCase()).toBe("span");
                expect(el.textContent).toBe(REACTION_EMOJI[label]);
            }
        );
    });

    it("renders each specific emoji character", () => {
        const { getByRole } = render(
            <div>
                <LikeIcon />
                <CelebrateIcon />
                <SupportIcon />
                <LoveIcon />
                <InsightfulIcon />
                <FunnyIcon />
            </div>
        );

        expect(getByRole("img", { name: "Like" })).toHaveTextContent("👍");
        expect(getByRole("img", { name: "Celebrate" })).toHaveTextContent("🎉");
        expect(getByRole("img", { name: "Support" })).toHaveTextContent("🙏");
        expect(getByRole("img", { name: "Love" })).toHaveTextContent("❤️");
        expect(getByRole("img", { name: "Insightful" })).toHaveTextContent("💡");
        expect(getByRole("img", { name: "Funny" })).toHaveTextContent("😂");
    });

    /* ─── Size handling ───────────────────────────────────────────── */

    it("maps the size prop to font-size in pixels", () => {
        const { getByRole } = render(<LikeIcon size={48} />);
        const el = getByRole("img", { name: "Like" });
        expect(el).toHaveStyle({ fontSize: "48px" });
    });

    it("defaults to size 24 when not specified", () => {
        const { getByRole } = render(<LoveIcon />);
        const el = getByRole("img", { name: "Love" });
        expect(el).toHaveStyle({ fontSize: "24px" });
    });

    it("applies line-height 1 so emoji don't inflate the layout", () => {
        const { getByRole } = render(<FunnyIcon />);
        const el = getByRole("img", { name: "Funny" });
        expect(el).toHaveStyle({ lineHeight: "1" });
    });

    /* ─── ClassName / style forwarding ────────────────────────────── */

    it("applies custom className to the emoji span", () => {
        const { getByRole } = render(<FunnyIcon className="test-class" />);
        expect(getByRole("img", { name: "Funny" })).toHaveClass("test-class");
    });

    it("always includes the shrink-0 and inline-flex utility classes", () => {
        const { getByRole } = render(<LikeIcon />);
        const el = getByRole("img", { name: "Like" });
        expect(el).toHaveClass("inline-flex");
        expect(el).toHaveClass("shrink-0");
        expect(el).toHaveClass("items-center");
        expect(el).toHaveClass("justify-center");
        expect(el).toHaveClass("leading-none");
        expect(el).toHaveClass("select-none");
    });

    /* ─── ReactionIcon wrapper ────────────────────────────────────── */

    it("renders all reaction types through the ReactionIcon wrapper", () => {
        const { getByRole } = render(
            <div>
                <ReactionIcon type="Like" />
                <ReactionIcon type="Celebrate" />
                <ReactionIcon type="Support" />
                <ReactionIcon type="Love" />
                <ReactionIcon type="Insightful" />
                <ReactionIcon type="Funny" />
            </div>
        );

        (Object.keys(REACTION_EMOJI) as (keyof typeof REACTION_EMOJI)[]).forEach(
            (label) => {
                expect(getByRole("img", { name: label })).toBeInTheDocument();
            }
        );
    });

    it("forwards size, className and style through ReactionIcon", () => {
        const { getByRole } = render(
            <ReactionIcon
                type="Love"
                size={32}
                className="wrapper-class"
                style={{ opacity: 0.5 }}
            />
        );
        const el = getByRole("img", { name: "Love" });
        expect(el).toHaveClass("wrapper-class");
        expect(el).toHaveStyle({ opacity: "0.5", fontSize: "32px" });
    });

    it("renders a fallback 👍 when the type is not a known reaction", () => {
        const { getByRole } = render(
            <ReactionIcon type="Nonexistent" />
        );
        const el = getByRole("img", { name: "Nonexistent" });
        expect(el).toHaveTextContent("👍");
    });

    /* ─── Registry ────────────────────────────────────────────────── */

    it("contains all reaction mappings", () => {
        expect(REACTION_ICONS).toHaveProperty("Like");
        expect(REACTION_ICONS).toHaveProperty("Celebrate");
        expect(REACTION_ICONS).toHaveProperty("Support");
        expect(REACTION_ICONS).toHaveProperty("Love");
        expect(REACTION_ICONS).toHaveProperty("Insightful");
        expect(REACTION_ICONS).toHaveProperty("Funny");
    });

    it("maps each ReactionType to its matching icon component", () => {
        expect(REACTION_ICONS.Like).toBe(LikeIcon);
        expect(REACTION_ICONS.Celebrate).toBe(CelebrateIcon);
        expect(REACTION_ICONS.Support).toBe(SupportIcon);
        expect(REACTION_ICONS.Love).toBe(LoveIcon);
        expect(REACTION_ICONS.Insightful).toBe(InsightfulIcon);
        expect(REACTION_ICONS.Funny).toBe(FunnyIcon);
    });

    /* ─── REACTION_EMOJI map ──────────────────────────────────────── */

    it("exposes an emoji for every reaction type", () => {
        (REACTION_ORDER).forEach((type) => {
            expect(REACTION_EMOJI[type]).toBeTruthy();
            expect(typeof REACTION_EMOJI[type]).toBe("string");
        });
    });

    /* ─── isReactionType guard ────────────────────────────────────── */

    it("isReactionType returns true for known labels and false otherwise", () => {
        expect(isReactionType("Like")).toBe(true);
        expect(isReactionType("Love")).toBe(true);
        expect(isReactionType("Funny")).toBe(true);
        expect(isReactionType("Celebrate")).toBe(true);
        expect(isReactionType("Insightful")).toBe(true);
        expect(isReactionType("Support")).toBe(true);
        expect(isReactionType("Nonexistent")).toBe(false);
        expect(isReactionType("")).toBe(false);
    });

    /* ─── getReactionEmojiChar helper ─────────────────────────────── */

    it("getReactionEmojiChar returns the emoji for valid labels", () => {
        expect(getReactionEmojiChar("Like")).toBe("👍");
        expect(getReactionEmojiChar("Love")).toBe("❤️");
        expect(getReactionEmojiChar("Funny")).toBe("😂");
        expect(getReactionEmojiChar("Celebrate")).toBe("🎉");
        expect(getReactionEmojiChar("Insightful")).toBe("💡");
        expect(getReactionEmojiChar("Support")).toBe("🙏");
    });

    it("getReactionEmojiChar returns empty string for null/undefined/unknown", () => {
        expect(getReactionEmojiChar(null)).toBe("");
        expect(getReactionEmojiChar(undefined)).toBe("");
        expect(getReactionEmojiChar("Nonexistent")).toBe("");
    });
});