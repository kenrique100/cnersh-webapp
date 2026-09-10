"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { isAdminRole, canManageRole } from "@/lib/permissions";
import { sanitizeText, sanitizeUrl } from "@/lib/sanitize";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { z } from "zod";

const idSchema = z.string().trim().min(1).max(128);
const pageSchema = z.number().int().min(1).max(1_000_000).catch(1);
const limitSchema = z.number().int().min(1).max(50).catch(10);
const shortText = z.string().trim().min(1).max(200).transform(sanitizeText);
const contentText = z.string().trim().min(1).max(10_000).transform(sanitizeText);

type CommunityActor = {
    session: NonNullable<Awaited<ReturnType<typeof authSession>>>;
    role: "admin" | "superadmin";
};

async function requireCommunityAccess(): Promise<CommunityActor> {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (!isAdminRole(user?.role)) {
        throw new Error("Only admins and superadmins can access the community");
    }
    return { session, role: user.role };
}

function cleanOptionalText(value: string | undefined, max = 1_000) {
    if (value === undefined) return undefined;
    return z.string().trim().max(max).transform(sanitizeText).parse(value) || undefined;
}

function cleanOptionalUrl(value: string | null | undefined): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value.trim() === "") return null;
    if (value.length > 2_048) throw new Error("Invalid URL");
    const safe = sanitizeUrl(value);
    if (!safe) throw new Error("Invalid URL");
    return safe;
}

function cleanUrls(values: string[] | undefined, max: number) {
    if (values === undefined) return undefined;
    return z.array(z.string()).max(max).parse(values).map((value) => cleanOptionalUrl(value)).filter(
        (value): value is string => Boolean(value),
    );
}

export async function createTopic(data: {
    title: string;
    content: string;
    category: string;
    image?: string;
    images?: string[];
    video?: string;
    videos?: string[];
    documents?: string[];
    linkUrl?: string;
}) {
    const { session } = await requireCommunityAccess();
    const title = shortText.parse(data.title);
    const content = contentText.parse(data.content);
    const category = z.string().trim().min(1).max(80).transform(sanitizeText).parse(data.category);
    const image = cleanOptionalUrl(data.image);
    const images = cleanUrls(data.images, 10) ?? [];
    const video = cleanOptionalUrl(data.video);
    const videos = cleanUrls(data.videos, 5) ?? [];
    const documents = cleanUrls(data.documents, 10) ?? [];
    const linkUrl = cleanOptionalUrl(data.linkUrl);

    const topic = await db.communityTopic.create({
        data: {
            title,
            content,
            category,
            image: image || null,
            images,
            video: video || null,
            videos,
            documents,
            linkUrl: linkUrl || null,
            userId: session.user.id,
        },
        include: {
            user: { select: { id: true, name: true, image: true, role: true } },
            _count: { select: { replies: true, likes: true } },
            likes: { select: { userId: true, isDislike: true } },
        },
    });

    if (category === "Announcements") {
        try {
            const communityUsers = await db.user.findMany({
                where: {
                    id: { not: session.user.id },
                    role: { in: ["admin", "superadmin"] },
                    banned: { not: true },
                },
                select: { id: true, email: true, name: true },
            });
            const message = `New announcement: ${title}`;
            if (communityUsers.length) {
                await db.notification.createMany({
                    data: communityUsers.map((user) => ({
                        type: "ANNOUNCEMENT" as const,
                        message,
                        link: "/community",
                        userId: user.id,
                    })),
                });
                void Promise.allSettled(communityUsers.filter((user) => user.email).map((user) =>
                    sendNotificationEmail({
                        to: user.email,
                        userName: user.name || "User",
                        notificationMessage: message,
                        notificationType: "ANNOUNCEMENT",
                        actionUrl: "/community",
                    }),
                ));
            }
        } catch (error) {
            console.error("Error sending announcement notifications:", error);
        }
    }
    return topic;
}

