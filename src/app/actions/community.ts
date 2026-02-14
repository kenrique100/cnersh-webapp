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
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    return db.communityReply.create({
        data: {
            content: data.content,
            topicId: data.topicId,
            parentId: data.parentId || null,
            userId: session.user.id,
        },
        include: {
            user: { select: { id: true, name: true, image: true } },
        },
    });
}
