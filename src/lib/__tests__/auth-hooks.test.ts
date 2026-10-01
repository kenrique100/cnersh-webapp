import { beforeEach, describe, expect, it } from "@jest/globals";

/* ------------------------------------------------------------------ */
/* Project mocks                                                       */
/* ------------------------------------------------------------------ */

jest.mock("@/lib/db", () => ({
    db: {
        account: { findFirst: jest.fn(async () => null) },
        user: { update: jest.fn(async () => ({})) },
    },
}));

jest.mock("@/lib/cnersh-verification", () => ({
    sendCnershVerificationEmail: jest.fn(async () => undefined),
}));

// Prevent the real @/lib/auth from being evaluated. (Its `betterAuth()`
// call is now safe thanks to the moduleNameMapper stub, but mocking it
// here keeps this test's dependencies minimal.)
jest.mock("@/lib/auth", () => ({
    auth: { api: { getSession: jest.fn(async () => null) } },
}));

import { db } from "@/lib/db";
import { sendCnershVerificationEmail } from "@/lib/cnersh-verification";

type AsyncMock = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;

const accountMock = db.account as unknown as { findFirst: AsyncMock };
const userMock = db.user as unknown as { update: AsyncMock };

async function runCreateAfter(user: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
    cnershVerified?: boolean;
}) {
    if (user.emailVerified && !user.cnershVerified) {
        await sendCnershVerificationEmail({
            id: user.id,
            email: user.email,
            name: user.name,
        });
    }
}

async function runUpdateAfter(user: {
    id: string;
    email: string;
    emailVerified: boolean;
    cnershVerified?: boolean;
}) {
    if (user.emailVerified && !user.cnershVerified) {
        const googleAccount = await db.account.findFirst({
            where: { userId: user.id, providerId: "google" },
            select: { id: true },
        });
        if (!googleAccount) {
            await db.user.update({
                where: { id: user.id },
                data: { cnershVerified: true },
            });
        }
    }
}

describe("auth database hooks — CNERSH policy", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("user.create.after", () => {
        it("sends a CNERSH email for a new Google user", async () => {
            const user = {
                id: "u1",
                email: "g@x.com",
                name: "G",
                emailVerified: true,
                cnershVerified: false,
            };
            await runCreateAfter(user);
            expect(sendCnershVerificationEmail).toHaveBeenCalledWith({
                id: "u1",
                email: "g@x.com",
                name: "G",
            });
        });

        it("does not send for a user that is already CNERSH-verified", async () => {
            const user = {
                id: "u1",
                email: "g@x.com",
                name: "G",
                emailVerified: true,
                cnershVerified: true,
            };
            await runCreateAfter(user);
            expect(sendCnershVerificationEmail).not.toHaveBeenCalled();
        });

        it("does not send for an email/password user (sendOnSignUp handles it)", async () => {
            const user = {
                id: "u1",
                email: "a@b.com",
                name: "A",
                emailVerified: false,
                cnershVerified: false,
            };
            await runCreateAfter(user);
            expect(sendCnershVerificationEmail).not.toHaveBeenCalled();
        });
    });

    describe("user.update.after", () => {
        it("flips cnershVerified for a non-Google email/password user", async () => {
            accountMock.findFirst.mockResolvedValueOnce(null);
            const user = {
                id: "u1",
                email: "a@b.com",
                emailVerified: true,
                cnershVerified: false,
            };
            await runUpdateAfter(user);
            expect(userMock.update).toHaveBeenCalledWith({
                where: { id: "u1" },
                data: { cnershVerified: true },
            });
        });

        it("does not auto-flip cnershVerified for a Google user", async () => {
            accountMock.findFirst.mockResolvedValueOnce({ id: "acc1" });
            const user = {
                id: "u1",
                email: "g@x.com",
                emailVerified: true,
                cnershVerified: false,
            };
            await runUpdateAfter(user);
            expect(userMock.update).not.toHaveBeenCalled();
        });

        it("does nothing when the user is already CNERSH-verified", async () => {
            const user = {
                id: "u1",
                email: "a@b.com",
                emailVerified: true,
                cnershVerified: true,
            };
            await runUpdateAfter(user);
            expect(accountMock.findFirst).not.toHaveBeenCalled();
            expect(userMock.update).not.toHaveBeenCalled();
        });
    });
});