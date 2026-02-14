"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function createPost(data: { content: string; image?: string }) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const post = await db.post.create({
        data: {
            content: data.content,
            image: data.image || null,
            userId: session.user.id,
        },
    });

    return post;
}

export async function getPosts(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    try {
        const [posts, total] = await Promise.all([
            db.post.findMany({
                where: { deleted: false },
                include: {
                    user: { select: { id: true, name: true, image: true } },
                    _count: { select: { comments: true, likes: true } },
                    likes: { select: { userId: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            db.post.count({ where: { deleted: false } }),
        ]);

        return { posts, total, pages: Math.ceil(total / limit) };
    } catch (error) {
        console.error("Error fetching posts:", error);
        return { posts: [], total: 0, pages: 0 };
    }
}

export async function toggleLike(postId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const existing = await db.like.findUnique({
        where: { postId_userId: { postId, userId: session.user.id } },
    });

    if (existing) {
        await db.like.delete({ where: { id: existing.id } });
        return { liked: false };
    } else {
        await db.like.create({
            data: { postId, userId: session.user.id },
        });
        return { liked: true };
    }
}

export async function addComment(postId: string, content: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const comment = await db.comment.create({
        data: {
            content,
            postId,
            userId: session.user.id,
        },
        include: {
            user: { select: { id: true, name: true, image: true } },
        },
    });

    return comment;
}

export async function getPostComments(postId: string) {
    return db.comment.findMany({
        where: { postId, deleted: false },
        include: {
            user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
    });
}

export async function deletePost(postId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const post = await db.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error("Post not found");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const isOwner = post.userId === session.user.id;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    if (!isOwner && !isAdmin) throw new Error("Forbidden");

    await db.post.update({
        where: { id: postId },
        data: { deleted: true },
    });

    return { success: true };
}

export async function updatePost(postId: string, content: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const post = await db.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error("Post not found");
    if (post.userId !== session.user.id) throw new Error("Forbidden");

    return db.post.update({
        where: { id: postId },
        data: { content },
    });
}
