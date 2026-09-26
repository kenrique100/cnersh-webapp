"use server";

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { sanitizeText, sanitizeUrl } from "@/lib/sanitize";
import { enforceActionRateLimit } from "@/lib/action-rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { canManageRole, isAdminRole } from "@/lib/permissions";
import { z } from "zod";

const MENTION_REGEX = /@(\w[\w\s]*?)(?=\s@|$|\s)/g;

const postPayloadSchema = z.object({
    content: z.string().max(5000).transform((value) => sanitizeText(value)),
    image: z.string().optional(),
    video: z.string().optional(),
    images: z.array(z.string()).max(6).optional(),
    videos: z.array(z.string()).max(3).optional(),
    tags: z.array(z.string()).max(10).optional(),
    linkUrl: z.string().optional(),
    linkType: z.string().max(64).optional(),
});

const commentContentSchema = z.string().min(1).max(2000).transform((value) => sanitizeText(value).trim());
const idSchema = z.string().trim().min(1).max(128);
const pageSchema = z.number().int().min(1).max(1_000_000).catch(1);
const limitSchema = z.number().int().min(1).max(50).catch(10);
const reactionSchema = z.string().trim().min(1).max(64).transform(sanitizeText);
const postIdsSchema = z.array(idSchema).min(1).max(200);

export async function createPost(data: { content: string; image?: string; video?: string; images?: string[]; videos?: string[]; tags?: string[]; linkUrl?: string; linkType?: string }) {
    const session = await verifiedAuthSession();
    await enforceActionRateLimit(session.user.id, RATE_LIMITS.postCreate, "post-create", "You're posting too quickly.");

    const parsed = postPayloadSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid post content. Please review your input and try again.");
    }
    const payload = parsed.data;
    const normalizedContent = payload.content.trim();
    const normalizedImages = (payload.images || []).filter(Boolean);
    const normalizedVideos = (payload.videos || []).filter(Boolean);
    const normalizedTags = (payload.tags || []).map((tag) => sanitizeText(tag).trim()).filter(Boolean);
    const normalizedLinkUrl = payload.linkUrl ? sanitizeUrl(payload.linkUrl) : "";

    if (!normalizedContent && !payload.image && !payload.video && normalizedImages.length === 0 && normalizedVideos.length === 0) {
        throw new Error("A post must include text or media.");
    }
    if (payload.linkUrl && !normalizedLinkUrl) {
        throw new Error("Please provide a valid secure link URL.");
    }

    let post;
    try {
        post = await db.post.create({
            data: {
                content: normalizedContent,
                image: payload.image || null,
                video: payload.video || null,
                images: normalizedImages,
                videos: normalizedVideos,
                tags: normalizedTags,
                linkUrl: normalizedLinkUrl || null,
                linkType: normalizedLinkUrl ? payload.linkType || null : null,
                userId: session.user.id,
            },
            select: {
                id: true,
                content: true,
                image: true,
                video: true,
                images: true,
                videos: true,
                tags: true,
                linkUrl: true,
                linkType: true,
                commentsEnabled: true,
                userId: true,
                deleted: true,
                createdAt: true,
                updatedAt: true,
                user: { select: { id: true, name: true, image: true, profession: true, title: true } },
                _count: { select: { comments: true, likes: true } },
            },
        });
    } catch (error) {
        console.error("Error creating post in database:", error);
        throw new Error("Failed to save post. Please try again.");
    }

    try {
        const mentions = [...normalizedContent.matchAll(MENTION_REGEX)].map((m) => m[1].trim());
        if (mentions.length > 0) {
            const mentionedUsers = await db.user.findMany({
                where: { name: { in: mentions }, id: { not: session.user.id } },
                select: { id: true, email: true, name: true },
            });
            if (mentionedUsers.length > 0) {
                const mentionMessage = `${session.user.name || "Someone"} mentioned you in a post`;
                await db.notification.createMany({
                    data: mentionedUsers.map((u) => ({
                        type: "MENTION" as const,
                        message: mentionMessage,
                        link: "/feeds",
                        userId: u.id,
                    })),
                });

                const emailPromises = mentionedUsers
                    .filter(u => u.email)
                    .map(u =>
                        sendNotificationEmail({
                            to: u.email,
                            userName: u.name || "User",
                            notificationMessage: mentionMessage,
                            notificationType: "MENTION",
                            actionUrl: "/feeds",
                        }).catch((err) => console.error("Error sending post mention email:", err))
                    );

                void Promise.allSettled(emailPromises);
            }
        }
    } catch (error) {
        console.error("Error creating post mention notifications:", error);
    }

    return {
        ...post,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
    };
}

