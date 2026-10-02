// src/components/__tests__/CookieConsentBanner.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CookieConsentBanner from "../cookie-consent-banner";

const CONSENT_KEY = "cookie-consent-choice";
const CONSENT_COOKIE = "cookie_consent";

const getCookie = (name: string) => {
    const match = document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
};

const clearAllCookies = () => {
    document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const cname = (eqPos > -1 ? c.substring(0, eqPos) : c).trim();
        if (cname) {
            document.cookie = `${cname}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
    });
};

beforeEach(() => {
    localStorage.clear();
    clearAllCookies();
    // Clean any markers left by a previous test so cross-test state never leaks.
    document.documentElement.removeAttribute("data-cookie-consent");
    document.documentElement.style.removeProperty("--cookie-banner-height");
});

describe("CookieConsentBanner", () => {
    /* ------------------------------------------------------------------ */
    /* Behaviour: rendering and persistence                                */
    /* ------------------------------------------------------------------ */

    test("renders when no prior choice", () => {
        render(<CookieConsentBanner />);
        expect(
            screen.getByText(/we use cookies to improve your experience/i)
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /reject all/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /accept all/i })).toBeInTheDocument();
    });

    test("hidden when previously accepted", () => {
        localStorage.setItem(CONSENT_KEY, "accepted");
        render(<CookieConsentBanner />);
        expect(
            screen.queryByText(/we use cookies to improve your experience/i)
        ).not.toBeInTheDocument();
    });

    test("hidden when previously rejected", () => {
        localStorage.setItem(CONSENT_KEY, "rejected");
        render(<CookieConsentBanner />);
        expect(
            screen.queryByText(/we use cookies to improve your experience/i)
        ).not.toBeInTheDocument();
    });

    test("renders if stored value is invalid", () => {
        localStorage.setItem(CONSENT_KEY, "maybe" as never);
        render(<CookieConsentBanner />);
        expect(
            screen.getByText(/we use cookies to improve your experience/i)
        ).toBeInTheDocument();
    });

    test("accept sets storage, cookie, and hides", async () => {
        const user = userEvent.setup();
        render(<CookieConsentBanner />);
        await user.click(screen.getByRole("button", { name: /accept all/i }));

        expect(localStorage.getItem(CONSENT_KEY)).toBe("accepted");
        expect(getCookie(CONSENT_COOKIE)).toBe("accepted");
        expect(
            screen.queryByText(/we use cookies to improve your experience/i)
        ).not.toBeInTheDocument();
    });

    test("reject sets storage, cookie, and hides", async () => {
        const user = userEvent.setup();
        render(<CookieConsentBanner />);
        await user.click(screen.getByRole("button", { name: /reject all/i }));

        expect(localStorage.getItem(CONSENT_KEY)).toBe("rejected");
        expect(getCookie(CONSENT_COOKIE)).toBe("rejected");
        expect(
            screen.queryByText(/we use cookies to improve your experience/i)
        ).not.toBeInTheDocument();
    });

    /* ------------------------------------------------------------------ */
    /* Case 10 contract: bottom-space reservation                          */
    /* ------------------------------------------------------------------ */

    test("publishes data-cookie-consent=\"pending\" on <html> while visible", () => {
        render(<CookieConsentBanner />);

        // The attribute is set inside an effect, which has flushed by the time
        // `render` returns under Testing Library's automatic act() wrapping.
        expect(
            document.documentElement.getAttribute("data-cookie-consent")
        ).toBe("pending");
    });

    test("does not publish the pending marker when a prior choice exists", () => {
        localStorage.setItem(CONSENT_KEY, "accepted");
        render(<CookieConsentBanner />);

        expect(
            document.documentElement.getAttribute("data-cookie-consent")
        ).toBeNull();
    });

    test("clears the pending marker after a choice is recorded", async () => {
        const user = userEvent.setup();
        render(<CookieConsentBanner />);

        // Sanity check the starting state.
        expect(
            document.documentElement.getAttribute("data-cookie-consent")
        ).toBe("pending");

        await user.click(screen.getByRole("button", { name: /accept all/i }));

        expect(
            document.documentElement.getAttribute("data-cookie-consent")
        ).toBeNull();
    });
});