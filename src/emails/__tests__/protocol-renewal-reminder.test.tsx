import { renderToStaticMarkup } from "react-dom/server";
import ProtocolRenewalReminder, {
    type ProtocolRenewalReminderProps,
} from "@/emails/protocol-renewal-reminder";


const FIXED_EXPIRY = new Date("2026-03-15T00:00:00.000Z");

const baseProps: ProtocolRenewalReminderProps = {
    ownerName: "Dr. Amina Bello",
    protocolTitle: "Randomized Trial of Artemether in Paediatric Malaria",
    expiresAt: FIXED_EXPIRY,
    resubmitUrl: "https://app.cnersh.org/protocols/abc-123",
};

function formatExpiry(date: Date): string {
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function renderHtml(props: ProtocolRenewalReminderProps = baseProps): string {
    return renderToStaticMarkup(<ProtocolRenewalReminder {...props} />);
}


describe("ProtocolRenewalReminder", () => {
    describe("Rendering — no crash, no missing props", () => {
        it("renders without throwing when all props are provided", () => {
            expect(() => renderHtml()).not.toThrow();
        });

        it("produces a non-empty HTML document", () => {
            const html = renderHtml();
            expect(html.length).toBeGreaterThan(0);
            expect(html).toMatch(/<html/);
        });

        it("renders the heading", () => {
            expect(renderHtml()).toContain("Protocol Renewal Reminder");
        });
    });

    describe("Content — required copy is present", () => {
        it("greets the owner by name", () => {
            expect(renderHtml()).toContain("Dear Dr. Amina Bello,");
        });

        it("includes the protocol title", () => {
            expect(renderHtml()).toContain(baseProps.protocolTitle);
        });

        it("displays the formatted expiry date inside the body (at least twice)", () => {
            const html = renderHtml();
            const label = formatExpiry(FIXED_EXPIRY);
            // Count occurrences via split — regex over entity-escaped HTML is fragile.
            const occurrences = html.split(label).length - 1;
            expect(occurrences).toBeGreaterThanOrEqual(2);
        });

        it("warns that the protocol will be marked EXPIRED", () => {
            expect(renderHtml()).toContain("EXPIRED");
        });

        it("instructs the owner to update and resubmit", () => {
            expect(renderHtml()).toContain("update and resubmit");
        });

        it("mentions the new 12-month validity period after re-approval", () => {
            expect(renderHtml()).toContain("12-month validity period");
        });

        it("renders the CNERSH footer", () => {
            const html = renderHtml();
            // The source currently has a typo "Commité"; allow either spelling.
            expect(html).toMatch(/Commi?té National d/);
            expect(html).toMatch(/Santé Humaine/);
        });
    });

    describe("Call to action", () => {
        it("includes a Renew Protocol button linking to the resubmit URL", () => {
            const html = renderHtml();
            expect(html).toContain("Renew Protocol");
            expect(html).toContain(`href="${baseProps.resubmitUrl}"`);
        });

        it("uses the exact resubmitUrl passed in (HTML-escaped &)", () => {
            const url = "https://example.com/deep/link?token=abc&x=1";
            const html = renderHtml({ ...baseProps, resubmitUrl: url });
            // React escapes `&` → `&amp;` when serialising attributes.
            expect(html).toContain(`href="${url.replace(/&/g, "&amp;")}"`);
        });

        it("only renders one anchor", () => {
            const html = renderHtml();
            const anchorMatches = html.match(/<a\s/g) ?? [];
            expect(anchorMatches).toHaveLength(1);
        });
    });

    describe("Date formatting", () => {
        it("formats a mid-year date as 'Month D, YYYY' (en-US)", () => {
            const html = renderHtml({
                ...baseProps,
                expiresAt: new Date("2026-06-04T12:00:00Z"),
            });
            expect(html).toContain("June 4, 2026");
        });

        it("formats an end-of-year date correctly", () => {
            const html = renderHtml({
                ...baseProps,
                expiresAt: new Date("2026-12-31T12:00:00Z"),
            });
            expect(html).toContain("December 31, 2026");
        });

        it("formats a leap-year Feb 29 correctly", () => {
            const html = renderHtml({
                ...baseProps,
                expiresAt: new Date("2028-02-29T12:00:00Z"),
            });
            expect(html).toContain("February 29, 2028");
        });

        it("does not include a leading zero on single-digit days", () => {
            const html = renderHtml({
                ...baseProps,
                expiresAt: new Date("2026-03-05T12:00:00Z"),
            });
            expect(html).toContain("March 5, 2026");
            expect(html).not.toContain("March 05, 2026");
        });
    });

    describe("Edge cases", () => {
        it("handles an owner name containing an apostrophe", () => {
            const html = renderHtml({ ...baseProps, ownerName: "Dr. O'Brien" });
            // React escapes the apostrophe in text nodes as `&#x27;`.
            expect(html).toMatch(/Dear Dr\. O('|&#x27;|&#39;|&apos;)Brien,/);
        });

        it("handles a protocol title containing double quotes without breaking layout", () => {
            const html = renderHtml({
                ...baseProps,
                protocolTitle: 'Evaluation of "off-label" use',
            });
            expect(html).toContain("Evaluation of");
            expect(html).toContain("off-label");
        });

        it("handles a very long protocol title without throwing", () => {
            const longTitle = "A".repeat(250);
            expect(() =>
                renderHtml({ ...baseProps, protocolTitle: longTitle })
            ).not.toThrow();
            expect(renderHtml({ ...baseProps, protocolTitle: longTitle })).toContain(longTitle);
        });

        it("handles an empty owner name gracefully (no crash)", () => {
            expect(() => renderHtml({ ...baseProps, ownerName: "" })).not.toThrow();
        });
    });

    describe("XSS / injection safety", () => {
        it("escapes raw HTML from the protocol title", () => {
            const malicious = '<script>alert("xss")</script>';
            const html = renderHtml({ ...baseProps, protocolTitle: malicious });
            // The literal `<script>` tag must NOT appear as raw HTML.
            expect(html).not.toContain("<script>alert");
            // It must appear escaped instead.
            expect(html).toMatch(/&lt;script&gt;/);
        });

        it("escapes raw HTML from the owner name", () => {
            const malicious = '<img src="x" onerror="alert(1)" />';
            const html = renderHtml({ ...baseProps, ownerName: malicious });
            // No live <img> tag with the injected attributes.
            expect(html).not.toMatch(/<img[^>]+onerror/i);
            // Escaped form is present.
            expect(html).toMatch(/&lt;img/);
        });

        it("relies on React's built-in javascript: URL blocking for the CTA href", () => {

            const unsafeUrl = "javascript:alert(1)";
            const html = renderHtml({ ...baseProps, resubmitUrl: unsafeUrl });

            // 1. The raw script must NOT survive into the rendered HTML.
            expect(html).not.toMatch(/href="javascript:alert/);

            // 2. React must have substituted its blocking stub.
            expect(html).toMatch(
                /javascript:throw new Error\(&#x27;React has blocked a javascript: URL as a security precaution\.&#x27;\)|javascript:throw new Error\('React has blocked a javascript: URL as a security precaution\.'\)/
            );

        });
    });

    describe("HTML output — determinism", () => {
        it("produces byte-identical HTML across two renders", () => {
            expect(renderHtml()).toBe(renderHtml());
        });

        it("does not leak React-only attributes into the HTML", () => {
            expect(renderHtml()).not.toContain("data-reactroot");
        });
    });

    describe("Snapshot", () => {
        it("matches the stored snapshot", () => {
            expect(renderHtml()).toMatchSnapshot();
        });
    });
});