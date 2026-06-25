import {
    createPost,
    getPosts,
    getTrendingTags,
    toggleLike,
    addComment
} from "../feed";
import { db } from "@/lib/db";
import { authSession } from "@/lib/auth-utils";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { notifyAdmins } from "@/lib/notify-admins";

// 1. Setup global mocks for all external service dependencies
jest.mock("@/lib/auth-utils", () => ({
    authSession: jest.fn(),
}));

jest.mock("@/lib/notify-admins", () => ({
    notifyAdmins: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/send-notification-email", () => ({
    sendNotificationEmail: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/db", () => ({
    db: {
        post: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        user: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        notification: {
            createMany: jest.fn(),
            create: jest.fn(),
        },
        like: {
            findUnique: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
        },
        comment: {
            create: jest.fn(),
            findUnique: jest.fn(),
        },
        $queryRaw: jest.fn(),
    },
}));

describe("Feed Server Actions", () => {
    const mockUser = { id: "user-123", name: "Awah Ken", email: "awah@example.com", role: "user" };
    const mockSession = { user: mockUser };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("createPost", () => {
        it("throws an error if the user session is unauthorized", async () => {
            (authSession as jest.Mock).mockResolvedValue(null);

            await expect(createPost({ content: "Hello World" })).rejects.toThrow("Unauthorized");
        });

        it("creates a post successfully and converts Date instances to ISO strings", async () => {
            (authSession as jest.Mock).mockResolvedValue(mockSession);

            const mockDbPost = {
                id: "post-abc",
                content: "Just standard text content",
                createdAt: new Date("2026-06-01T12:00:00.000Z"),
                updatedAt: new Date("2026-06-01T12:00:00.000Z"),
                tags: [],
                images: [],
                videos: [],
            };
            (db.post.create as jest.Mock).mockResolvedValue(mockDbPost);

            const result = await createPost({ content: "Just standard text content" });

            expect(db.post.create).toHaveBeenCalled();
            expect(result.createdAt).toBe("2026-06-01T12:00:00.000Z");
        });

        it("parses user mentions and triggers notifications and email dispatches", async () => {
            // Force fake timers to process floating promises instantly
            jest.useFakeTimers();
            (authSession as jest.Mock).mockResolvedValue(mockSession);

            const mockDbPost = {
                id: "post-abc",
                content: "Hello @Alice and @Bob",
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            (db.post.create as jest.Mock).mockResolvedValue(mockDbPost);

            // Mock matching users found in DB
            (db.user.findMany as jest.Mock).mockResolvedValue([
                { id: "user-alice", name: "Alice", email: "alice@test.com" },
                { id: "user-bob", name: "Bob", email: "bob@test.com" }
            ]);

            await createPost({ content: "Hello @Alice and @Bob" });

            expect(db.user.findMany).toHaveBeenCalled();
            expect(db.notification.createMany).toHaveBeenCalledWith({
                data: [
                    { type: "MENTION", message: "Awah Ken mentioned you in a post", link: "/feeds", userId: "user-alice" },
                    { type: "MENTION", message: "Awah Ken mentioned you in a post", link: "/feeds", userId: "user-bob" },
                ]
            });

            expect(sendNotificationEmail).toHaveBeenCalledTimes(2);
            jest.useRealTimers();
        });
    });

    describe("getPosts", () => {
        it("returns paginated data structure and builds recent activity objects cleanly", async () => {
            const mockPosts = [
                {
                    id: "post-1",
                    likes: [{ userId: "user-2", reactionType: "Like", user: { id: "user-2", name: "User 2", image: null } }],
                    comments: [],
                    _count: { likes: 1, comments: 0 }
                }
            ];
            (db.post.findMany as jest.Mock).mockResolvedValue(mockPosts);
            (db.post.count as jest.Mock).mockResolvedValue(1);

            const result = await getPosts(1, 10);

            expect(result.posts).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.posts[0].recentActivity.users).toHaveLength(1);
        });
    });

    describe("getTrendingTags", () => {
        it("maps PostgreSQL native BigInt counts safely down to standard JavaScript Numbers", async () => {
            // Simulating what db.$queryRaw returns when working with postgres arrays
            (db.$queryRaw as jest.Mock).mockResolvedValue([
                { tag: "ethics", count: BigInt(42) },
                { tag: "health", count: BigInt(12) }
            ]);

            const result = await getTrendingTags(2);

            expect(result).toEqual([
                { tag: "Ethics", posts: 42 },
                { tag: "Health", posts: 12 }
            ]);
        });
    });

    describe("toggleLike", () => {
        it("deletes the record if an identical user reaction match exists", async () => {
            (authSession as jest.Mock).mockResolvedValue(mockSession);
            (db.like.findUnique as jest.Mock).mockResolvedValue({ id: "like-id", reactionType: "Like" });

            const result = await toggleLike("post-1", "Like");

            expect(db.like.delete).toHaveBeenCalled();
            expect(result).toEqual({ liked: false, reactionType: null });
        });

        it("updates the data record if a different reaction layout profile is passed", async () => {
            (authSession as jest.Mock).mockResolvedValue(mockSession);
            (db.like.findUnique as jest.Mock).mockResolvedValue({ id: "like-id", reactionType: "Like" });

            const result = await toggleLike("post-1", "Love");

            expect(db.like.update).toHaveBeenCalledWith({
                where: { id: "like-id" },
                data: { reactionType: "Love" }
            });
            expect(result).toEqual({ liked: true, reactionType: "Love" });
        });

        it("creates a brand new row entry and fires notifications if no matching record is found", async () => {
            (authSession as jest.Mock).mockResolvedValue(mockSession);
            (db.like.findUnique as jest.Mock).mockResolvedValue(null);
            (db.post.findUnique as jest.Mock).mockResolvedValue({
                userId: "owner-id",
                user: { role: "user", email: "owner@test.com", name: "Owner" }
            });

            const result = await toggleLike("post-1", "Celebrate");

            expect(db.like.create).toHaveBeenCalled();
            expect(db.notification.create).toHaveBeenCalled();
            expect(sendNotificationEmail).toHaveBeenCalled();
            expect(notifyAdmins).toHaveBeenCalled();
            expect(result).toEqual({ liked: true, reactionType: "Celebrate" });
        });
    });

    describe("addComment", () => {
        it("saves the comment structural entry configuration seamlessly", async () => {
            (authSession as jest.Mock).mockResolvedValue(mockSession);
            (db.comment.create as jest.Mock).mockResolvedValue({ id: "comment-99", content: "Great read!" });
            (db.post.findUnique as jest.Mock).mockResolvedValue(null); // Short-circuit notifications cascade for simplicity

            const result = await addComment("post-1", "Great read!");

            expect(db.comment.create).toHaveBeenCalledWith({
                data: {
                    content: "Great read!",
                    postId: "post-1",
                    userId: "user-123",
                    parentId: null
                },
                include: { user: { select: { id: true, name: true, image: true, role: true } } }
            });
            expect(result.content).toBe("Great read!");
        });
    });
});