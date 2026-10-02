"use server";

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function getProfile() {
    const session = await verifiedAuthSession();

    return {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        gender: session.user.gender ?? null,
        role: session.user.role ?? null,
        profession: session.user.profession ?? null,
        title: session.user.title ?? null,
    };
}

export async function getUserActivity() {
    const session = await verifiedAuthSession();

    try {
        const userId = session.user.id;
        const [posts, projects, totalPosts, totalProjects] = await Promise.all([
            db.post.findMany({
                where: { userId, deleted: false },
                select: {
                    id: true,
                    content: true,
                    image: true,
                    createdAt: true,
                    _count: {
                        select: {
                            comments: { where: { deleted: false } },
                            likes: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                take: 20,
            }),
            db.project.findMany({
                where: { userId, deleted: false },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    category: true,
                    location: true,
                    feedback: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 20,
            }),
            db.post.count({ where: { userId, deleted: false } }),
            db.project.count({ where: { userId, deleted: false } }),
        ]);

        return {
            posts: posts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
            projects: projects.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
            totalPosts,
            totalProjects
        };
    } catch (error) {
        console.error("Error fetching user activity:", error);
        return { posts: [], projects: [], totalPosts: 0, totalProjects: 0 };
    }
}