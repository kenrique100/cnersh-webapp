/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    addReply,
    createTopic,
    deleteReply,
    deleteTopic,
    editReply,
    getCommunityUsers,
    getCommunityUnreadCount,
    getTopics,
    getTopicWithReplies,
    markTopicRead,
    toggleTopicLike,
    voteOnPoll,
} from "@/app/actions/community";

jest.mock("@/lib/auth-utils", () => ({ verifiedAuthSession: jest.fn() }));

jest.mock("@/lib/permissions", () => ({
    isAdminRole: (role: unknown) => role === "admin" || role === "superadmin",
    canManageRole: (actor: string, target: string) => {
        const levels: Record<string, number> = {
            user: 0,
            admin: 1,
            superadmin: 2,
        };
        return (levels[actor] ?? -1) > (levels[target] ?? 99);
    },
}));

jest.mock("@/lib/db", () => ({
    db: {
        $queryRaw: jest.fn(),
        user: {},
        communityTopic: {},
        communityReply: {},
        communityTopicLike: {},
        communityTopicReadStatus: {},
        communityReadStatus: {},
        communityReplyReaction: {},
        notification: {},
        auditLog: {},
    },
}));

jest.mock("@/generated/prisma", () => {
    const sqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => ({
        strings,
        values,
    });
    const join = (values: unknown[]) => values;
    return {
        Prisma: {
            sql: Object.assign(sqlTag, { join }),
            join,
            TransactionIsolationLevel: { Serializable: "Serializable" },
        },
    };
});

jest.mock("@/lib/community-notifications", () => ({
    notifyCommunityActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyCommunityActivity } from "@/lib/community-notifications";

const mockedAuthSession = verifiedAuthSession as jest.Mock;
const mockedNotifyCommunityActivity = notifyCommunityActivity as jest.Mock;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    $queryRaw: jest.Mock;
    user: MockTable;
    communityTopic: MockTable;
    communityReply: MockTable;
    communityTopicLike: MockTable;
    communityTopicReadStatus: MockTable;
    communityReadStatus: MockTable;
    communityReplyReaction: MockTable;
    notification: MockTable;
    auditLog: MockTable;
}

const mockedDb = db as unknown as MockDb;

function mockSession(
    userId = "admin-1",
    name = "Test User",
    role = "admin"
): void {
    mockedAuthSession.mockResolvedValue({
        user: {
            id: userId,
            name,
            email: `${name.toLowerCase().replace(/\s+/g, "")}@test.com`,
            role,
        },
    });
}

beforeEach(() => {
    jest.clearAllMocks();

    // Reassign every table so we get fresh `jest.fn()`s with defaults.
    mockedDb.$queryRaw = jest.fn().mockResolvedValue([]);

    mockedDb.user = {
        findUnique: jest.fn().mockResolvedValue({ role: "admin" }),
        findMany: jest.fn().mockResolvedValue([]),
    };

    mockedDb.communityTopic = {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue({
            id: "t1",
            userId: "admin-1",
            deleted: false,
            chatEnabled: true,
            title: "Topic Title",
            category: "General",
            user: { role: "admin" },
        }),
        update: jest.fn().mockResolvedValue({}),
    };

    mockedDb.communityReply = {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue({
            id: "r1",
            userId: "admin-1",
            topicId: "t1",
            deleted: false,
            topic: { deleted: false, chatEnabled: true },
            user: { role: "admin" },
        }),
        update: jest.fn().mockResolvedValue({}),
    };

    mockedDb.communityTopicLike = {
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
    };

    mockedDb.communityTopicReadStatus = {
        upsert: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null),
    };

    mockedDb.communityReadStatus = {
        upsert: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null),
    };

    mockedDb.communityReplyReaction = {
        findUnique: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
    };

    mockedDb.notification = { createMany: jest.fn().mockResolvedValue({}) };
    mockedDb.auditLog = { create: jest.fn().mockResolvedValue({}) };

    // Default authenticated admin session.
    mockSession("admin-1", "Admin");
});

