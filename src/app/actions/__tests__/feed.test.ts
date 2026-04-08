/**
 * Integration tests for feed actions
 * These tests mock the database and auth to test the feed action functions
 */

import { toggleLike, addComment, toggleCommentLike } from "../../app/actions/feed";

// Mock dependencies
jest.mock("@/lib/auth-utils", () => ({
    authSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
    db: {
        like: {
            findUnique: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
        },
        comment: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        commentLike: {
            findUnique: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
        },
        post: {
            findUnique: jest.fn(),
        },
        notification: {
            create: jest.fn(),
            createMany: jest.fn(),
        },
        user: {
            findMany: jest.fn(),
        },
    },
}));

jest.mock("@/lib/notify-admins", () => ({
    notifyAdmins: jest.fn(),
}));

jest.mock("@/lib/send-notification-email", () => ({
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

const mockAuthSession = authSession as jest.MockedFunction<typeof authSession>;

describe("Feed Actions - toggleLike", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthSession.mockResolvedValue({
            user: { id: "user-1", name: "Test User" },
            session: { id: "session-1" },
        } as any);
    });

    it("creates a new like when user hasn't liked the post", async () => {
        (db.like.findUnique as jest.Mock).mockResolvedValue(null);
        (db.like.create as jest.Mock).mockResolvedValue({ id: "like-1" });
        (db.post.findUnique as jest.Mock).mockResolvedValue({
            id: "post-1",
            userId: "user-2",
            user: { role: "user", email: "post-owner@example.com", name: "Post Owner" },
        });

        const result = await toggleLike("post-1", "Like");

        expect(db.like.create).toHaveBeenCalledWith({
            data: { postId: "post-1", userId: "user-1", reactionType: "Like" },
        });
        expect(result).toEqual({ liked: true, reactionType: "Like" });
    });

    it("removes like when user clicks same reaction again", async () => {
        (db.like.findUnique as jest.Mock).mockResolvedValue({
            id: "like-1",
            reactionType: "Like",
        });
        (db.like.delete as jest.Mock).mockResolvedValue({ id: "like-1" });

        const result = await toggleLike("post-1", "Like");

        expect(db.like.delete).toHaveBeenCalledWith({ where: { id: "like-1" } });
        expect(result).toEqual({ liked: false, reactionType: null });
    });

    it("updates reaction when user selects different reaction", async () => {
        (db.like.findUnique as jest.Mock).mockResolvedValue({
            id: "like-1",
            reactionType: "Like",
        });
        (db.like.update as jest.Mock).mockResolvedValue({
            id: "like-1",
            reactionType: "Love",
        });

        const result = await toggleLike("post-1", "Love");

        expect(db.like.update).toHaveBeenCalledWith({
            where: { id: "like-1" },
            data: { reactionType: "Love" },
        });
        expect(result).toEqual({ liked: true, reactionType: "Love" });
    });

    it("throws error when user is not authenticated", async () => {
        mockAuthSession.mockResolvedValue(null);

        await expect(toggleLike("post-1", "Like")).rejects.toThrow("Unauthorized");
    });

    it("creates notification for post owner", async () => {
        (db.like.findUnique as jest.Mock).mockResolvedValue(null);
        (db.like.create as jest.Mock).mockResolvedValue({ id: "like-1" });
        (db.post.findUnique as jest.Mock).mockResolvedValue({
            id: "post-1",
            userId: "user-2",
            user: { role: "user", email: "owner@example.com", name: "Owner" },
        });

        await toggleLike("post-1", "Like");

        expect(db.notification.create).toHaveBeenCalled();
    });

    it("does not create notification for own post", async () => {
        (db.like.findUnique as jest.Mock).mockResolvedValue(null);
        (db.like.create as jest.Mock).mockResolvedValue({ id: "like-1" });
        (db.post.findUnique as jest.Mock).mockResolvedValue({
            id: "post-1",
            userId: "user-1", // Same as current user
            user: { role: "user", email: "user@example.com", name: "User" },
        });

        await toggleLike("post-1", "Like");

        expect(db.notification.create).not.toHaveBeenCalled();
    });
});

