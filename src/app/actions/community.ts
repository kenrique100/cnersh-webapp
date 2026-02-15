"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function createTopic(data: {
    title: string;
    content: string;
    category: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    return db.communityTopic.create({
        data: {
            title: data.title,
            content: data.content,
            category: data.category,
            userId: session.user.id,
        },
    });
}

export async function getTopics(category?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    try {
        const [topics, total] = await Promise.all([
            db.communityTopic.findMany({
                where: {
                    deleted: false,
                    ...(category ? { category } : {}),
                },
                include: {
                    user: { select: { id: true, name: true, image: true } },
                    _count: { select: { replies: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            db.communityTopic.count({
                where: {
                    deleted: false,
                    ...(category ? { category } : {}),
                },
            }),
        ]);

        return { topics, total, pages: Math.ceil(total / limit) };
    } catch (error) {
        console.error("Error fetching topics:", error);
        return { topics: [], total: 0, pages: 0 };
    }
}

export async function getTopicWithReplies(topicId: string) {
    const topic = await db.communityTopic.findUnique({
        where: { id: topicId, deleted: false },
        include: {
            user: { select: { id: true, name: true, image: true } },
            replies: {
                where: { deleted: false, parentId: null },
                include: {
                    user: { select: { id: true, name: true, image: true } },
                    children: {
                        where: { deleted: false },
                        include: {
                            user: { select: { id: true, name: true, image: true } },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    return topic;
}

export async function addReply(data: {
    topicId: string;
    content: string;
    parentId?: string;
    image?: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const reply = await db.communityReply.create({
        data: {
            content: data.content,
            topicId: data.topicId,
            parentId: data.parentId || null,
            image: data.image || null,
            userId: session.user.id,
        },
        include: {
            user: { select: { id: true, name: true, image: true } },
        },
    });

    // Create notifications asynchronously (don't block the reply)
    try {
        const notifications: { type: "MENTION" | "COMMENT"; message: string; link: string; userId: string }[] = [];

        // Notify @mentioned users
        const mentionMatches = data.content.match(/@(\w+(?:\s\w+)?)/g);
        if (mentionMatches) {
            const mentionedNames = mentionMatches.map(m => m.slice(1).trim());
            const mentionedUsers = await db.user.findMany({
                where: { name: { in: mentionedNames }, banned: { not: true } },
                select: { id: true },
            });
            for (const u of mentionedUsers) {
                if (u.id !== session.user.id) {
                    notifications.push({
                        type: "MENTION",
                        message: `${session.user.name || "Someone"} mentioned you in the community`,
                        link: `/community`,
                        userId: u.id,
                    });
                }
            }
        }

        // Notify parent reply author when someone replies to their message
        if (data.parentId) {
            const parentReply = await db.communityReply.findUnique({
                where: { id: data.parentId },
                select: { userId: true },
            });
            if (parentReply && parentReply.userId !== session.user.id) {
                notifications.push({
                    type: "COMMENT",
                    message: `${session.user.name || "Someone"} replied to your message in the community`,
                    link: `/community`,
                    userId: parentReply.userId,
                });
            }
        }

        if (notifications.length > 0) {
            await db.notification.createMany({ data: notifications });
        }
    } catch (error) {
        console.error("Error creating community notifications:", error);
    }

    return reply;
}

export async function getCommunityUsers() {
    try {
        const users = await db.user.findMany({
            where: { banned: { not: true } },
            select: { id: true, name: true, image: true, role: true },
            orderBy: { name: "asc" },
        });
        return users;
    } catch (error) {
        console.error("Error fetching community users:", error);
        return [];
    }
}

export async function deleteTopic(topicId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    if (!isAdmin) throw new Error("Forbidden");

    await db.communityTopic.update({
        where: { id: topicId },
        data: { deleted: true },
    });

    await db.auditLog.create({
        data: {
            action: "DELETE_TOPIC",
            details: `Community topic deleted`,
            targetId: topicId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function deleteReply(replyId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const reply = await db.communityReply.findUnique({
        where: { id: replyId },
        select: { userId: true },
    });

    if (!reply) throw new Error("Reply not found");

    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    const isOwner = reply.userId === session.user.id;

    if (!isAdmin && !isOwner) throw new Error("Forbidden");

    await db.communityReply.update({
        where: { id: replyId },
        data: { deleted: true },
    });

    await db.auditLog.create({
        data: {
            action: "DELETE_REPLY",
            details: `Community reply deleted`,
            targetId: replyId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function editReply(replyId: string, content: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const reply = await db.communityReply.findUnique({
        where: { id: replyId },
        select: { userId: true },
    });

    if (!reply) throw new Error("Reply not found");
    if (reply.userId !== session.user.id) throw new Error("Forbidden");

    const updated = await db.communityReply.update({
        where: { id: replyId },
        data: { content },
    });

    return updated;
}
