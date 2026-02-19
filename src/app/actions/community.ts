"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";

export async function createTopic(data: {
    title: string;
    content: string;
    category: string;
    image?: string;
    video?: string;
    linkUrl?: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    // Only admins can create announcements
    if (data.category === "Announcements") {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });
        const isAdmin = user?.role === "admin" || user?.role === "superadmin";
        if (!isAdmin) throw new Error("Only admins can create announcements");
    }

    const topic = await db.communityTopic.create({
        data: {
            title: data.title,
            content: data.content,
            category: data.category,
            image: data.image || null,
            video: data.video || null,
            linkUrl: data.linkUrl || null,
            userId: session.user.id,
        },
    });

    // If it's an announcement, notify all users and send emails
    if (data.category === "Announcements") {
        try {
            const allUsers = await db.user.findMany({
                where: {
                    id: { not: session.user.id },
                    banned: { not: true },
                },
                select: { id: true, email: true, name: true },
            });

            if (allUsers.length > 0) {
                const announcementMessage = `New announcement: ${data.title}`;
                await db.notification.createMany({
                    data: allUsers.map((u) => ({
                        type: "ANNOUNCEMENT" as const,
                        message: announcementMessage,
                        link: "/community",
                        userId: u.id,
                    })),
                });

                // Send email notifications (non-blocking)
                for (const u of allUsers) {
                    if (u.email) {
                        sendNotificationEmail({
                            to: u.email,
                            userName: u.name || "User",
                            notificationMessage: announcementMessage,
                            notificationType: "ANNOUNCEMENT",
                            actionUrl: "/community",
                        }).catch((err) => console.error("Error sending announcement email:", err));
                    }
                }
            }
        } catch (error) {
            console.error("Error sending announcement notifications:", error);
        }
    }

    return topic;
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
                    user: { select: { id: true, name: true, image: true, role: true } },
                    _count: { select: { replies: true, likes: true } },
                    likes: { select: { userId: true, isDislike: true } },
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
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const reply = await db.communityReply.create({
        data: {
            content: data.content,
            topicId: data.topicId,
            parentId: data.parentId || null,
            image: data.image || null,
            images: data.images || [],
            video: data.video || null,
            videos: data.videos || [],
            audio: data.audio || null,
            audios: data.audios || [],
            voiceNote: data.voiceNote || null,
            document: data.document || null,
            documents: data.documents || [],
            linkUrl: data.linkUrl || null,
            pollQuestion: data.pollQuestion || null,
            pollOptions: data.pollOptions || [],
            pollVotes: data.pollQuestion ? {} : undefined,
            eventTitle: data.eventTitle || null,
            eventDate: data.eventDate ? new Date(data.eventDate) : null,
            eventLocation: data.eventLocation || null,
            userId: session.user.id,
        },
        include: {
            user: { select: { id: true, name: true, image: true, role: true } },
        },
    });

    // Create notifications asynchronously (don't block the reply)
    try {
        const notifications: { type: "MENTION" | "COMMENT"; message: string; link: string; userId: string }[] = [];
        const emailRecipients: { email: string; name: string; message: string; type: string }[] = [];

        // Notify @mentioned users
        const mentionMatches = data.content.match(/@(\w+(?:\s\w+)?)/g);
        if (mentionMatches) {
            const mentionedNames = mentionMatches.map(m => m.slice(1).trim());
            const mentionedUsers = await db.user.findMany({
                where: { name: { in: mentionedNames }, banned: { not: true } },
                select: { id: true, email: true, name: true },
            });
            for (const u of mentionedUsers) {
                if (u.id !== session.user.id) {
                    const mentionMessage = `${session.user.name || "Someone"} mentioned you in the community`;
                    notifications.push({
                        type: "MENTION",
                        message: mentionMessage,
                        link: `/community`,
                        userId: u.id,
                    });
                    if (u.email) {
                        emailRecipients.push({
                            email: u.email,
                            name: u.name || "User",
                            message: mentionMessage,
                            type: "MENTION",
                        });
                    }
                }
            }
        }

        // Notify parent reply author when someone replies to their message
        if (data.parentId) {
            const parentReply = await db.communityReply.findUnique({
                where: { id: data.parentId },
                select: { userId: true, user: { select: { email: true, name: true } } },
            });
            if (parentReply && parentReply.userId !== session.user.id) {
                const replyMessage = `${session.user.name || "Someone"} replied to your message in the community`;
                notifications.push({
                    type: "COMMENT",
                    message: replyMessage,
                    link: `/community`,
                    userId: parentReply.userId,
                });
                if (parentReply.user?.email) {
                    emailRecipients.push({
                        email: parentReply.user.email,
                        name: parentReply.user.name || "User",
                        message: replyMessage,
                        type: "COMMENT",
                    });
                }
            }
        }

        if (notifications.length > 0) {
            await db.notification.createMany({ data: notifications });
        }

        // Send email notifications (non-blocking)
        for (const recipient of emailRecipients) {
            sendNotificationEmail({
                to: recipient.email,
                userName: recipient.name,
                notificationMessage: recipient.message,
                notificationType: recipient.type,
                actionUrl: "/community",
            }).catch((err) => console.error("Error sending community email:", err));
        }

        // Also notify admins about community activity
        await notifyAdmins({
            type: "COMMENT",
            message: `${session.user.name || "A user"} posted a reply in the community`,
            link: "/community",
            excludeUserId: session.user.id,
        });
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

export async function editTopic(topicId: string, data: {
    title?: string;
    content?: string;
    image?: string | null;
    video?: string | null;
    linkUrl?: string | null;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const topic = await db.communityTopic.findUnique({
        where: { id: topicId },
        select: { userId: true, category: true },
    });

    if (!topic) throw new Error("Topic not found");

    // For announcements, only admins can edit
    if (topic.category === "Announcements") {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });
        const isAdmin = user?.role === "admin" || user?.role === "superadmin";
        if (!isAdmin) throw new Error("Only admins can edit announcements");
    } else {
        if (topic.userId !== session.user.id) throw new Error("Forbidden");
    }

    return db.communityTopic.update({
        where: { id: topicId },
        data: {
            ...(data.title !== undefined ? { title: data.title } : {}),
            ...(data.content !== undefined ? { content: data.content } : {}),
            ...(data.image !== undefined ? { image: data.image } : {}),
            ...(data.video !== undefined ? { video: data.video } : {}),
            ...(data.linkUrl !== undefined ? { linkUrl: data.linkUrl } : {}),
        },
    });
}

