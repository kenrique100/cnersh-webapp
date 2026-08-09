import {
    createTopic,
    getTopics,
    getTopicWithReplies,
    addReply,
    getCommunityUsers,
    deleteTopic,
    deleteReply,
    editReply,
    toggleTopicLike,
    voteOnPoll,
} from "@/app/actions/community";

jest.mock("@/lib/auth-utils", () => ({
    authSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
    db: {
        user: {},
        communityTopic: {},
        communityReply: {},
        communityTopicLike: {},
        notification: {},
        auditLog: {},
    },
}));

jest.mock("@/lib/notify-admins", () => ({
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
}));

// FIX: Mock sendNotificationEmail to return a resolved Promise
jest.mock("@/lib/send-notification-email", () => ({
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

import { authSession as _authSession } from "@/lib/auth-utils";
import { db as _db } from "@/lib/db";
import type { authSession } from "@/lib/auth-utils";

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    user: MockTable;
    communityTopic: MockTable;
    communityReply: MockTable;
    communityTopicLike: MockTable;
    notification: MockTable;
    auditLog: MockTable;
}

const mockedDb = _db as unknown as MockDb;

function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.user = mockedDb.user;
    live.communityTopic = mockedDb.communityTopic;
    live.communityReply = mockedDb.communityReply;
    live.communityTopicLike = mockedDb.communityTopicLike;
    live.notification = mockedDb.notification;
    live.auditLog = mockedDb.auditLog;
}

function mockSession(userId = "user-1", name = "Test User"): void {
    mockedAuthSession.mockResolvedValue({
        session: {
            id: "session-id",
            createdAt: new Date(),
            updatedAt: new Date(),
            userId,
            expiresAt: new Date(Date.now() + 86_400_000),
            token: "token",
            ipAddress: null,
            userAgent: null,
            impersonatedBy: null,
        },
        user: {
            id: userId,
            name,
            email: `${name.toLowerCase().replace(/\s+/g, "")}@test.com`,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            image: null,
            role: "admin",
            banned: false,
            banReason: null,
            banExpires: null,
            welcomeEmailSent: false,
            gender: "male",
            profession: null,
            title: null,
        },
    } as Awaited<ReturnType<typeof authSession>>);
}

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.user = {};
    mockedDb.communityTopic = {};
    mockedDb.communityReply = {};
    mockedDb.communityTopicLike = {};
    mockedDb.notification = {};
    mockedDb.auditLog = {};

    syncDb();
});

describe("createTopic", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(
            createTopic({ title: "T", content: "C", category: "General" })
        ).rejects.toThrow("Unauthorized");
    });

    it("throws when user is not admin", async () => {
        mockSession("user-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "user" });
        syncDb();

        await expect(
            createTopic({ title: "T", content: "C", category: "General" })
        ).rejects.toThrow("Only admins and superadmins can access the community");
    });

    it("creates a topic for admin", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityTopic.create = jest.fn().mockResolvedValue({ id: "t1" });
        syncDb();

        const result = await createTopic({
            title: "Hello",
            content: "World",
            category: "General",
        });

        expect(result).toHaveProperty("id", "t1");
        expect(mockedDb.communityTopic.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    title: "Hello",
                    content: "World",
                    category: "General",
                    userId: "admin-1",
                }),
            })
        );
    });

    it("creates a topic for superadmin", async () => {
        mockSession("super-1");
        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValue({ role: "superadmin" });
        mockedDb.communityTopic.create = jest
            .fn()
            .mockResolvedValue({ id: "t2" });
        syncDb();

        const result = await createTopic({
            title: "Announcement",
            content: "Important",
            category: "General",
        });

        expect(result).toHaveProperty("id", "t2");
    });

    it("sends announcement notifications when category is Announcements", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityTopic.create = jest
            .fn()
            .mockResolvedValue({ id: "t3" });
        mockedDb.user.findMany = jest.fn().mockResolvedValue([
            { id: "u2", email: "u2@test.com", name: "User Two" },
        ]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await createTopic({
            title: "Big News",
            content: "Read this",
            category: "Announcements",
        });

        expect(mockedDb.notification.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        type: "ANNOUNCEMENT",
                        userId: "u2",
                    }),
                ]),
            })
        );
    });
});

