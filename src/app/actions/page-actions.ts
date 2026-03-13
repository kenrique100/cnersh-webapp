"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

async function requireAdmin() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    return session;
}

export async function getPages() {
    try {
        const pages = await db.page.findMany({
            where: { parentId: null },
            include: {
                items: {
                    orderBy: { createdAt: "asc" },
                },
                children: {
                    include: {
                        items: {
                            orderBy: { createdAt: "asc" },
                        },
                        children: {
                            include: {
                                items: {
                                    orderBy: { createdAt: "asc" },
                                },
                            },
                            orderBy: { createdAt: "asc" },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
            orderBy: { createdAt: "asc" },
        });
        return pages;
    } catch (error) {
        console.error("Error fetching pages:", error);
        return [];
    }
}

export async function createPage(data: {
    name: string;
    parentId?: string;
    items: { name: string; url?: string; fileUrl?: string }[];
}) {
    await requireAdmin();

    if (!data.name.trim()) throw new Error("Page name is required");

    const page = await db.page.create({
        data: {
            name: data.name.trim(),
            parentId: data.parentId || null,
            items: {
                create: data.items.map((item) => ({
                    name: item.name.trim(),
                    url: item.url?.trim() || null,
                    fileUrl: item.fileUrl || null,
                })),
            },
        },
        include: { items: true },
    });

    return page;
}

export async function updatePage(pageId: string, data: { name: string }) {
    await requireAdmin();

    if (!data.name.trim()) throw new Error("Page name is required");

    const page = await db.page.update({
        where: { id: pageId },
        data: { name: data.name.trim() },
    });

    return page;
}

export async function deletePage(pageId: string) {
    await requireAdmin();

    await db.page.delete({
        where: { id: pageId },
    });

    return { success: true };
}

export async function addPageItem(
    pageId: string,
    item: { name: string; url?: string; fileUrl?: string },
) {
    await requireAdmin();

    const pageItem = await db.pageItem.create({
        data: {
            name: item.name.trim(),
            url: item.url?.trim() || null,
            fileUrl: item.fileUrl || null,
            pageId,
        },
    });

    return pageItem;
}

export async function updatePageItem(
    itemId: string,
    data: { name: string; url?: string; fileUrl?: string },
) {
    await requireAdmin();

    if (!data.name.trim()) throw new Error("Item name is required");

    const pageItem = await db.pageItem.update({
        where: { id: itemId },
        data: {
            name: data.name.trim(),
            url: data.url?.trim() || null,
            fileUrl: data.fileUrl || null,
        },
    });

    return pageItem;
}

export async function deletePageItem(itemId: string) {
    await requireAdmin();

    await db.pageItem.delete({
        where: { id: itemId },
    });

    return { success: true };
}