describe("createTopic", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(
            createTopic({ title: "T", content: "C", category: "General" })
        ).rejects.toThrow("Unauthorized");
    });

    it("throws when user is not admin", async () => {
        mockSession("user-1", "User", "user");
        mockedDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(
            createTopic({ title: "T", content: "C", category: "General" })
        ).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });

    it("creates a topic for admin", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityTopic.create.mockResolvedValue({
            id: "t1",
            title: "Hello",
            content: "World",
            category: "General",
        });

        const result = await createTopic({
            title: "Hello",
            content: "World",
            category: "General",
        });

        expect(result).toHaveProperty("id", "t1");
        expect(result).toHaveProperty("unreadCount", 0);
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
        mockSession("super-1", "Super", "superadmin");
        mockedDb.user.findUnique.mockResolvedValue({ role: "superadmin" });
        mockedDb.communityTopic.create.mockResolvedValue({
            id: "t2",
            title: "Announcement",
            content: "Important",
            category: "General",
        });

        const result = await createTopic({
            title: "Announcement",
            content: "Important",
            category: "General",
        });

        expect(result).toHaveProperty("id", "t2");
    });

    it("emits a NEW_TOPIC community activity for regular categories", async () => {
        mockSession("admin-1", "Admin One");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityTopic.create.mockResolvedValue({
            id: "t1",
            title: "Hello",
            content: "World body",
            category: "General",
        });

        await createTopic({
            title: "Hello",
            content: "World body",
            category: "General",
        });

        expect(mockedNotifyCommunityActivity).toHaveBeenCalledWith({
            type: "NEW_TOPIC",
            actor: { id: "admin-1", name: "Admin One" },
            topic: { id: "t1", title: "Hello", category: "General" },
            preview: "World body",
        });
    });

    it("emits an ANNOUNCEMENT activity when category is Announcements", async () => {
        mockSession("admin-1", "Admin One");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityTopic.create.mockResolvedValue({
            id: "t3",
            title: "Big News",
            content: "Read this",
            category: "Announcements",
        });

        await createTopic({
            title: "Big News",
            content: "Read this",
            category: "Announcements",
        });

        expect(mockedNotifyCommunityActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "ANNOUNCEMENT",
                topic: expect.objectContaining({ id: "t3" }),
            })
        );
    });
});