describe("getTopics", () => {
    it("returns topics and pagination info", async () => {
        mockedDb.communityTopic.findMany = jest.fn().mockResolvedValue([
            { id: "t1", title: "First" },
        ]);
        mockedDb.communityTopic.count = jest.fn().mockResolvedValue(1);
        syncDb();

        const result = await getTopics();

        expect(result.topics).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.pages).toBe(1);
    });

    it("filters by category when provided", async () => {
        mockedDb.communityTopic.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.communityTopic.count = jest.fn().mockResolvedValue(0);
        syncDb();

        await getTopics("General");

        expect(mockedDb.communityTopic.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ category: "General" }),
            })
        );
    });

    it("returns empty result on error", async () => {
        mockedDb.communityTopic.findMany = jest
            .fn()
            .mockRejectedValue(new Error("DB fail"));
        mockedDb.communityTopic.count = jest.fn().mockResolvedValue(0);
        syncDb();

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await getTopics();

        expect(result).toEqual({ topics: [], total: 0, pages: 0 });
        consoleErrorSpy.mockRestore();
    });

    it("paginates correctly", async () => {
        mockedDb.communityTopic.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.communityTopic.count = jest.fn().mockResolvedValue(0);
        syncDb();

        await getTopics(undefined, 3, 5);

        expect(mockedDb.communityTopic.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ skip: 10, take: 5 })
        );
    });
});

describe("getTopicWithReplies", () => {
    it("returns the topic with nested replies", async () => {
        mockedDb.communityTopic.findUnique = jest.fn().mockResolvedValue({
            id: "t1",
            title: "A topic",
            replies: [],
        });
        syncDb();

        const result = await getTopicWithReplies("t1");

        expect(result).toHaveProperty("id", "t1");
        expect(mockedDb.communityTopic.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "t1", deleted: false } })
        );
    });

    it("returns null when topic not found", async () => {
        mockedDb.communityTopic.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        const result = await getTopicWithReplies("missing");

        expect(result).toBeNull();
    });
});

describe("addReply", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(
            addReply({ topicId: "t1", content: "Hello" })
        ).rejects.toThrow("Unauthorized");
    });

    it("throws when user is not admin", async () => {
        mockSession("user-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "user" });
        syncDb();

        await expect(
            addReply({ topicId: "t1", content: "Hello" })
        ).rejects.toThrow("Only admins and superadmins can access the community");
    });

    it("creates a reply for admin", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.create = jest.fn().mockResolvedValue({
            id: "r1",
            content: "Hello",
            user: { id: "admin-1", name: "Admin" },
        });
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await addReply({ topicId: "t1", content: "Hello" });

        expect(result).toHaveProperty("id", "r1");
        expect(mockedDb.communityReply.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    topicId: "t1",
                    content: "Hello",
                    userId: "admin-1",
                }),
            })
        );
    });
});

describe("getCommunityUsers", () => {
    it("returns list of users", async () => {
        mockedDb.user.findMany = jest.fn().mockResolvedValue([
            { id: "u1", name: "Alice", image: null, role: "admin" },
        ]);
        syncDb();

        const result = await getCommunityUsers();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty("name", "Alice");
    });

    it("returns empty array on error", async () => {
        mockedDb.user.findMany = jest
            .fn()
            .mockRejectedValue(new Error("DB fail"));
        syncDb();

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await getCommunityUsers();

        expect(result).toEqual([]);
        consoleErrorSpy.mockRestore();
    });
});

describe("deleteTopic", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(deleteTopic("t1")).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden for non-admin", async () => {
        mockSession("user-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "user" });
        syncDb();

        await expect(deleteTopic("t1")).rejects.toThrow("Forbidden");
    });

    it("soft-deletes topic for admin", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityTopic.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deleteTopic("t1");

        expect(result).toEqual({ success: true });
        expect(mockedDb.communityTopic.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "t1" },
                data: { deleted: true },
            })
        );
    });
});