export async function getTopics(category?: string, page = 1, limit = 10) {
    await requireCommunityAccess();
    const safePage = pageSchema.parse(page);
    const safeLimit = limitSchema.parse(limit);
    const safeCategory = category
        ? z.string().trim().min(1).max(80).transform(sanitizeText).parse(category)
        : undefined;
    const where = { deleted: false, ...(safeCategory ? { category: safeCategory } : {}) };
    try {
        const [topics, total] = await Promise.all([
            db.communityTopic.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, image: true, role: true } },
                    _count: { select: { replies: { where: { deleted: false } }, likes: true } },
                    likes: { select: { userId: true, isDislike: true } },
                },
                orderBy: { createdAt: "desc" },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            db.communityTopic.count({ where }),
        ]);
        return { topics, total, pages: Math.ceil(total / safeLimit) };
    } catch (error) {
        console.error("Error fetching topics:", error);
        return { topics: [], total: 0, pages: 0 };
    }
}

export async function getTopicWithReplies(topicId: string) {
    await requireCommunityAccess();
    const id = idSchema.parse(topicId);
    const topic = await db.communityTopic.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, image: true, role: true } },
            likes: { select: { userId: true, isDislike: true } },
            replies: {
                where: { deleted: false, parentId: null },
                include: {
                    user: { select: { id: true, name: true, image: true, role: true } },
                    children: {
                        where: { deleted: false },
                        include: {
                            user: { select: { id: true, name: true, image: true, role: true } },
                            children: {
                                where: { deleted: false },
                                include: {
                                    user: { select: { id: true, name: true, image: true, role: true } },
                                },
                                orderBy: { createdAt: "asc" },
                            },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });
    return topic?.deleted ? null : topic;
}

export async function addReply(data: {
    topicId: string;
    content: string;
    parentId?: string;
    image?: string;
    images?: string[];
    video?: string;
    videos?: string[];
    audio?: string;
    audios?: string[];
    voiceNote?: string;
    document?: string;
    documents?: string[];
    linkUrl?: string;
    pollQuestion?: string;
    pollOptions?: string[];
    eventTitle?: string;
    eventDate?: string;
    eventLocation?: string;
}) {
    const { session } = await requireCommunityAccess();
    const topicId = idSchema.parse(data.topicId);
    const parentId = data.parentId ? idSchema.parse(data.parentId) : undefined;
    const content = contentText.parse(data.content);
    const topic = await db.communityTopic.findUnique({
        where: { id: topicId },
        select: { chatEnabled: true, deleted: true },
    });
    if (!topic || topic.deleted) throw new Error("Topic not found");
    if (!topic.chatEnabled) throw new Error("Topic is closed");

    const parentReply = parentId
        ? await db.communityReply.findUnique({
            where: { id: parentId },
            select: { userId: true, topicId: true, deleted: true, user: { select: { email: true, name: true } } },
        })
        : null;
    if (parentId && (!parentReply || parentReply.deleted || parentReply.topicId !== topicId)) {
        throw new Error("Invalid parent reply");
    }

    const pollQuestion = cleanOptionalText(data.pollQuestion, 300);
    const pollOptions = data.pollOptions === undefined
        ? []
        : z.array(z.string().trim().min(1).max(200).transform(sanitizeText)).min(2).max(10).parse(data.pollOptions);
    if (Boolean(pollQuestion) !== (pollOptions.length > 0)) throw new Error("Invalid poll");
    const eventDate = data.eventDate ? new Date(data.eventDate) : null;
    if (eventDate && Number.isNaN(eventDate.getTime())) throw new Error("Invalid event date");

    const reply = await db.communityReply.create({
        data: {
            content,
            topicId,
            parentId: parentId || null,
            image: cleanOptionalUrl(data.image) || null,
            images: cleanUrls(data.images, 10) ?? [],
            video: cleanOptionalUrl(data.video) || null,
            videos: cleanUrls(data.videos, 5) ?? [],
            audio: cleanOptionalUrl(data.audio) || null,
            audios: cleanUrls(data.audios, 5) ?? [],
            voiceNote: cleanOptionalUrl(data.voiceNote) || null,
            document: cleanOptionalUrl(data.document) || null,
            documents: cleanUrls(data.documents, 10) ?? [],
            linkUrl: cleanOptionalUrl(data.linkUrl) || null,
            pollQuestion: pollQuestion || null,
            pollOptions,
            pollVotes: pollQuestion ? {} : undefined,
            eventTitle: cleanOptionalText(data.eventTitle, 200) || null,
            eventDate,
            eventLocation: cleanOptionalText(data.eventLocation, 300) || null,
            userId: session.user.id,
        },
        include: {
            user: { select: { id: true, name: true, image: true, role: true } },
        },
    });

    try {
        const notifications: { type: "MENTION" | "COMMENT"; message: string; link: string; userId: string }[] = [];
        const names = [...content.matchAll(/@(\w+(?:\s\w+)?)/g)].map((match) => match[1].trim()).slice(0, 20);
        if (names.length) {
            const mentionedUsers = await db.user.findMany({
                where: {
                    name: { in: names },
                    role: { in: ["admin", "superadmin"] },
                    banned: { not: true },
                    id: { not: session.user.id },
                },
                select: { id: true },
            });
            notifications.push(...mentionedUsers.map((user) => ({
                type: "MENTION" as const,
                message: `${session.user.name || "Someone"} mentioned you in the community`,
                link: "/community",
                userId: user.id,
            })));
        }
        if (parentReply && parentReply.userId !== session.user.id) {
            notifications.push({
                type: "COMMENT",
                message: `${session.user.name || "Someone"} replied to your message in the community`,
                link: "/community",
                userId: parentReply.userId,
            });
        }
        if (notifications.length) await db.notification.createMany({ data: notifications });
        await notifyAdmins({
            type: "COMMENT",
            message: `${session.user.name || "An administrator"} posted a reply in the community`,
            link: "/community",
            excludeUserId: session.user.id,
        });
    } catch (error) {
        console.error("Error creating community notifications:", error);
    }
    return reply;
}

export async function getCommunityUsers() {
    await requireCommunityAccess();
    try {
        return await db.user.findMany({
            where: {
                role: { in: ["admin", "superadmin"] },
                banned: { not: true },
            },
            select: { id: true, name: true, image: true, role: true },
            orderBy: { name: "asc" },
            take: 500,
        });
    } catch (error) {
        console.error("Error fetching community users:", error);
        return [];
    }
}

async function canDeleteCommunityContent(
    actor: CommunityActor,
    ownerId: string,
    ownerRole: string | null,
) {
    return ownerId === actor.session.user.id || canManageRole(actor.role, ownerRole);
}

export async function deleteTopic(topicId: string) {
    const actor = await requireCommunityAccess();
    const id = idSchema.parse(topicId);
    const topic = await db.communityTopic.findUnique({
        where: { id },
        select: { userId: true, deleted: true, user: { select: { role: true } } },
    });
    if (!topic || topic.deleted) throw new Error("Topic not found");
    if (!await canDeleteCommunityContent(actor, topic.userId, topic.user.role)) throw new Error("Forbidden");
    await db.communityTopic.update({ where: { id }, data: { deleted: true } });
    await db.auditLog.create({
        data: {
            action: "DELETE_TOPIC",
            details: "Community topic deleted",
            targetId: id,
            userId: actor.session.user.id,
        },
    });
    return { success: true };
}

export async function deleteReply(replyId: string) {
    const actor = await requireCommunityAccess();
    const id = idSchema.parse(replyId);
    const reply = await db.communityReply.findUnique({
        where: { id },
        select: {
            userId: true,
            deleted: true,
            topic: { select: { deleted: true } },
            user: { select: { role: true } },
        },
    });
    if (!reply || reply.deleted || reply.topic.deleted) throw new Error("Reply not found");
    if (!await canDeleteCommunityContent(actor, reply.userId, reply.user.role)) throw new Error("Forbidden");
    await db.communityReply.update({ where: { id }, data: { deleted: true } });
    await db.auditLog.create({
        data: {
            action: "DELETE_REPLY",
            details: "Community reply deleted",
            targetId: id,
            userId: actor.session.user.id,
        },
    });
    return { success: true };
}

export async function editReply(replyId: string, content: string) {
    const { session } = await requireCommunityAccess();
    const id = idSchema.parse(replyId);
    const safeContent = contentText.parse(content);
    const reply = await db.communityReply.findUnique({
        where: { id },
        select: { userId: true, deleted: true, topic: { select: { chatEnabled: true, deleted: true } } },
    });
    if (!reply || reply.deleted || reply.topic.deleted) throw new Error("Reply not found");
    if (!reply.topic.chatEnabled) throw new Error("Topic is closed");
    if (reply.userId !== session.user.id) throw new Error("Forbidden");
    return db.communityReply.update({ where: { id }, data: { content: safeContent } });
}

export async function editTopic(topicId: string, data: {
    title?: string;
    content?: string;
    image?: string | null;
    images?: string[];
    video?: string | null;
    videos?: string[];
    documents?: string[];
    linkUrl?: string | null;
}) {
    const { session } = await requireCommunityAccess();
    const id = idSchema.parse(topicId);
    const topic = await db.communityTopic.findUnique({
        where: { id },
        select: { userId: true, deleted: true },
    });
    if (!topic || topic.deleted) throw new Error("Topic not found");
    if (topic.userId !== session.user.id) throw new Error("Forbidden");
    return db.communityTopic.update({
        where: { id },
        data: {
            ...(data.title !== undefined ? { title: shortText.parse(data.title) } : {}),
            ...(data.content !== undefined ? { content: contentText.parse(data.content) } : {}),
            ...(data.image !== undefined ? { image: cleanOptionalUrl(data.image) } : {}),
            ...(data.images !== undefined ? { images: cleanUrls(data.images, 10) } : {}),
            ...(data.video !== undefined ? { video: cleanOptionalUrl(data.video) } : {}),
            ...(data.videos !== undefined ? { videos: cleanUrls(data.videos, 5) } : {}),
            ...(data.documents !== undefined ? { documents: cleanUrls(data.documents, 10) } : {}),
            ...(data.linkUrl !== undefined ? { linkUrl: cleanOptionalUrl(data.linkUrl) } : {}),
        },
    });
}

export async function toggleTopicChat(topicId: string) {
    const actor = await requireCommunityAccess();
    const id = idSchema.parse(topicId);
    const topic = await db.communityTopic.findUnique({
        where: { id },
        select: { userId: true, chatEnabled: true, deleted: true },
    });
    if (!topic || topic.deleted) throw new Error("Topic not found");
    if (topic.userId !== actor.session.user.id && actor.role !== "superadmin") {
        throw new Error("Only the channel creator or super admin can toggle chat");
    }
    return db.communityTopic.update({
        where: { id },
        data: { chatEnabled: !topic.chatEnabled },
        select: { chatEnabled: true },
    });
}

export async function toggleTopicLike(topicId: string, isDislike = false) {
    const { session } = await requireCommunityAccess();
    const id = idSchema.parse(topicId);
    const topic = await db.communityTopic.findUnique({
        where: { id },
        select: { chatEnabled: true, deleted: true },
    });
    if (!topic || topic.deleted) throw new Error("Topic not found");
    if (!topic.chatEnabled) throw new Error("Topic is closed");
    const existing = await db.communityTopicLike.findUnique({
        where: { topicId_userId: { topicId: id, userId: session.user.id } },
    });
    if (existing?.isDislike === isDislike) {
        await db.communityTopicLike.delete({ where: { id: existing.id } });
        return { action: "removed" };
    }
    if (existing) {
        await db.communityTopicLike.update({ where: { id: existing.id }, data: { isDislike } });
    } else {
        await db.communityTopicLike.create({
            data: { topicId: id, userId: session.user.id, isDislike },
        });
    }
    return { action: isDislike ? "disliked" : "liked" };
}

export async function voteOnPoll(replyId: string, optionIndex: number) {
    const { session } = await requireCommunityAccess();
    const id = idSchema.parse(replyId);
    if (!Number.isInteger(optionIndex)) throw new Error("Invalid poll option");
    const reply = await db.communityReply.findUnique({
        where: { id },
        select: {
            pollVotes: true,
            pollOptions: true,
            deleted: true,
            topic: { select: { deleted: true, chatEnabled: true } },
        },
    });
    if (!reply || reply.deleted || reply.topic.deleted || !reply.topic.chatEnabled ||
        !reply.pollOptions.length || optionIndex < 0 || optionIndex >= reply.pollOptions.length) {
        throw new Error("Poll not found");
    }
    const votes = { ...((reply.pollVotes as Record<string, number>) || {}) };
    if (votes[session.user.id] === optionIndex) delete votes[session.user.id];
    else votes[session.user.id] = optionIndex;
    await db.communityReply.update({ where: { id }, data: { pollVotes: votes } });
    return { success: true, votes };
}