describe("getTopics", () => {
    it("rejects ordinary users before reading community data", async () => {
        mockSession("user-1", "User", "user");
        mockedDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(getTopics()).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
        expect(mockedDb.communityTopic.findMany).not.toHaveBeenCalled();
    });

    it("returns topics and pagination info", async () => {
        mockedDb.communityTopic.findMany.mockResolvedValue([
            { id: "t1", title: "First" },
        ]);
        mockedDb.communityTopic.count.mockResolvedValue(1);

        const result = await getTopics();

        expect(result.topics).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.pages).toBe(1);
    });

    it("filters by category when provided", async () => {
        mockedDb.communityTopic.findMany.mockResolvedValue([]);
        mockedDb.communityTopic.count.mockResolvedValue(0);

        await getTopics("General");

        expect(mockedDb.communityTopic.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ category: "General" }),
            })
        );
    });

    it("returns empty result on error", async () => {
        mockedDb.communityTopic.findMany.mockRejectedValue(
            new Error("DB fail")
        );
        mockedDb.communityTopic.count.mockResolvedValue(0);

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await getTopics();

        expect(result).toEqual({ topics: [], total: 0, pages: 0 });
        consoleErrorSpy.mockRestore();
    });

    it("paginates correctly", async () => {
        mockedDb.communityTopic.findMany.mockResolvedValue([]);
        mockedDb.communityTopic.count.mockResolvedValue(0);

        await getTopics(undefined, 3, 5);

        expect(mockedDb.communityTopic.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ skip: 10, take: 5 })
        );
    });

    it("attaches unreadCount from the aggregated query to each topic", async () => {
        mockedDb.communityTopic.findMany.mockResolvedValue([
            { id: "t1", title: "First", _count: { replies: 3 } },
            { id: "t2", title: "Second", _count: { replies: 5 } },
        ]);
        mockedDb.communityTopic.count.mockResolvedValue(2);
        mockedDb.$queryRaw.mockResolvedValueOnce([
            { topicId: "t1", unread: BigInt(7) },
            { topicId: "t2", unread: BigInt(0) },
        ]);

        const result = await getTopics();

        expect(result.topics[0]).toMatchObject({ id: "t1", unreadCount: 7 });
        expect(result.topics[1]).toMatchObject({ id: "t2", unreadCount: 0 });
        expect(mockedDb.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("defaults missing topics to unreadCount 0", async () => {
        mockedDb.communityTopic.findMany.mockResolvedValue([
            { id: "t1", title: "First", _count: { replies: 0 } },
        ]);
        mockedDb.communityTopic.count.mockResolvedValue(1);
        mockedDb.$queryRaw.mockResolvedValueOnce([]);

        const result = await getTopics();

        expect(result.topics[0].unreadCount).toBe(0);
    });

    it("skips the raw query entirely when there are no topics", async () => {
        mockedDb.communityTopic.findMany.mockResolvedValue([]);
        mockedDb.communityTopic.count.mockResolvedValue(0);

        await getTopics();

        expect(mockedDb.$queryRaw).not.toHaveBeenCalled();
    });
});

describe("getTopicWithReplies", () => {
    it("returns the topic with nested replies", async () => {
        mockedDb.communityTopic.findUnique.mockResolvedValue({
            id: "t1",
            title: "A topic",
            replies: [],
        });

        const result = await getTopicWithReplies("t1");

        expect(result).toHaveProperty("id", "t1");
        expect(mockedDb.communityTopic.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "t1" } })
        );
    });

    it("returns null when topic not found", async () => {
        mockedDb.communityTopic.findUnique.mockResolvedValue(null);

        const result = await getTopicWithReplies("missing");

        expect(result).toBeNull();
    });
});

describe("markTopicRead", () => {
    it("upserts the per-topic cursor and returns the recomputed count", async () => {
        mockedDb.$queryRaw.mockResolvedValueOnce([
            { topicId: "t1", unread: BigInt(0) },
        ]);

        const result = await markTopicRead("t1");

        expect(mockedDb.communityTopicReadStatus.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    userId_topicId: { userId: "admin-1", topicId: "t1" },
                },
                create: expect.objectContaining({ topicId: "t1" }),
                update: expect.objectContaining({
                    lastReadAt: expect.any(Date),
                }),
            })
        );
        expect(result).toEqual({ unreadCount: 0 });
    });

    it("returns the still-unread count when a reply races the cursor move", async () => {
        mockedDb.$queryRaw.mockResolvedValueOnce([
            { topicId: "t1", unread: BigInt(1) },
        ]);

        const result = await markTopicRead("t1");

        expect(result).toEqual({ unreadCount: 1 });
    });

    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(markTopicRead("t1")).rejects.toThrow("Unauthorized");
    });

    it("throws for non-admin users", async () => {
        mockSession("user-1", "User", "user");
        mockedDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(markTopicRead("t1")).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });
});