describe("deleteReply", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(deleteReply("r1")).rejects.toThrow("Unauthorized");
    });

    it("throws Reply not found", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(deleteReply("r1")).rejects.toThrow("Reply not found");
    });

    it("throws Forbidden for non-owner non-admin", async () => {
        mockSession("user-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "user" });
        mockedDb.communityReply.findUnique = jest
            .fn()
            .mockResolvedValue({ userId: "other-user" });
        syncDb();

        await expect(deleteReply("r1")).rejects.toThrow("Forbidden");
    });

    it("soft-deletes reply for owner", async () => {
        mockSession("user-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "user" });
        mockedDb.communityReply.findUnique = jest
            .fn()
            .mockResolvedValue({ userId: "user-1" });
        mockedDb.communityReply.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await deleteReply("r1");

        expect(result).toEqual({ success: true });
        expect(mockedDb.communityReply.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "r1" },
                data: { deleted: true },
            })
        );
    });
});

describe("editReply", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(editReply("r1", "new content")).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("throws when user is not admin", async () => {
        mockSession("user-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "user" });
        syncDb();

        await expect(editReply("r1", "new content")).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });

    it("throws Reply not found", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await expect(editReply("r1", "content")).rejects.toThrow(
            "Reply not found"
        );
    });

    it("throws Forbidden when not reply owner", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique = jest
            .fn()
            .mockResolvedValue({ userId: "other-user" });
        syncDb();

        await expect(editReply("r1", "content")).rejects.toThrow("Forbidden");
    });

    it("updates reply content for owner", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique = jest
            .fn()
            .mockResolvedValue({ userId: "admin-1" });
        mockedDb.communityReply.update = jest
            .fn()
            .mockResolvedValue({ id: "r1", content: "updated" });
        syncDb();

        const result = await editReply("r1", "updated");

        expect(result).toHaveProperty("content", "updated");
        expect(mockedDb.communityReply.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "r1" },
                data: { content: "updated" },
            })
        );
    });
});

describe("toggleTopicLike", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(toggleTopicLike("t1")).rejects.toThrow("Unauthorized");
    });

    it("throws when user is not admin", async () => {
        mockSession("user-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "user" });
        syncDb();

        await expect(toggleTopicLike("t1")).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });

    it("removes like when already liked with same type", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityTopicLike.findUnique = jest
            .fn()
            .mockResolvedValue({ id: "like-1", isDislike: false });
        mockedDb.communityTopicLike.delete = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await toggleTopicLike("t1", false);

        expect(result).toEqual({ action: "removed" });
        expect(mockedDb.communityTopicLike.delete).toHaveBeenCalled();
    });

    it("creates a new like when none exists", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityTopicLike.findUnique = jest.fn().mockResolvedValue(null);
        mockedDb.communityTopicLike.create = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await toggleTopicLike("t1", false);

        expect(result).toEqual({ action: "liked" });
    });

    it("switches from like to dislike", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityTopicLike.findUnique = jest
            .fn()
            .mockResolvedValue({ id: "like-1", isDislike: false });
        mockedDb.communityTopicLike.update = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await toggleTopicLike("t1", true);

        expect(result).toEqual({ action: "disliked" });
        expect(mockedDb.communityTopicLike.update).toHaveBeenCalled();
    });
});

describe("voteOnPoll", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(voteOnPoll("r1", 0)).rejects.toThrow("Unauthorized");
    });

    it("throws when user is not admin", async () => {
        mockSession("user-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "user" });
        syncDb();

        await expect(voteOnPoll("r1", 0)).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });

    it("throws Poll not found when reply has no poll", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique = jest
            .fn()
            .mockResolvedValue({ pollVotes: {}, pollOptions: [] });
        syncDb();

        await expect(voteOnPoll("r1", 0)).rejects.toThrow("Poll not found");
    });

    it("casts a vote successfully", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique = jest.fn().mockResolvedValue({
            pollVotes: {},
            pollOptions: ["Yes", "No"],
        });
        mockedDb.communityReply.update = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await voteOnPoll("r1", 1);

        expect(result.success).toBe(true);
        expect(result.votes).toEqual({ "admin-1": 1 });
    });

    it("removes vote when same option is selected again", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique = jest.fn().mockResolvedValue({
            pollVotes: { "admin-1": 0 },
            pollOptions: ["Yes", "No"],
        });
        mockedDb.communityReply.update = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await voteOnPoll("r1", 0);

        expect(result.success).toBe(true);
        expect(result.votes["admin-1"]).toBeUndefined();
    });
});