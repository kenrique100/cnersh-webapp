"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";

const MENTION_REGEX = /@(\w[\w\s]*?)(?=\s@|$|\s)/g;

export async function createPost(data: { content: string; image?: string; video?: string; images?: string[]; videos?: string[]; tags?: string[]; linkUrl?: string }) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const post = await db.post.create({
        data: {
            content: data.content,
            image: data.image || null,
            video: data.video || null,
            images: data.images || [],
            videos: data.videos || [],
            tags: data.tags || [],
            linkUrl: data.linkUrl || null,
            userId: session.user.id,
        },
    });

    // Notify mentioned users in the post content
    try {
        const mentions = [...data.content.matchAll(MENTION_REGEX)].map((m) => m[1].trim());
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
                for (const u of mentionedUsers) {
                    if (u.email) {
                        sendNotificationEmail({
                            to: u.email,
                            userName: u.name || "User",
                            notificationMessage: mentionMessage,
                            notificationType: "MENTION",
                            actionUrl: "/feeds",
                        }).catch((err) => console.error("Error sending post mention email:", err));
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error creating post mention notifications:", error);
    }

    return post;
}

export async function getPosts(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    try {
        const [posts, total] = await Promise.all([
            db.post.findMany({
                where: { deleted: false },
                include: {
                    user: { select: { id: true, name: true, image: true, profession: true, title: true } },
                    _count: { select: { comments: true, likes: true } },
                    likes: {
                        select: {
                            userId: true,
                            user: { select: { id: true, name: true, image: true } },
                        },
                        orderBy: { createdAt: "desc" },
                        take: 5,
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
                take: limit,
            }),
            db.post.count({ where: { deleted: false } }),
        ]);

        // Build recentActivity for each post
        const postsWithActivity = posts.map((post) => {
            // Deduplicate users from likes and comments
            const activityUsers = new Map<string, { id: string; name: string | null; image: string | null }>();
            for (const like of post.likes) {
                if (!activityUsers.has(like.user.id)) {
                    activityUsers.set(like.user.id, like.user);
                }
            }
            for (const comment of post.comments) {
                if (!activityUsers.has(comment.user.id)) {
                    activityUsers.set(comment.user.id, comment.user);
                }
            }

            return {
                ...post,
                likes: post.likes.map((l) => ({ userId: l.userId })),
                recentActivity: {
                    users: Array.from(activityUsers.values()).slice(0, 5),
                    likeCount: post._count.likes,
                    commentCount: post._count.comments,
                },
            };
        });

        return { posts: postsWithActivity, total, pages: Math.ceil(total / limit) };
    } catch (error) {
        console.error("Error fetching posts:", error);
        return { posts: [], total: 0, pages: 0 };
    }
}

export async function getPublicPosts(limit: number = 10) {
    try {
        const posts = await db.post.findMany({
            where: { deleted: false },
            include: {
                user: { select: { id: true, name: true, image: true } },
                _count: { select: { comments: true, likes: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        return posts;
    } catch (error) {
        console.error("Error fetching public posts:", error);
        return [];
    }
}

export async function getTrendingTags(limit: number = 5) {
    try {
        const posts = await db.post.findMany({
            where: { deleted: false, tags: { isEmpty: false } },
            select: { tags: true },
        });

        // Aggregate tag counts
        const tagCounts = new Map<string, number>();
        for (const post of posts) {
            for (const tag of post.tags) {
                const normalized = tag.trim().toLowerCase();
                if (normalized) {
                    tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
                }
            }
        }

        // Sort by count descending and take top N
        const sorted = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

        return sorted.map(([tag, count]) => ({
            tag: tag.charAt(0).toUpperCase() + tag.slice(1),
            posts: count,
        }));
    } catch (error) {
        console.error("Error fetching trending tags:", error);
        return [];
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

        // Notify post owner of the like
        try {
            const post = await db.post.findUnique({
                where: { id: postId },
                select: { userId: true, user: { select: { role: true, email: true, name: true } } },
            });
            if (post && post.userId !== session.user.id) {
                const likeMessage = `${session.user.name || "Someone"} liked your post`;
                await db.notification.create({
                    data: {
                        type: "LIKE",
                        message: likeMessage,
                        link: "/feeds",
                        userId: post.userId,
                    },
                });
                // Send email notification
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
            // Also notify admins if the post is not by an admin
            if (post && post.user?.role !== "admin" && post.user?.role !== "superadmin") {
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

        return { liked: true };
    }
}

export async function addComment(postId: string, content: string, parentId?: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const comment = await db.comment.create({
        data: {
            content,
            postId,
            userId: session.user.id,
            parentId: parentId || null,
        },
        include: {
            user: { select: { id: true, name: true, image: true, role: true } },
        },
    });

    // Notify post owner of the comment
    try {
        const post = await db.post.findUnique({
            where: { id: postId },
            select: { userId: true, user: { select: { role: true, email: true, name: true } } },
        });
        if (post && post.userId !== session.user.id) {
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
        // Notify parent comment owner if it's a reply
        if (parentId) {
            const parentComment = await db.comment.findUnique({
                where: { id: parentId },
                select: { userId: true, user: { select: { email: true, name: true } } },
            });
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
        }
        // Notify mentioned users (@username) - matches @Name patterns, stopping at next @ or end of string
        const mentions = [...content.matchAll(MENTION_REGEX)].map((m) => m[1].trim());
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
        // Also notify admins if the post is not by an admin
        if (post && post.user?.role !== "admin" && post.user?.role !== "superadmin") {
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
    return db.comment.findMany({
        where: { postId, deleted: false, parentId: null },
        include: {
            user: { select: { id: true, name: true, image: true, role: true, profession: true, title: true } },
            _count: { select: { commentLikes: true, replies: true } },
            commentLikes: { select: { userId: true, isDislike: true } },
            replies: {
                where: { deleted: false },
                include: {
                    user: { select: { id: true, name: true, image: true, role: true, profession: true, title: true } },
                    _count: { select: { commentLikes: true } },
                    commentLikes: { select: { userId: true, isDislike: true } },
                },
                orderBy: { createdAt: "asc" },
            },
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

export async function toggleCommentLike(commentId: string, isDislike: boolean = false) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const existing = await db.commentLike.findUnique({
        where: { commentId_userId: { commentId, userId: session.user.id } },
    });

    if (existing) {
        if (existing.isDislike === isDislike) {
            // Same action - remove
            await db.commentLike.delete({ where: { id: existing.id } });
            return { action: "removed" };
        } else {
            // Switch between like/dislike
            await db.commentLike.update({ where: { id: existing.id }, data: { isDislike } });
            return { action: isDislike ? "disliked" : "liked" };
        }
    } else {
        await db.commentLike.create({
            data: { commentId, userId: session.user.id, isDislike },
        });

        // Notify comment owner
        try {
            const comment = await db.comment.findUnique({
                where: { id: commentId },
                select: { userId: true, user: { select: { email: true, name: true } } },
            });
            if (comment && comment.userId !== session.user.id) {
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

        return { action: isDislike ? "disliked" : "liked" };
    }
}

export async function editComment(commentId: string, content: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const comment = await db.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== session.user.id) throw new Error("Forbidden");

    return db.comment.update({
        where: { id: commentId },
        data: { content },
    });
}

export async function deleteComment(commentId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const comment = await db.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error("Comment not found");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const isOwner = comment.userId === session.user.id;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    if (!isOwner && !isAdmin) throw new Error("Forbidden");

    await db.comment.update({
        where: { id: commentId },
        data: { deleted: true },
    });

    return { success: true };
}

export async function searchUsers(query: string) {
    const session = await authSession();
    if (!session) return [];

    const users = await db.user.findMany({
        where: {
            ...(query?.trim() ? { name: { contains: query.trim(), mode: "insensitive" as const } } : {}),
            id: { not: session.user.id },
        },
        select: { id: true, name: true, image: true },
        take: 8,
    });

    return users;
}

export async function getAllUsers() {
    const session = await authSession();
    if (!session) return [];

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
}

export async function getPostLikers(postId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const likes = await db.like.findMany({
        where: { postId },
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
    });

    return likes.map((l) => l.user);
}