describe("addReply", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockRejectedValue(new Error("Unauthorized"));

        await expect(
            addReply({ topicId: "t1", content: "Hello" })
        ).rejects.toThrow("Unauthorized");
    });

    it("throws when user is not admin", async () => {
        mockSession("user-1", "User", "user");
        mockedDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(
            addReply({ topicId: "t1", content: "Hello" })
        ).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });

    it("creates a reply for admin", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.create.mockResolvedValue({
            id: "r1",
            content: "Hello",
            user: { id: "admin-1", name: "Admin" },
        });

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

    it("bumps the author's per-topic cursor", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.create.mockResolvedValue({
            id: "r1",
            content: "Hello",
            user: { id: "admin-1", name: "Admin" },
        });

        await addReply({ topicId: "t1", content: "Hello" });

        expect(mockedDb.communityTopicReadStatus.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    userId_topicId: { userId: "admin-1", topicId: "t1" },
                },
            })
        );
    });

    it("emits a NEW_REPLY community activity with topic title and content preview", async () => {
        mockSession("admin-1", "Admin One");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityTopic.findUnique.mockResolvedValue({
            chatEnabled: true,
            deleted: false,
            title: "Topic Title",
            category: "General",
        });
        mockedDb.communityReply.create.mockResolvedValue({
            id: "r1",
            content: "Hello everyone",
            user: { id: "admin-1", name: "Admin One" },
        });

        await addReply({ topicId: "t1", content: "Hello everyone" });

        expect(mockedNotifyCommunityActivity).toHaveBeenCalledWith({
            type: "NEW_REPLY",
            actor: { id: "admin-1", name: "Admin One" },
            topic: { id: "t1", title: "Topic Title", category: "General" },
            preview: "Hello everyone",
        });
    });

    it("rejects replies to closed topics", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityTopic.findUnique.mockResolvedValue({
            deleted: false,
            chatEnabled: false,
            title: "Closed",
            category: "General",
        });

        await expect(
            addReply({ topicId: "t1", content: "No" })
        ).rejects.toThrow("Topic is closed");
        expect(mockedDb.communityReply.create).not.toHaveBeenCalled();
    });

    it("rejects a parent reply from a different topic", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique.mockResolvedValue({
            userId: "admin-2",
            topicId: "different-topic",
            deleted: false,
            user: { email: "admin@test.com", name: "Admin" },
        });

        await expect(
            addReply({ topicId: "t1", parentId: "r1", content: "No" })
        ).rejects.toThrow("Invalid parent reply");
    });
});

describe("getCommunityUsers", () => {
    it("returns list of users", async () => {
        mockedDb.user.findMany.mockResolvedValue([
            { id: "u1", name: "Alice", image: null, role: "admin" },
        ]);

        const result = await getCommunityUsers();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty("name", "Alice");
    });

    it("returns empty array on error", async () => {
        mockedDb.user.findMany.mockRejectedValue(new Error("DB fail"));

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
        mockedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(deleteTopic("t1")).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden for non-admin", async () => {
        mockSession("user-1", "User", "user");
        mockedDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(deleteTopic("t1")).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });

    it("soft-deletes topic for admin", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityTopic.update.mockResolvedValue({});

        const result = await deleteTopic("t1");

        expect(result).toEqual({ success: true });
        expect(mockedDb.communityTopic.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "t1" },
                data: { deleted: true },
            })
        );
    });

    it("prevents an admin from deleting superadmin content", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityTopic.findUnique.mockResolvedValue({
            userId: "super-1",
            deleted: false,
            user: { role: "superadmin" },
        });

        await expect(deleteTopic("t1")).rejects.toThrow("Forbidden");
        expect(mockedDb.communityTopic.update).not.toHaveBeenCalled();
    });
});