describe("Feed Actions - addComment", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthSession.mockResolvedValue({
            user: { id: "user-1", name: "Test User" },
            session: { id: "session-1" },
        } as any);
    });

    it("creates a new comment", async () => {
        const mockComment = {
            id: "comment-1",
            content: "Great post!",
            postId: "post-1",
            userId: "user-1",
            user: { id: "user-1", name: "Test User", image: null, role: "user" },
        };

        (db.comment.create as jest.Mock).mockResolvedValue(mockComment);
        (db.post.findUnique as jest.Mock).mockResolvedValue({
            id: "post-1",
            userId: "user-2",
            user: { role: "user", email: "owner@example.com", name: "Owner" },
        });
        (db.user.findMany as jest.Mock).mockResolvedValue([]);

        const result = await addComment("post-1", "Great post!");

        expect(db.comment.create).toHaveBeenCalledWith({
            data: {
                content: "Great post!",
                postId: "post-1",
                userId: "user-1",
                parentId: null,
            },
            include: {
                user: { select: { id: true, name: true, image: true, role: true } },
            },
        });
        expect(result).toEqual(mockComment);
    });

    it("creates a reply to a comment", async () => {
        const mockReply = {
            id: "comment-2",
            content: "Thanks!",
            postId: "post-1",
            userId: "user-1",
            parentId: "comment-1",
            user: { id: "user-1", name: "Test User", image: null, role: "user" },
        };

        (db.comment.create as jest.Mock).mockResolvedValue(mockReply);
        (db.post.findUnique as jest.Mock).mockResolvedValue({
            id: "post-1",
            userId: "user-2",
            user: { role: "user", email: "owner@example.com", name: "Owner" },
        });
        (db.comment.findUnique as jest.Mock).mockResolvedValue({
            id: "comment-1",
            userId: "user-2",
            user: { email: "commenter@example.com", name: "Commenter" },
        });
        (db.user.findMany as jest.Mock).mockResolvedValue([]);

        const result = await addComment("post-1", "Thanks!", "comment-1");

        expect(db.comment.create).toHaveBeenCalledWith({
            data: {
                content: "Thanks!",
                postId: "post-1",
                userId: "user-1",
                parentId: "comment-1",
            },
            include: {
                user: { select: { id: true, name: true, image: true, role: true } },
            },
        });
        expect(result).toEqual(mockReply);
    });

    it("throws error when user is not authenticated", async () => {
        mockAuthSession.mockResolvedValue(null);

        await expect(addComment("post-1", "Comment")).rejects.toThrow("Unauthorized");
    });

    it("creates notification for post owner", async () => {
        (db.comment.create as jest.Mock).mockResolvedValue({
            id: "comment-1",
            content: "Comment",
            user: { id: "user-1", name: "User", image: null, role: "user" },
        });
        (db.post.findUnique as jest.Mock).mockResolvedValue({
            id: "post-1",
            userId: "user-2",
            user: { role: "user", email: "owner@example.com", name: "Owner" },
        });
        (db.user.findMany as jest.Mock).mockResolvedValue([]);

        await addComment("post-1", "Comment");

        expect(db.notification.create).toHaveBeenCalled();
    });

    it("notifies mentioned users", async () => {
        (db.comment.create as jest.Mock).mockResolvedValue({
            id: "comment-1",
            content: "@Alice check this out",
            user: { id: "user-1", name: "User", image: null, role: "user" },
        });
        (db.post.findUnique as jest.Mock).mockResolvedValue({
            id: "post-1",
            userId: "user-2",
            user: { role: "user", email: "owner@example.com", name: "Owner" },
        });
        (db.user.findMany as jest.Mock).mockResolvedValue([
            { id: "user-3", email: "alice@example.com", name: "Alice" },
        ]);

        await addComment("post-1", "@Alice check this out");

        expect(db.notification.createMany).toHaveBeenCalled();
    });
});

describe("Feed Actions - toggleCommentLike", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthSession.mockResolvedValue({
            user: { id: "user-1", name: "Test User" },
            session: { id: "session-1" },
        } as any);
    });

    it("creates a new comment like", async () => {
        (db.commentLike.findUnique as jest.Mock).mockResolvedValue(null);
        (db.commentLike.create as jest.Mock).mockResolvedValue({ id: "like-1" });
        (db.comment.findUnique as jest.Mock).mockResolvedValue({
            id: "comment-1",
            userId: "user-2",
            user: { email: "commenter@example.com", name: "Commenter" },
        });

        const result = await toggleCommentLike("comment-1", false, "Like");

        expect(db.commentLike.create).toHaveBeenCalledWith({
            data: {
                commentId: "comment-1",
                userId: "user-1",
                isDislike: false,
                reactionType: "Like",
            },
        });
        expect(result).toEqual({ action: "reacted", reactionType: "Like" });
    });

    it("removes reaction when clicking same reaction", async () => {
        (db.commentLike.findUnique as jest.Mock).mockResolvedValue({
            id: "like-1",
            reactionType: "Like",
        });
        (db.commentLike.delete as jest.Mock).mockResolvedValue({ id: "like-1" });

        const result = await toggleCommentLike("comment-1", false, "Like");

        expect(db.commentLike.delete).toHaveBeenCalledWith({ where: { id: "like-1" } });
        expect(result).toEqual({ action: "removed", reactionType: null });
    });

    it("updates reaction when selecting different reaction", async () => {
        (db.commentLike.findUnique as jest.Mock).mockResolvedValue({
            id: "like-1",
            reactionType: "Like",
        });
        (db.commentLike.update as jest.Mock).mockResolvedValue({
            id: "like-1",
            reactionType: "Love",
        });

        const result = await toggleCommentLike("comment-1", false, "Love");

        expect(db.commentLike.update).toHaveBeenCalledWith({
            where: { id: "like-1" },
            data: { reactionType: "Love", isDislike: false },
        });
        expect(result).toEqual({ action: "reacted", reactionType: "Love" });
    });

    it("throws error when user is not authenticated", async () => {
        mockAuthSession.mockResolvedValue(null);

        await expect(toggleCommentLike("comment-1", false, "Like")).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("creates notification for comment owner", async () => {
        (db.commentLike.findUnique as jest.Mock).mockResolvedValue(null);
        (db.commentLike.create as jest.Mock).mockResolvedValue({ id: "like-1" });
        (db.comment.findUnique as jest.Mock).mockResolvedValue({
            id: "comment-1",
            userId: "user-2",
            user: { email: "commenter@example.com", name: "Commenter" },
        });

        await toggleCommentLike("comment-1", false, "Like");

        expect(db.notification.create).toHaveBeenCalled();
    });

    it("does not create notification for own comment", async () => {
        (db.commentLike.findUnique as jest.Mock).mockResolvedValue(null);
        (db.commentLike.create as jest.Mock).mockResolvedValue({ id: "like-1" });
        (db.comment.findUnique as jest.Mock).mockResolvedValue({
            id: "comment-1",
            userId: "user-1", // Same as current user
            user: { email: "user@example.com", name: "User" },
        });

        await toggleCommentLike("comment-1", false, "Like");

        expect(db.notification.create).not.toHaveBeenCalled();
    });
});