/**
 * Community-wide feed. The session is used only to enrich each post
 * with the viewer's read state. There is deliberately NO `userId` parameter.
 */
export async function getPosts(page: number = 1, limit: number = 10) {
    const session = await verifiedAuthSession();
    const safePage = pageSchema.parse(page);
    const safeLimit = limitSchema.parse(limit);
    const skip = (safePage - 1) * safeLimit;

    try {
        const whereClause = { deleted: false } as const;

        const [posts, total] = await Promise.all([
            db.post.findMany({
                where: whereClause,
                select: {
                    id: true,
                    content: true,
                    image: true,
                    video: true,
                    images: true,
                    videos: true,
                    tags: true,
                    linkUrl: true,
                    linkType: true,
                    commentsEnabled: true,
                    createdAt: true,
                    user: { select: { id: true, name: true, image: true, profession: true, title: true } },
                    _count: {
                        select: {
                            comments: { where: { deleted: false } },
                            likes: true,
                        },
                    },
                    likes: {
                        select: {
                            userId: true,
                            reactionType: true,
                            user: { select: { id: true, name: true, image: true } },
                        },
                        orderBy: { createdAt: "desc" },
                        take: 10,
                    },
                    comments: {
                        where: { deleted: false },
                        select: {
                            user: { select: { id: true, name: true, image: true } },
                        },
                        orderBy: { createdAt: "desc" },
                        take: 3,
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: safeLimit,
            }),
            db.post.count({ where: whereClause }),
        ]);

        const postIds = posts.map((p) => p.id);
        const readRows = postIds.length
            ? await db.postReadStatus.findMany({
                where: { userId: session.user.id, postId: { in: postIds } },
                select: { postId: true },
            })
            : [];
        const readSet = new Set(readRows.map((r) => r.postId));
        const viewerId = session.user.id;

        const postsWithActivity = posts.map((post) => {
            const activityUsers = new Map<string, { id: string; name: string | null; image: string | null }>();
            for (const like of post.likes.slice(0, 5)) {
                if (!activityUsers.has(like.user.id)) {
                    activityUsers.set(like.user.id, like.user);
                }
            }
            for (const comment of post.comments) {
                if (!activityUsers.has(comment.user.id)) {
                    activityUsers.set(comment.user.id, comment.user);
                }
            }

            const isOwnPost = post.user.id === viewerId;
            const isUnread = !isOwnPost && !readSet.has(post.id);

            return {
                ...post,
                isUnread,
                likes: post.likes.map((l) => ({
                    userId: l.userId,
                    reactionType: l.reactionType,
                    userName: l.user.name,
                })),
                recentActivity: {
                    users: Array.from(activityUsers.values()).slice(0, 5),
                    likeCount: post._count.likes,
                    commentCount: post._count.comments,
                },
            };
        });

        return { posts: postsWithActivity, total, pages: Math.ceil(total / safeLimit) };
    } catch (error) {
        console.error("Error fetching posts:", error);
        return { posts: [], total: 0, pages: 0 };
    }
}

export async function refreshFeed(page: number = 1, limit: number = 20) {
    return getPosts(page, limit);
}

export async function markPostsAsRead(postIds: string[]) {
    const session = await verifiedAuthSession();

    const parsed = postIdsSchema.safeParse(postIds);
    if (!parsed.success) return { count: 0 };

    const ownPosts = await db.post.findMany({
        where: { id: { in: parsed.data }, userId: session.user.id },
        select: { id: true },
    });
    const ownIds = new Set(ownPosts.map((p) => p.id));
    const toInsert = parsed.data.filter((id) => !ownIds.has(id));
    if (toInsert.length === 0) return { count: 0 };

    try {
        await db.postReadStatus.createMany({
            data: toInsert.map((postId) => ({ userId: session.user.id, postId })),
            skipDuplicates: true,
        });
        return { count: toInsert.length };
    } catch (error) {
        console.error("Error marking posts as read:", error);
        return { count: 0 };
    }
}

export async function getUnreadPostCount(days: number = 30) {
    try {
        const session = await verifiedAuthSession();
        const safeDays = z.number().int().min(1).max(365).catch(30).parse(days);
        const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

        return await db.post.count({
            where: {
                deleted: false,
                createdAt: { gte: since },
                userId: { not: session.user.id },
                readStatuses: { none: { userId: session.user.id } },
            },
        });
    } catch {
        return 0;
    }
}

export async function getPublicPosts(limit: number = 10) {
    const safeLimit = limitSchema.parse(limit);
    try {
        const posts = await db.post.findMany({
            where: { deleted: false },
            select: {
                id: true,
                content: true,
                image: true,
                video: true,
                images: true,
                videos: true,
                tags: true,
                linkUrl: true,
                linkType: true,
                commentsEnabled: true,
                createdAt: true,
                user: { select: { id: true, name: true, image: true } },
                _count: {
                    select: {
                        comments: { where: { deleted: false } },
                        likes: true,
                    },
                },
                likes: {
                    select: { reactionType: true },
                    take: 10,
                },
            },
            orderBy: { createdAt: "desc" },
            take: safeLimit,
        });

        return posts.map((post) => ({
            ...post,
            likes: post.likes.map((l) => ({ reactionType: l.reactionType })),
        }));
    } catch (error) {
        console.error("Error fetching public posts:", error);
        return [];
    }
}

export async function toggleLike(postId: string, reactionType: string = "Like") {
    const session = await verifiedAuthSession();
    await enforceActionRateLimit(session.user.id, RATE_LIMITS.likeToggle, "post-like", "You're reacting too quickly.");
    const safePostId = idSchema.parse(postId);
    const normalizedReactionType = reactionSchema.parse(reactionType);
    const post = await db.post.findUnique({
        where: { id: safePostId },
        select: { userId: true, deleted: true, user: { select: { role: true, email: true, name: true } } },
    });
    if (!post || post.deleted) throw new Error("Post not found");

    const existing = await db.like.findUnique({
        where: { postId_userId: { postId: safePostId, userId: session.user.id } },
    });

    if (existing) {
        if (existing.reactionType === normalizedReactionType) {
            await db.like.delete({ where: { id: existing.id } });
            return { liked: false, reactionType: null };
        } else {
            await db.like.update({
                where: { id: existing.id },
                data: { reactionType: normalizedReactionType },
            });
            return { liked: true, reactionType: normalizedReactionType };
        }
    } else {
        await db.like.create({
            data: { postId: safePostId, userId: session.user.id, reactionType: normalizedReactionType },
        });

        try {
            if (post.userId !== session.user.id) {
                const likeMessage = `${session.user.name || "Someone"} liked your post`;
                await db.notification.create({
                    data: {
                        type: "LIKE",
                        message: likeMessage,
                        link: "/feeds",
                        userId: post.userId,
                    },
                });
                if (post.user?.email) {
                    sendNotificationEmail({
                        to: post.user.email,
                        userName: post.user.name || "User",
                        notificationMessage: likeMessage,
                        notificationType: "LIKE",
                        actionUrl: "/feeds",
                    }).catch((err) => console.error("Error sending like email:", err));
                }
            }
            if (!isAdminRole(post.user?.role)) {
                await notifyAdmins({
                    type: "LIKE",
                    message: `${session.user.name || "A user"} liked a post`,
                    link: "/feeds",
                    excludeUserId: session.user.id,
                });
            }
        } catch (error) {
            console.error("Error creating like notification:", error);
        }

        return { liked: true, reactionType: normalizedReactionType };
    }
}

export async function addComment(postId: string, content: string, parentId?: string) {
    const session = await verifiedAuthSession();
    await enforceActionRateLimit(session.user.id, RATE_LIMITS.commentCreate, "post-comment", "You're commenting too quickly.");
    const parsedContent = commentContentSchema.safeParse(content);
    if (!parsedContent.success) {
        throw new Error("Comment must be between 1 and 2000 characters.");
    }
    const safeContent = parsedContent.data;
    const safePostId = idSchema.parse(postId);
    const safeParentId = parentId ? idSchema.parse(parentId) : undefined;
    const post = await db.post.findUnique({
        where: { id: safePostId },
        select: {
            userId: true,
            commentsEnabled: true,
            deleted: true,
            user: { select: { role: true, email: true, name: true } },
        },
    });
    if (!post || post.deleted) throw new Error("Post not found");
    if (post.commentsEnabled === false) throw new Error("Comments are closed");
    const parentComment = safeParentId
        ? await db.comment.findUnique({
            where: { id: safeParentId },
            select: { userId: true, postId: true, deleted: true, user: { select: { email: true, name: true } } },
        })
        : null;
    if (safeParentId && (!parentComment || parentComment.deleted || parentComment.postId !== safePostId)) {
        throw new Error("Invalid parent comment");
    }

    const comment = await db.comment.create({
        data: {
            content: safeContent,
            postId: safePostId,
            userId: session.user.id,
            parentId: safeParentId || null,
        },
        include: {
            user: { select: { id: true, name: true, image: true, role: true } },
        },
    });

    try {
        if (post.userId !== session.user.id) {
            const commentMessage = `${session.user.name || "Someone"} commented on your post`;
            await db.notification.create({
                data: {
                    type: "COMMENT",
                    message: commentMessage,
                    link: "/feeds",
                    userId: post.userId,
                },
            });
            if (post.user?.email) {
                sendNotificationEmail({
                    to: post.user.email,
                    userName: post.user.name || "User",
                    notificationMessage: commentMessage,
                    notificationType: "COMMENT",
                    actionUrl: "/feeds",
                }).catch((err) => console.error("Error sending comment email:", err));
            }
        }
        if (parentComment && parentComment.userId !== session.user.id) {
            const replyMessage = `${session.user.name || "Someone"} replied to your comment`;
            await db.notification.create({
                data: {
                    type: "COMMENT",
                    message: replyMessage,
                    link: "/feeds",
                    userId: parentComment.userId,
                },
            });
            if (parentComment.user?.email) {
                sendNotificationEmail({
                    to: parentComment.user.email,
                    userName: parentComment.user.name || "User",
                    notificationMessage: replyMessage,
                    notificationType: "COMMENT",
                    actionUrl: "/feeds",
                }).catch((err) => console.error("Error sending reply email:", err));
            }
        }
        const mentions = [...safeContent.matchAll(MENTION_REGEX)].map((m) => m[1].trim());
        if (mentions.length > 0) {
            const mentionedUsers = await db.user.findMany({
                where: { name: { in: mentions }, id: { not: session.user.id } },
                select: { id: true, email: true, name: true },
            });
            if (mentionedUsers.length > 0) {
                const mentionMessage = `${session.user.name || "Someone"} mentioned you in a comment`;
                await db.notification.createMany({
                    data: mentionedUsers.map((u) => ({
                        type: "MENTION" as const,
                        message: mentionMessage,
                        link: "/feeds",
                        userId: u.id,
                    })),
                });
                for (const u of mentionedUsers) {
                    if (u.email) {
                        sendNotificationEmail({
                            to: u.email,
                            userName: u.name || "User",
                            notificationMessage: mentionMessage,
                            notificationType: "MENTION",
                            actionUrl: "/feeds",
                        }).catch((err) => console.error("Error sending mention email:", err));
                    }
                }
            }
        }
        if (!isAdminRole(post.user?.role)) {
            await notifyAdmins({
                type: "COMMENT",
                message: `${session.user.name || "A user"} commented on a post`,
                link: "/feeds",
                excludeUserId: session.user.id,
            });
        }
    } catch (error) {
        console.error("Error creating comment notification:", error);
    }

    return comment;
}

export async function getPostComments(postId: string) {
    await verifiedAuthSession();
    const safePostId = idSchema.parse(postId);
    const post = await db.post.findUnique({
        where: { id: safePostId },
        select: { id: true, deleted: true },
    });
    if (!post || post.deleted) throw new Error("Post not found");
    return db.comment.findMany({
        where: { postId: safePostId, deleted: false, parentId: null },
        include: {
            user: { select: { id: true, name: true, image: true, role: true, profession: true, title: true } },
            _count: {
                select: {
                    commentLikes: true,
                    replies: { where: { deleted: false } },
                },
            },
            commentLikes: { select: { userId: true, isDislike: true, reactionType: true } },
            replies: {
                where: { deleted: false },
                include: {
                    user: { select: { id: true, name: true, image: true, role: true, profession: true, title: true } },
                    _count: { select: { commentLikes: true } },
                    commentLikes: { select: { userId: true, isDislike: true, reactionType: true } },
                },
                orderBy: { createdAt: "asc" },
            },
        },
        orderBy: { createdAt: "asc" },
    });
}

export async function deletePost(postId: string) {
    const session = await verifiedAuthSession();
    const safePostId = idSchema.parse(postId);

    const post = await db.post.findUnique({
        where: { id: safePostId },
        select: { userId: true, deleted: true, user: { select: { role: true } } },
    });
    if (!post || post.deleted) throw new Error("Post not found");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const isOwner = post.userId === session.user.id;
    if (!isOwner && !canManageRole(user?.role, post.user.role)) throw new Error("Forbidden");

    await db.post.update({
        where: { id: safePostId },
        data: { deleted: true },
    });

    return { success: true };
}

export async function updatePost(postId: string, data: { content: string; images?: string[]; videos?: string[]; tags?: string[]; linkUrl?: string | null; linkType?: string | null }) {
    const session = await verifiedAuthSession();
    const parsedContent = z.string().max(5000).safeParse(data.content);
    if (!parsedContent.success) throw new Error("Post content is too long.");
    const safeContent = sanitizeText(parsedContent.data).trim();
    const safePostId = idSchema.parse(postId);
    const safeImages = data.images === undefined ? undefined : z.array(z.string()).max(6).parse(data.images);
    const safeVideos = data.videos === undefined ? undefined : z.array(z.string()).max(3).parse(data.videos);
    const safeTags = data.tags === undefined
        ? undefined
        : z.array(z.string().max(100)).max(10).parse(data.tags).map((tag) => sanitizeText(tag).trim()).filter(Boolean);
    const safeLinkUrl = typeof data.linkUrl === "string" ? sanitizeUrl(data.linkUrl) : "";
    if (data.linkUrl && !safeLinkUrl) throw new Error("Please provide a valid secure link URL.");

    const post = await db.post.findUnique({ where: { id: safePostId } });
    if (!post || post.deleted) throw new Error("Post not found");
    if (post.userId !== session.user.id) throw new Error("Forbidden");

    return db.post.update({
        where: { id: safePostId },
        data: {
            content: safeContent,
            ...(safeImages !== undefined && { images: safeImages }),
            ...(safeVideos !== undefined && { videos: safeVideos }),
            ...(safeTags !== undefined && { tags: safeTags }),
            ...(data.linkUrl !== undefined && { linkUrl: safeLinkUrl || null }),
            ...(data.linkType !== undefined && { linkType: safeLinkUrl ? data.linkType : null }),
        },
    });
}

export async function togglePostComments(postId: string) {
    const session = await verifiedAuthSession();

    const safePostId = idSchema.parse(postId);
    const post = await db.post.findUnique({ where: { id: safePostId } });
    if (!post || post.deleted) throw new Error("Post not found");
    if (post.userId !== session.user.id) throw new Error("Forbidden");

    const updated = await db.post.update({
        where: { id: safePostId },
        data: { commentsEnabled: !post.commentsEnabled },
    });

    return { commentsEnabled: updated.commentsEnabled };
}

/**
 * Activity for the CURRENT authenticated user only.
 * Identity comes exclusively from the session — no `userId` parameter.
 */
export async function getUserActivity(limit: number = 10) {
    const session = await verifiedAuthSession();
    const userId = session.user.id;
    const safeLimit = limitSchema.parse(limit);

    try {
        const [recentPosts, recentComments, recentLikes] = await Promise.all([
            db.post.findMany({
                where: { userId, deleted: false },
                select: { id: true, content: true, createdAt: true },
                orderBy: { createdAt: "desc" },
                take: safeLimit,
            }),
            db.comment.findMany({
                where: { userId, deleted: false, post: { deleted: false } },
                select: { id: true, content: true, createdAt: true, post: { select: { id: true, content: true } } },
                orderBy: { createdAt: "desc" },
                take: safeLimit,
            }),
            db.like.findMany({
                where: { userId, post: { deleted: false } },
                select: { id: true, reactionType: true, createdAt: true, post: { select: { id: true, content: true } } },
                orderBy: { createdAt: "desc" },
                take: safeLimit,
            }),
        ]);

        const activities = [
            ...recentPosts.map((p) => ({
                type: "post" as const,
                id: p.id,
                description: p.content.length > 60 ? p.content.slice(0, 60) + "…" : p.content,
                createdAt: p.createdAt,
            })),
            ...recentComments.map((c) => ({
                type: "comment" as const,
                id: c.id,
                description: `Commented: "${c.content.length > 50 ? c.content.slice(0, 50) + "…" : c.content}"`,
                createdAt: c.createdAt,
            })),
            ...recentLikes.map((l) => ({
                type: "reaction" as const,
                id: l.id,
                description: `Reacted ${l.reactionType} to a post: "${l.post.content.length > 50 ? l.post.content.slice(0, 50) + "…" : l.post.content}"`,
                createdAt: l.createdAt,
            })),
        ];

        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return activities.slice(0, safeLimit);
    } catch (error) {
        console.error("Error fetching user activity:", error);
        return [];
    }
}

export async function toggleCommentLike(commentId: string, isDislike: boolean = false, reactionType: string = "Like") {
    const session = await verifiedAuthSession();
    await enforceActionRateLimit(session.user.id, RATE_LIMITS.likeToggle, "comment-like", "You're reacting too quickly.");
    const safeCommentId = idSchema.parse(commentId);
    const normalizedReactionType = reactionSchema.parse(reactionType);
    const comment = await db.comment.findUnique({
        where: { id: safeCommentId },
        select: {
            userId: true,
            deleted: true,
            post: { select: { deleted: true } },
            user: { select: { email: true, name: true } },
        },
    });
    if (!comment || comment.deleted || comment.post?.deleted) throw new Error("Comment not found");

    const existing = await db.commentLike.findUnique({
        where: { commentId_userId: { commentId: safeCommentId, userId: session.user.id } },
    });

    if (existing) {
        if (existing.reactionType === normalizedReactionType) {
            await db.commentLike.delete({ where: { id: existing.id } });
            return { action: "removed", reactionType: null };
        } else {
            await db.commentLike.update({ where: { id: existing.id }, data: { reactionType: normalizedReactionType, isDislike: false } });
            return { action: "reacted", reactionType: normalizedReactionType };
        }
    } else {
        await db.commentLike.create({
            data: { commentId: safeCommentId, userId: session.user.id, isDislike, reactionType: normalizedReactionType },
        });

        try {
            if (comment.userId !== session.user.id) {
                const likeMessage = `${session.user.name || "Someone"} ${isDislike ? "disliked" : "liked"} your comment`;
                await db.notification.create({
                    data: {
                        type: "LIKE",
                        message: likeMessage,
                        link: "/feeds",
                        userId: comment.userId,
                    },
                });
                if (comment.user?.email) {
                    sendNotificationEmail({
                        to: comment.user.email,
                        userName: comment.user.name || "User",
                        notificationMessage: likeMessage,
                        notificationType: "LIKE",
                        actionUrl: "/feeds",
                    }).catch((err) => console.error("Error sending comment like email:", err));
                }
            }
        } catch (error) {
            console.error("Error creating comment like notification:", error);
        }

        return { action: "reacted", reactionType: normalizedReactionType };
    }
}

export async function editComment(commentId: string, content: string) {
    const session = await verifiedAuthSession();

    const safeCommentId = idSchema.parse(commentId);
    const parsedContent = commentContentSchema.safeParse(content);
    if (!parsedContent.success) throw new Error("Comment must be between 1 and 2000 characters.");
    const comment = await db.comment.findUnique({
        where: { id: safeCommentId },
        include: { post: { select: { deleted: true, commentsEnabled: true } } },
    });
    if (!comment || comment.deleted || comment.post?.deleted) throw new Error("Comment not found");
    if (comment.post?.commentsEnabled === false) throw new Error("Comments are closed");
    if (comment.userId !== session.user.id) throw new Error("Forbidden");

    return db.comment.update({
        where: { id: safeCommentId },
        data: { content: parsedContent.data },
    });
}

export async function deleteComment(commentId: string) {
    const session = await verifiedAuthSession();

    const safeCommentId = idSchema.parse(commentId);
    const comment = await db.comment.findUnique({
        where: { id: safeCommentId },
        select: {
            userId: true,
            deleted: true,
            post: { select: { deleted: true } },
            user: { select: { role: true } },
        },
    });
    if (!comment || comment.deleted || comment.post?.deleted) throw new Error("Comment not found");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const isOwner = comment.userId === session.user.id;
    if (!isOwner && !canManageRole(user?.role, comment.user.role)) throw new Error("Forbidden");

    await db.comment.update({
        where: { id: safeCommentId },
        data: { deleted: true },
    });

    return { success: true };
}

export async function searchUsers(query: string) {
    try {
        const session = await verifiedAuthSession();

        const safeQuery = z.string().trim().max(100).transform(sanitizeText).parse(query || "");
        const users = await db.user.findMany({
            where: {
                ...(safeQuery ? { name: { contains: safeQuery, mode: "insensitive" as const } } : {}),
                id: { not: session.user.id },
                banned: { not: true },
            },
            select: { id: true, name: true, image: true },
            take: 8,
        });

        return users;
    } catch {
        return [];
    }
}

export async function getAllUsers() {
    try {
        const session = await verifiedAuthSession();

        const users = await db.user.findMany({
            where: {
                id: { not: session.user.id },
                banned: { not: true },
            },
            select: { id: true, name: true, image: true },
            orderBy: { name: "asc" },
            take: 500,
        });

        return users;
    } catch {
        return [];
    }
}

export async function getPostLikers(postId: string) {
    await verifiedAuthSession();

    const safePostId = idSchema.parse(postId);
    const post = await db.post.findUnique({
        where: { id: safePostId },
        select: { id: true, deleted: true },
    });
    if (!post || post.deleted) throw new Error("Post not found");
    const likes = await db.like.findMany({
        where: { postId: safePostId },
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
    });

    return likes.map((l) => ({ ...l.user, reactionType: l.reactionType }));
}