describe("deleteReply", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(deleteReply("r1")).rejects.toThrow("Unauthorized");
    });

    it("throws Reply not found", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique.mockResolvedValue(null);

        await expect(deleteReply("r1")).rejects.toThrow("Reply not found");
    });

    it("throws Forbidden for non-owner non-admin", async () => {
        mockSession("user-1", "User", "user");
        mockedDb.user.findUnique.mockResolvedValue({ role: "user" });
        mockedDb.communityReply.findUnique.mockResolvedValue({
            userId: "other-user",
            deleted: false,
            topic: { deleted: false },
            user: { role: "user" },
        });

        await expect(deleteReply("r1")).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });

    it("soft-deletes reply for owner", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique.mockResolvedValue({
            userId: "admin-1",
            deleted: false,
            topic: { deleted: false },
            user: { role: "admin" },
        });

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
        mockedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(editReply("r1", "new content")).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("throws when user is not admin", async () => {
        mockSession("user-1", "User", "user");
        mockedDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(editReply("r1", "new content")).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });

    it("throws Reply not found", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique.mockResolvedValue(null);

        await expect(editReply("r1", "content")).rejects.toThrow(
            "Reply not found"
        );
    });

    it("throws Forbidden when not reply owner", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique.mockResolvedValue({
            userId: "other-user",
            deleted: false,
            topic: { deleted: false, chatEnabled: true },
        });

        await expect(editReply("r1", "content")).rejects.toThrow("Forbidden");
    });

    it("updates reply content for owner", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique.mockResolvedValue({
            userId: "admin-1",
            deleted: false,
            topic: { deleted: false, chatEnabled: true },
        });
        mockedDb.communityReply.update.mockResolvedValue({
            id: "r1",
            content: "updated",
        });

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
        mockedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(toggleTopicLike("t1")).rejects.toThrow("Unauthorized");
    });

    it("throws when user is not admin", async () => {
        mockSession("user-1", "User", "user");
        mockedDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(toggleTopicLike("t1")).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });

    it("removes like when already liked with same type", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityTopicLike.findUnique.mockResolvedValue({
            id: "like-1",
            isDislike: false,
        });
        mockedDb.communityTopicLike.delete.mockResolvedValue({});

        const result = await toggleTopicLike("t1", false);

        expect(result).toEqual({ action: "removed" });
        expect(mockedDb.communityTopicLike.delete).toHaveBeenCalled();
    });

    it("creates a new like when none exists", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityTopicLike.findUnique.mockResolvedValue(null);
        mockedDb.communityTopicLike.create.mockResolvedValue({});

        const result = await toggleTopicLike("t1", false);

        expect(result).toEqual({ action: "liked" });
    });

    it("switches from like to dislike", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityTopicLike.findUnique.mockResolvedValue({
            id: "like-1",
            isDislike: false,
        });
        mockedDb.communityTopicLike.update.mockResolvedValue({});

        const result = await toggleTopicLike("t1", true);

        expect(result).toEqual({ action: "disliked" });
        expect(mockedDb.communityTopicLike.update).toHaveBeenCalled();
    });
});

describe("voteOnPoll", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(voteOnPoll("r1", 0)).rejects.toThrow("Unauthorized");
    });

    it("throws when user is not admin", async () => {
        mockSession("user-1", "User", "user");
        mockedDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(voteOnPoll("r1", 0)).rejects.toThrow(
            "Only admins and superadmins can access the community"
        );
    });

    it("throws Poll not found when reply has no poll", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique.mockResolvedValue({
            pollVotes: {},
            pollOptions: [],
            deleted: false,
            topic: { deleted: false, chatEnabled: true },
        });

        await expect(voteOnPoll("r1", 0)).rejects.toThrow("Poll not found");
    });

    it("casts a vote successfully", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique.mockResolvedValue({
            pollVotes: {},
            pollOptions: ["Yes", "No"],
            deleted: false,
            topic: { deleted: false, chatEnabled: true },
        });
        mockedDb.communityReply.update.mockResolvedValue({});

        const result = await voteOnPoll("r1", 1);

        expect(result.success).toBe(true);
        expect(result.votes).toEqual({ "admin-1": 1 });
    });

    it("removes vote when same option is selected again", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique.mockResolvedValue({ role: "admin" });
        mockedDb.communityReply.findUnique.mockResolvedValue({
            pollVotes: { "admin-1": 0 },
            pollOptions: ["Yes", "No"],
            deleted: false,
            topic: { deleted: false, chatEnabled: true },
        });
        mockedDb.communityReply.update.mockResolvedValue({});

        const result = await voteOnPoll("r1", 0);

        expect(result.success).toBe(true);
        expect(result.votes["admin-1"]).toBeUndefined();
    });
});

