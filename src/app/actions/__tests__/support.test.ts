/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({
    verifiedAuthSession: jest.fn(),
}));

jest.mock("@/lib/send-notification-email", () => ({
    sendNotificationEmail: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
    db: {
        user: {},
        notification: {},
    },
}));

const mockCaptureMessage = jest.fn();
jest.mock("@sentry/nextjs", () => ({
    captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { submitSupportMessage } from "@/app/actions/support";

const mockedVerifiedAuthSession = verifiedAuthSession as jest.Mock;
const mockedSendNotificationEmail = sendNotificationEmail as jest.Mock;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    user: MockTable;
    notification: MockTable;
}

const mockedDb = db as unknown as MockDb;

/** Must match DEVELOPER_EMAIL in the action. */
const DEVELOPER_EMAIL = "kenriqueanyere@gmail.com";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function mockSession(
    userId = "user-1",
    name: string | null = "Test User",
    email = "testuser@test.com"
): void {
    mockedVerifiedAuthSession.mockResolvedValue({
        user: { id: userId, name, email, role: "user" },
    });
}

const SUPER_ADMINS = [
    { id: "super-1", email: "super1@test.com", name: "Super One" },
    { id: "super-2", email: "super2@test.com", name: "Super Two" },
];

/** A valid input object matching the supportSchema. */
const validInput = {
    category: "bug" as const,
    subject: "Form crashes on submit",
    message: "Every time I submit the support form it fails with error 500.",
};

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.user = { findMany: jest.fn().mockResolvedValue([]) };
    mockedDb.notification = { createMany: jest.fn().mockResolvedValue({}) };

    mockedSendNotificationEmail.mockResolvedValue(undefined);
    mockCaptureMessage.mockReset();
});

/* ================================================================== */
/* submitSupportMessage                                                */
/* ================================================================== */

