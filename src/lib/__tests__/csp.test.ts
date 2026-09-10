import { buildContentSecurityPolicy, createCspNonce } from "@/lib/csp";

function directive(csp: string, name: string): string {
    const found = csp
        .split(";")
        .map((part) => part.trim())
        .find((part) => part === name || part.startsWith(`${name} `));

    if (!found) {
        throw new Error(`directive "${name}" missing from policy: ${csp}`);
    }

    return found;
}

describe("buildContentSecurityPolicy", () => {
    it("authorises the nonce it is given", () => {
        const csp = buildContentSecurityPolicy({ nonce: "abc123" });
        expect(directive(csp, "script-src")).toContain("'nonce-abc123'");
    });

    /**
     * Regression guard. A production policy of `script-src 'self'` with no nonce
     * blocks the inline hydration scripts emitted by the App Router. React then
     * never hydrates, client components go dead, and the sign-in form degrades
     * to a native GET that puts the password in the URL query string.
     */
    it("never emits a production script policy that blocks inline hydration", () => {
        const csp = buildContentSecurityPolicy({ nonce: "abc123", isDevelopment: false });
        const scriptSrc = directive(csp, "script-src");

        expect(scriptSrc).toMatch(/'nonce-[^']+'/);
        expect(scriptSrc).toContain("'strict-dynamic'");
    });

    it("keeps unsafe-inline and unsafe-eval out of production scripts", () => {
        const scriptSrc = directive(
            buildContentSecurityPolicy({ nonce: "abc123", isDevelopment: false }),
            "script-src",
        );

        expect(scriptSrc).not.toContain("'unsafe-inline'");
        expect(scriptSrc).not.toContain("'unsafe-eval'");
    });

    it("allows unsafe-eval in development for React Refresh", () => {
        const scriptSrc = directive(
            buildContentSecurityPolicy({ nonce: "abc123", isDevelopment: true }),
            "script-src",
        );

        expect(scriptSrc).toContain("'unsafe-eval'");
    });

    it("retains the hardening directives", () => {
        const csp = buildContentSecurityPolicy({ nonce: "abc123" });

        expect(directive(csp, "default-src")).toBe("default-src 'self'");
        expect(directive(csp, "object-src")).toBe("object-src 'none'");
        expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
        expect(directive(csp, "form-action")).toBe("form-action 'self'");
        expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
        expect(csp).toContain("upgrade-insecure-requests");
    });

    it("still permits inline styles, which cannot carry a nonce", () => {
        expect(directive(buildContentSecurityPolicy({ nonce: "abc123" }), "style-src")).toContain(
            "'unsafe-inline'",
        );
    });

    it("allows the Google Translate and UploadThing origins", () => {
        const csp = buildContentSecurityPolicy({ nonce: "abc123" });

        expect(directive(csp, "frame-src")).toContain("https://translate.google.com");
        expect(directive(csp, "img-src")).toContain("https://utfs.io");
        expect(directive(csp, "connect-src")).toContain("https://api.resend.com");
    });
});

describe("createCspNonce", () => {
    it("returns a fresh value on every call", () => {
        const nonces = new Set(Array.from({ length: 50 }, () => createCspNonce()));
        expect(nonces.size).toBe(50);
    });

    it("returns base64 usable inside a CSP directive", () => {
        const nonce = createCspNonce();

        expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
        expect(nonce).not.toContain("'");
        expect(nonce).not.toContain(";");
        expect(Buffer.from(nonce, "base64")).toHaveLength(16);
    });
});
