import { beforeEach, describe, expect, it } from "@jest/globals";

/* ------------------------------------------------------------------ */
/* Project mocks                                                       */
/*                                                                     */
/* The ESM-only `better-auth` package is intercepted by               */
/* moduleNameMapper in jest.config.ts, so no jest.mock() calls are     */
/* needed here for it. Only the app-level modules are mocked.          */
/* ------------------------------------------------------------------ */

jest.mock("@/lib/db", () => ({
    db: {
        user: {
            findUnique: jest.fn(async () => null),
            update: jest.fn(async () => ({})),
        },
    },
}));

jest.mock("@/lib/cnersh-verification", () => ({
    sendCnershVerificationEmail: jest.fn(async () => undefined),
    consumeCnershToken: jest.fn(async () => ({
        ok: false as const,
        reason: "not_found" as const,
    })),
}));

jest.mock("@/lib/action-rate-limit", () => ({
    enforceActionRateLimit: jest.fn(async () => undefined),
}));

jest.mock("next/headers", () => ({
    headers: jest.fn(async () => new Headers()),
}));

// Primary line of defense for the action under test.
jest.mock("@/lib/auth", () => ({
    auth: { api: { getSession: jest.fn(async () => null) } },
}));

/* ------------------------------------------------------------------ */
/* Imports                                                             */
/* ------------------------------------------------------------------ */

import { db } from "@/lib/db";
import { enforceActionRateLimit } from "@/lib/action-rate-limit";
import {
    consumeCnershToken,
    sendCnershVerificationEmail,
} from "@/lib/cnersh-verification";
import {
    resendCnershVerification,
    confirmCnershVerification,
} from "@/app/actions/verification";

type AsyncMock = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;

const userMock = db.user as unknown as {
    findUnique: AsyncMock;
    update: AsyncMock;
};

const sendCnershMock = sendCnershVerificationEmail as unknown as AsyncMock;
const consumeMock = consumeCnershToken as unknown as AsyncMock;
const rateLimitMock = enforceActionRateLimit as unknown as AsyncMock;

/* ------------------------------------------------------------------ */
/* resendCnershVerification                                            */
/* ------------------------------------------------------------------ */

describe("resendCnershVerification", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        rateLimitMock.mockResolvedValue(undefined);
    });

    it("rejects an invalid email address", async () => {
        const result = await resendCnershVerification("not-an-email");
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/valid email/i);
        }
        expect(userMock.findUnique).not.toHaveBeenCalled();
    });

    it("returns success even if the user does not exist (no account enumeration)", async () => {
        userMock.findUnique.mockResolvedValueOnce(null);

        const result = await resendCnershVerification("nobody@example.com");

        expect(result.success).toBe(true);
        expect(sendCnershMock).not.toHaveBeenCalled();
    });

    it("returns success without sending if the user is already verified", async () => {
        userMock.findUnique.mockResolvedValueOnce({
            id: "u1",
            email: "a@b.com",
            name: "A",
            cnershVerified: true,
        });

        const result = await resendCnershVerification("a@b.com");

        expect(result.success).toBe(true);
        expect(sendCnershMock).not.toHaveBeenCalled();
        expect(rateLimitMock).not.toHaveBeenCalled();
    });

    it("sends a verification email for an unverified user (2 rate-limit buckets)", async () => {
        userMock.findUnique.mockResolvedValueOnce({
            id: "u1",
            email: "a@b.com",
            name: "A",
            cnershVerified: false,
        });

        const result = await resendCnershVerification("a@b.com");

        expect(result.success).toBe(true);
        expect(sendCnershMock).toHaveBeenCalledTimes(1);
        expect(rateLimitMock).toHaveBeenCalledTimes(2);
    });

    it("surfaces rate-limit errors to the caller", async () => {
        userMock.findUnique.mockResolvedValueOnce({
            id: "u1",
            email: "a@b.com",
            name: "A",
            cnershVerified: false,
        });
        rateLimitMock.mockRejectedValueOnce(
            new Error(
                "Too many resend attempts from this address. Please wait a few minutes."
            )
        );

        const result = await resendCnershVerification("a@b.com");

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/too many/i);
        }
        expect(sendCnershMock).not.toHaveBeenCalled();
    });

    it("returns an error when the email send fails", async () => {
        userMock.findUnique.mockResolvedValueOnce({
            id: "u1",
            email: "a@b.com",
            name: "A",
            cnershVerified: false,
        });
        sendCnershMock.mockRejectedValueOnce(new Error("SMTP down"));

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await resendCnershVerification("a@b.com");

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/could not send/i);
        }

        consoleErrorSpy.mockRestore();
    });
});

/* ------------------------------------------------------------------ */
/* confirmCnershVerification                                           */
/* ------------------------------------------------------------------ */

describe("confirmCnershVerification", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns invalid for an empty token without consuming it", async () => {
        const result = await confirmCnershVerification("");

        expect(result.success).toBe(false);
        if (!result.success) expect(result.reason).toBe("invalid");
        expect(consumeMock).not.toHaveBeenCalled();
    });

    it("flips cnershVerified and emailVerified on a valid token", async () => {
        consumeMock.mockResolvedValueOnce({ ok: true, email: "a@b.com" });
        userMock.findUnique.mockResolvedValueOnce({
            id: "u1",
            emailVerified: false,
        });
        userMock.update.mockResolvedValueOnce({});

        const result = await confirmCnershVerification("tok");

        expect(result.success).toBe(true);
        expect(userMock.update).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { cnershVerified: true, emailVerified: true },
        });
    });

    it("does not overwrite emailVerified when it is already true", async () => {
        consumeMock.mockResolvedValueOnce({ ok: true, email: "a@b.com" });
        userMock.findUnique.mockResolvedValueOnce({
            id: "u1",
            emailVerified: true,
        });
        userMock.update.mockResolvedValueOnce({});

        await confirmCnershVerification("tok");

        expect(userMock.update).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { cnershVerified: true },
        });
    });

    it("returns 'not_found' when the user row no longer exists", async () => {
        consumeMock.mockResolvedValueOnce({ ok: true, email: "a@b.com" });
        userMock.findUnique.mockResolvedValueOnce(null);

        const result = await confirmCnershVerification("tok");

        expect(result.success).toBe(false);
        if (!result.success) expect(result.reason).toBe("not_found");
        expect(userMock.update).not.toHaveBeenCalled();
    });

    it("returns 'expired' when the token is expired", async () => {
        consumeMock.mockResolvedValueOnce({ ok: false, reason: "expired" });

        const result = await confirmCnershVerification("tok");

        expect(result.success).toBe(false);
        if (!result.success) expect(result.reason).toBe("expired");
        expect(userMock.update).not.toHaveBeenCalled();
    });

    it("returns 'not_found' for an unknown token", async () => {
        consumeMock.mockResolvedValueOnce({ ok: false, reason: "not_found" });

        const result = await confirmCnershVerification("tok");

        expect(result.success).toBe(false);
        if (!result.success) expect(result.reason).toBe("not_found");
    });
});