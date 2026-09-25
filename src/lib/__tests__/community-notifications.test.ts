import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { notifyCommunityActivity } from "@/lib/community-notifications";

jest.mock("@/lib/db", () => ({
    db: {
        user: { findMany: jest.fn() },
        notification: { createMany: jest.fn() },
    },
}));

jest.mock("@/lib/send-notification-email", () => ({
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockedDb = jest.mocked(db);
const mockedSend = jest.mocked(sendNotificationEmail);

type NotificationCreateData = {
    type: string;
    message: string;
    link: string;
    userId: string;
};

/**
 * Returns the array passed to the latest `notification.createMany` call,
 * narrowing the Prisma union (`Input | Input[]`) and asserting the call
 * actually happened (so `calls[0]` is not `undefined`).
 */
function lastCreateManyData(): NotificationCreateData[] {
    const call = mockedDb.notification.createMany.mock.calls.at(-1);
    if (!call) throw new Error("notification.createMany was not called");
    const payload = call[0] as { data: NotificationCreateData | NotificationCreateData[] };
    return Array.isArray(payload.data) ? payload.data : [payload.data];
}

describe("notifyCommunityActivity", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedDb.notification.createMany.mockResolvedValue({ count: 0 } as never);
    });

    it("restricts recipients to admin / superadmin and excludes the actor", async () => {
        mockedDb.user.findMany.mockResolvedValueOnce([] as never);

        await notifyCommunityActivity({
            type: "NEW_TOPIC",
            actor: { id: "actor-1", name: "Dr. John" },
            topic: { id: "topic-1", title: "Ethics Committee Meeting" },
            preview: "We should review...",
        });

        expect(mockedDb.user.findMany).toHaveBeenCalledWith({
            where: {
                role: { in: ["admin", "superadmin"] },
                banned: { not: true },
                id: { not: "actor-1" },
            },
            select: { id: true, email: true, name: true },
        });
    });

    it("returns early when there are no recipients", async () => {
        mockedDb.user.findMany.mockResolvedValueOnce([] as never);

        await notifyCommunityActivity({
            type: "NEW_REPLY",
            actor: { id: "actor-1", name: null },
            topic: { id: "topic-1", title: "Topic" },
            preview: "Reply body",
        });

        expect(mockedDb.notification.createMany).not.toHaveBeenCalled();
        expect(mockedSend).not.toHaveBeenCalled();
    });

    it("creates in-app notifications with the topic deep link", async () => {
        mockedDb.user.findMany.mockResolvedValueOnce([
            { id: "admin-1", email: "admin1@test.com", name: "Admin One" },
            { id: "super-1", email: "super@test.com", name: "Super" },
        ] as never);

        await notifyCommunityActivity({
            type: "NEW_TOPIC",
            actor: { id: "actor-1", name: "Dr. John" },
            topic: { id: "topic-1", title: "Ethics Committee Meeting" },
            preview: "We should review the updated requirements.",
        });

        expect(mockedDb.notification.createMany).toHaveBeenCalledWith({
            data: [
                {
                    type: "COMMENT",
                    message: 'Dr. John • New Topic: "Ethics Committee Meeting"',
                    link: "/community?topic=topic-1",
                    userId: "admin-1",
                },
                {
                    type: "COMMENT",
                    message: 'Dr. John • New Topic: "Ethics Committee Meeting"',
                    link: "/community?topic=topic-1",
                    userId: "super-1",
                },
            ],
        });
    });

    it("sends emails with the community activity payload", async () => {
        mockedDb.user.findMany.mockResolvedValueOnce([
            { id: "admin-1", email: "admin1@test.com", name: "Admin One" },
        ] as never);

        await notifyCommunityActivity({
            type: "NEW_REPLY",
            actor: { id: "actor-1", name: "Dr. John" },
            topic: { id: "topic-1", title: "Ethics Committee Meeting" },
            preview: "We should review the updated submission requirements...",
        });

        await new Promise(process.nextTick);

        expect(mockedSend).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "admin1@test.com",
                userName: "Admin One",
                notificationType: "COMMENT",
                actionUrl: "/community?topic=topic-1",
                communityActivity: {
                    activityType: "New Reply",
                    actorName: "Dr. John",
                    topicTitle: "Ethics Committee Meeting",
                    contentPreview:
                        "We should review the updated submission requirements...",
                },
            })
        );
    });

    it("maps ANNOUNCEMENT to the ANNOUNCEMENT notification type", async () => {
        mockedDb.user.findMany.mockResolvedValueOnce([
            { id: "admin-1", email: "admin1@test.com", name: "Admin One" },
        ] as never);

        await notifyCommunityActivity({
            type: "ANNOUNCEMENT",
            actor: { id: "actor-1", name: "Super Admin" },
            topic: { id: "topic-1", title: "Policy Update" },
            preview: "New policy published.",
        });

        const data = lastCreateManyData();
        expect(data[0]).toMatchObject({
            type: "ANNOUNCEMENT",
            link: "/community?topic=topic-1",
        });
    });

    it("truncates long previews with an ellipsis", async () => {
        mockedDb.user.findMany.mockResolvedValueOnce([
            { id: "admin-1", email: "admin1@test.com", name: "Admin One" },
        ] as never);

        await notifyCommunityActivity({
            type: "NEW_REPLY",
            actor: { id: "actor-1", name: "Dr. John" },
            topic: { id: "topic-1", title: "Topic" },
            preview: "a".repeat(500),
        });

        await new Promise(process.nextTick);

        const call = mockedSend.mock.calls.at(-1);
        if (!call) throw new Error("sendNotificationEmail was not called");
        const preview = call[0].communityActivity?.contentPreview ?? "";
        expect(preview.endsWith("…")).toBe(true);
        expect(preview.length).toBeLessThanOrEqual(180);
    });

    it("falls back to 'An administrator' when the actor has no name", async () => {
        mockedDb.user.findMany.mockResolvedValueOnce([
            { id: "admin-1", email: "admin1@test.com", name: "Admin One" },
        ] as never);

        await notifyCommunityActivity({
            type: "NEW_TOPIC",
            actor: { id: "actor-1", name: null },
            topic: { id: "topic-1", title: "Topic" },
            preview: "Body",
        });

        const data = lastCreateManyData();
        expect(data[0].message).toContain("An administrator");
    });

    it("never throws when the recipient query fails", async () => {
        const consoleErr = jest.spyOn(console, "error").mockImplementation(() => {});
        mockedDb.user.findMany.mockRejectedValueOnce(new Error("db down") as never);

        await expect(
            notifyCommunityActivity({
                type: "NEW_TOPIC",
                actor: { id: "actor-1", name: "Dr. John" },
                topic: { id: "topic-1", title: "Topic" },
                preview: "Body",
            })
        ).resolves.toBeUndefined();

        consoleErr.mockRestore();
    });
});