describe("submitSupportMessage", () => {
    /* -------------------------------------------------------------- */
    /* Authentication                                                  */
    /* -------------------------------------------------------------- */

    it("throws Unauthorized if not authenticated", async () => {
        mockedVerifiedAuthSession.mockRejectedValue(new Error("Unauthorized"));

        await expect(submitSupportMessage(validInput)).rejects.toThrow(
            "Unauthorized"
        );
    });

    /* -------------------------------------------------------------- */
    /* Validation → { success: false, error }                          */
    /* -------------------------------------------------------------- */

    it("returns { success: false } when subject is shorter than 3 characters", async () => {
        mockSession();

        const result = await submitSupportMessage({
            ...validInput,
            subject: "hi",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/subject/i);
        }
    });

    it("returns { success: false } when message is shorter than 10 characters", async () => {
        mockSession();

        const result = await submitSupportMessage({
            ...validInput,
            message: "short",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/message/i);
        }
    });

    it("returns { success: false } when subject exceeds 200 characters", async () => {
        mockSession();

        const result = await submitSupportMessage({
            ...validInput,
            subject: "A".repeat(201),
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/subject/i);
        }
    });

    it("returns { success: false } when message exceeds 5000 characters", async () => {
        mockSession();

        const result = await submitSupportMessage({
            ...validInput,
            message: "A".repeat(5001),
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/message/i);
        }
    });

    it("returns { success: false } for an invalid category", async () => {
        mockSession();

        const result = await submitSupportMessage({
            ...validInput,
            // @ts-expect-error - deliberately invalid category
            category: "not-a-category",
        });

        expect(result.success).toBe(false);
    });

    it("returns { success: false } for an invalid pageUrl", async () => {
        mockSession();

        const result = await submitSupportMessage({
            ...validInput,
            pageUrl: "not a url",
        });

        expect(result.success).toBe(false);
    });

    /* -------------------------------------------------------------- */
    /* Sentry                                                          */
    /* -------------------------------------------------------------- */

    it("captures a Sentry message tagged as coming from the support form", async () => {
        mockSession("user-1", "Alice", "alice@test.com");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        await submitSupportMessage({
            ...validInput,
            pageUrl: "https://example.com/feeds",
        });

        expect(mockCaptureMessage).toHaveBeenCalledWith(
            expect.stringContaining("[Support] bug:"),
            expect.objectContaining({
                level: "info",
                tags: expect.objectContaining({
                    category: "bug",
                    source: "support-form",
                }),
                user: expect.objectContaining({
                    id: "user-1",
                    email: "alice@test.com",
                    username: "Alice",
                }),
                extra: expect.objectContaining({
                    pageUrl: "https://example.com/feeds",
                }),
            })
        );
    });

    /* -------------------------------------------------------------- */
    /* Super-admin lookup                                              */
    /* -------------------------------------------------------------- */

    it("queries only active superadmins", async () => {
        mockSession();
        mockedDb.user.findMany.mockResolvedValue(SUPER_ADMINS);

        await submitSupportMessage(validInput);

        expect(mockedDb.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ role: "superadmin" }),
                select: { id: true, email: true, name: true },
            })
        );
    });

    /* -------------------------------------------------------------- */
    /* Notifications                                                   */
    /* -------------------------------------------------------------- */

    it("creates a SYSTEM notification for every super admin", async () => {
        mockSession("user-1", "Alice", "alice@test.com");
        mockedDb.user.findMany.mockResolvedValue(SUPER_ADMINS);

        await submitSupportMessage(validInput);

        expect(mockedDb.notification.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        type: "SYSTEM",
                        userId: "super-1",
                        link: "/admin/reports",
                    }),
                    expect.objectContaining({
                        type: "SYSTEM",
                        userId: "super-2",
                        link: "/admin/reports",
                    }),
                ]),
            })
        );
    });

    it("does not create notifications when no superadmins exist", async () => {
        mockSession();
        mockedDb.user.findMany.mockResolvedValue([]);

        await submitSupportMessage(validInput);

        expect(mockedDb.notification.createMany).not.toHaveBeenCalled();
    });

    it("creates notifications for all super admins even when there are many", async () => {
        mockSession("user-1", "Alice");

        const manyAdmins = Array.from({ length: 5 }, (_, i) => ({
            id: `super-${i}`,
            email: `super${i}@test.com`,
            name: `Super ${i}`,
        }));
        mockedDb.user.findMany.mockResolvedValue(manyAdmins);

        await submitSupportMessage(validInput);

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data;
        expect(callData).toHaveLength(5);
        callData.forEach((entry: { userId: string }) => {
            expect(entry.userId).toMatch(/^super-\d$/);
        });
    });

    it("formats the notification with an uppercase category and the subject", async () => {
        mockSession("user-1", "Alice", "alice@test.com");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        await submitSupportMessage({
            ...validInput,
            category: "protocol",
            subject: "Consent form question",
        });

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain("[PROTOCOL]");
        expect(callData.message).toContain("Consent form question");
    });

    it("truncates the preview in the notification to 200 characters with an ellipsis", async () => {
        mockSession("user-1", "Alice", "alice@test.com");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        const longMessage = "A".repeat(250);
        await submitSupportMessage({ ...validInput, message: longMessage });

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain("A".repeat(200) + "...");
        // Do not leak the 201st character.
        expect(callData.message).not.toContain("A".repeat(201));
    });

    it("does not add ellipsis when the message is exactly 200 characters", async () => {
        mockSession("user-1", "Alice");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        const exactMessage = "B".repeat(200);
        await submitSupportMessage({ ...validInput, message: exactMessage });

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).not.toContain("...");
    });

    /* -------------------------------------------------------------- */
    /* Emails                                                          */
    /* -------------------------------------------------------------- */

    it("always emails the developer address, even with no superadmins", async () => {
        mockSession("user-1", "Alice", "alice@test.com");
        mockedDb.user.findMany.mockResolvedValue([]);

        await submitSupportMessage(validInput);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: DEVELOPER_EMAIL })
        );
    });

    it("sends an email to each super admin and the developer", async () => {
        mockSession("user-1", "Alice", "alice@test.com");
        mockedDb.user.findMany.mockResolvedValue(SUPER_ADMINS);

        await submitSupportMessage(validInput);
        await new Promise((resolve) => setTimeout(resolve, 0));

        // 1 developer + 2 superadmins.
        expect(mockedSendNotificationEmail).toHaveBeenCalledTimes(3);

        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: DEVELOPER_EMAIL,
                notificationType: "SYSTEM",
                actionUrl: "/admin/reports",
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "super1@test.com",
                userName: "Super One",
                notificationType: "SYSTEM",
                actionUrl: "/admin/reports",
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "super2@test.com",
                userName: "Super Two",
            })
        );
    });

    it("does not duplicate the developer email when a superadmin shares the address", async () => {
        mockSession("user-1", "Alice");
        mockedDb.user.findMany.mockResolvedValue([
            { id: "super-x", email: DEVELOPER_EMAIL, name: "Dev" },
        ]);

        await submitSupportMessage(validInput);
        await new Promise((resolve) => setTimeout(resolve, 0));

        const calls = mockedSendNotificationEmail.mock.calls.filter(
            (c) => c[0]?.to === DEVELOPER_EMAIL
        );
        expect(calls).toHaveLength(1);
    });

    it("includes the sender, category, subject and page URL in the email body", async () => {
        mockSession("user-1", "Alice", "alice@test.com");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        await submitSupportMessage({
            category: "account",
            subject: "Cannot reset password",
            message:
                "The reset link says it has expired after a few seconds.",
            pageUrl: "https://cnersh.cm/settings",
        });
        await new Promise((resolve) => setTimeout(resolve, 0));

        const call = mockedSendNotificationEmail.mock.calls[0][0];
        expect(call.notificationMessage).toContain("Alice");
        expect(call.notificationMessage).toContain("alice@test.com");
        expect(call.notificationMessage).toContain("Category: account");
        expect(call.notificationMessage).toContain(
            "Subject: Cannot reset password"
        );
        expect(call.notificationMessage).toContain(
            "Page: https://cnersh.cm/settings"
        );
    });

    it('falls back to "unknown" for the page URL when none is provided', async () => {
        mockSession("user-1", "Alice", "alice@test.com");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        await submitSupportMessage(validInput);
        await new Promise((resolve) => setTimeout(resolve, 0));

        const call = mockedSendNotificationEmail.mock.calls[0][0];
        expect(call.notificationMessage).toContain("Page: unknown");
    });

    it("uses the full (non-truncated) message in emails", async () => {
        mockSession("user-1", "Alice", "alice@test.com");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        const longMessage = "C".repeat(250);
        await submitSupportMessage({ ...validInput, message: longMessage });
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                notificationMessage: expect.stringContaining("C".repeat(250)),
            })
        );
    });

    it("falls back to the session email in the email body when name is null", async () => {
        mockSession("user-noname", null, "noname@test.com");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        await submitSupportMessage(validInput);
        await new Promise((resolve) => setTimeout(resolve, 0));

        const call = mockedSendNotificationEmail.mock.calls[0][0];
        expect(call.notificationMessage).toContain("noname@test.com");
    });

    it("still returns success even if sendNotificationEmail rejects", async () => {
        mockSession("user-1", "Alice");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);
        mockedSendNotificationEmail.mockRejectedValue(new Error("SMTP error"));

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await submitSupportMessage(validInput);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(result).toEqual({ success: true });
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    /* -------------------------------------------------------------- */
    /* Sanitisation                                                    */
    /* -------------------------------------------------------------- */

    it("trims leading and trailing whitespace from the message", async () => {
        mockSession("user-1", "Alice");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        await submitSupportMessage({
            ...validInput,
            message: "   trimmed message that is long enough   ",
        });

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain(
            "trimmed message that is long enough"
        );
        expect(callData.message).not.toContain("   trimmed");
    });

    it("strips HTML tags from the subject and message", async () => {
        mockSession("user-1", "Alice");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        await submitSupportMessage({
            ...validInput,
            subject: "<b>Important</b>",
            message: "<p>Please help <script>alert(1)</script>me quickly</p>",
        });

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain("Important");
        expect(callData.message).not.toContain("<b>");
        expect(callData.message).not.toContain("<script>");
    });

    /* -------------------------------------------------------------- */
    /* Success shape                                                   */
    /* -------------------------------------------------------------- */

    it("returns { success: true } on successful submission", async () => {
        mockSession("user-1", "Alice");
        mockedDb.user.findMany.mockResolvedValue([SUPER_ADMINS[0]]);

        const result = await submitSupportMessage(validInput);

        expect(result).toEqual({ success: true });
    });

    it("still succeeds when the superadmin lookup throws", async () => {
        mockSession("user-1", "Alice");
        mockedDb.user.findMany.mockRejectedValue(new Error("DB down"));

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await submitSupportMessage(validInput);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(result).toEqual({ success: true });
        expect(mockedDb.notification.createMany).not.toHaveBeenCalled();
        // Developer still receives the email.
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: DEVELOPER_EMAIL })
        );

        consoleErrorSpy.mockRestore();
    });
});