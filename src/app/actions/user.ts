"use server";

import {authSession} from "@/lib/auth-utils";
import {db} from "@/lib/db";

export async function updateProfile() {
    const session = await authSession();

    if (!session) {
        return null;
    }

    try {
        return await db.user.findUnique({
            where: {id: session.user.id},
            select: {
                email: true,
                name: true,
                image: true,
                role: true,
                profession: true,
                title: true,
            },
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

export async function getUserActivity() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    try {
        const [posts, projects, totalPosts, totalProjects] = await Promise.all([
            db.post.findMany({
                where: { userId: session.user.id, deleted: false },
                select: {
                    id: true,
                    content: true,
                    image: true,
                    createdAt: true,
                    _count: { select: { comments: true, likes: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 20,
            }),
            db.project.findMany({
                where: { userId: session.user.id, deleted: false },
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
            db.post.count({ where: { userId: session.user.id, deleted: false } }),
            db.project.count({ where: { userId: session.user.id, deleted: false } }),
        ]);

        return { posts, projects, totalPosts, totalProjects };
    } catch (error) {
        console.error("Error fetching user activity:", error);
        return { posts: [], projects: [], totalPosts: 0, totalProjects: 0 };
    }
}