export async function toggleTopicLike(topicId: string, isDislike: boolean = false) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const existing = await db.communityTopicLike.findUnique({
        where: { topicId_userId: { topicId, userId: session.user.id } },
    });

    if (existing) {
        if (existing.isDislike === isDislike) {
            await db.communityTopicLike.delete({ where: { id: existing.id } });
            return { action: "removed" };
        } else {
            await db.communityTopicLike.update({ where: { id: existing.id }, data: { isDislike } });
            return { action: isDislike ? "disliked" : "liked" };
        }
    } else {
        await db.communityTopicLike.create({
            data: { topicId, userId: session.user.id, isDislike },
        });
        return { action: isDislike ? "disliked" : "liked" };
    }
}

export async function voteOnPoll(replyId: string, optionIndex: number) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const reply = await db.communityReply.findUnique({
        where: { id: replyId },
        select: { pollVotes: true, pollOptions: true },
    });

    if (!reply || !reply.pollOptions.length) throw new Error("Poll not found");

    const votes = (reply.pollVotes as Record<string, number>) || {};
    const voteKey = `${session.user.id}`;
    
    // Remove previous vote if any
    const previousVote = Object.entries(votes).find(([, v]) => v === undefined);
    if (previousVote) delete votes[previousVote[0]];
    
    // Set new vote
    votes[voteKey] = optionIndex;

    await db.communityReply.update({
        where: { id: replyId },
        data: { pollVotes: votes },
    });

    return { success: true, votes };
}