describe("getCommunityUnreadCount", () => {
    it("returns 0 when not authenticated (no throw)", async () => {
        mockedAuthSession.mockRejectedValue(new Error("Unauthorized"));

        const result = await getCommunityUnreadCount();

        expect(result).toBe(0);
        expect(mockedDb.$queryRaw).not.toHaveBeenCalled();
    });

    it("returns 0 for regular users (role check via the raw query)", async () => {
        mockSession("user-1", "User", "user");
        mockedDb.$queryRaw.mockResolvedValueOnce([
            { role: "user", topicCount: BigInt(5), replyCount: BigInt(3) },
        ]);

        const result = await getCommunityUnreadCount();

        expect(result).toBe(0);
        expect(mockedDb.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("returns 0 when the user row is missing", async () => {
        mockSession("ghost-1", "Ghost", "admin");
        mockedDb.$queryRaw.mockResolvedValueOnce([]);

        const result = await getCommunityUnreadCount();

        expect(result).toBe(0);
    });

    it("sums topicCount and replyCount for an admin", async () => {
        mockSession("admin-1", "Admin", "admin");
        mockedDb.$queryRaw.mockResolvedValueOnce([
            { role: "admin", topicCount: BigInt(5), replyCount: BigInt(3) },
        ]);

        const result = await getCommunityUnreadCount();

        expect(result).toBe(8);
    });

    it("sums topicCount and replyCount for a superadmin", async () => {
        mockSession("super-1", "Super", "superadmin");
        mockedDb.$queryRaw.mockResolvedValueOnce([
            {
                role: "superadmin",
                topicCount: BigInt(12),
                replyCount: BigInt(0),
            },
        ]);

        const result = await getCommunityUnreadCount();

        expect(result).toBe(12);
    });

    it("issues exactly one db query (not four separate Prisma calls)", async () => {
        mockSession("admin-1", "Admin", "admin");
        mockedDb.$queryRaw.mockResolvedValueOnce([
            { role: "admin", topicCount: BigInt(1), replyCount: BigInt(1) },
        ]);

        await getCommunityUnreadCount();

        // The single aggregate query is the only database round trip.
        expect(mockedDb.$queryRaw).toHaveBeenCalledTimes(1);
        expect(mockedDb.user.findUnique).not.toHaveBeenCalled();
        expect(mockedDb.communityReadStatus.findUnique).not.toHaveBeenCalled();
        expect(mockedDb.communityTopic.count).not.toHaveBeenCalled();
        expect(mockedDb.communityReply.count).not.toHaveBeenCalled();
    });

    it("converts BigInt counts to plain numbers", async () => {
        mockSession("admin-1", "Admin", "admin");
        mockedDb.$queryRaw.mockResolvedValueOnce([
            { role: "admin", topicCount: BigInt(10), replyCount: BigInt(20) },
        ]);

        const result = await getCommunityUnreadCount();

        expect(typeof result).toBe("number");
        expect(result).toBe(30);
    });

    it("handles null role from the LEFT JOIN gracefully", async () => {
        mockSession("admin-1", "Admin", "admin");
        mockedDb.$queryRaw.mockResolvedValueOnce([
            { role: null, topicCount: BigInt(0), replyCount: BigInt(0) },
        ]);

        const result = await getCommunityUnreadCount();

        expect(result).toBe(0);
    });

    it("returns 0 and logs when the raw query throws", async () => {
        mockSession("admin-1", "Admin", "admin");
        mockedDb.$queryRaw.mockRejectedValueOnce(new Error("DB down"));

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await getCommunityUnreadCount();

        expect(result).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });
});