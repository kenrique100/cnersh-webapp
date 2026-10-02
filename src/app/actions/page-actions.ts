"use server";

import { unstable_cache } from "next/cache";
import { revalidateTag } from "@/lib/revalidate";
import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache-tags";

async function requireAdmin() {
    const session = await verifiedAuthSession();

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    return session;
}

/**
 * Cached navigation-page tree.
 *
 * `relationLoadStrategy: "join"` collapses the previous three-level include
 * into a single LATERAL JOIN. Requires the `relationJoins` preview flag on
 * the Prisma generator.
 *
 * Tagged with CACHE_TAGS.PAGES. Every mutation below revalidates that tag.
 */
const getPagesCached = unstable_cache(
    async () =>
        db.page.findMany({
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
            relationLoadStrategy: "join",
        }),
    ["pages-tree"],
    {
        tags: [CACHE_TAGS.PAGES],
        revalidate: false,
    },
);

export async function getPages() {
    try {
        return await getPagesCached();
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

    revalidateTag(CACHE_TAGS.PAGES);
    return page;
}

export async function updatePage(pageId: string, data: { name: string }) {
    await requireAdmin();

    if (!data.name.trim()) throw new Error("Page name is required");

    const page = await db.page.update({
        where: { id: pageId },
        data: { name: data.name.trim() },
    });

    revalidateTag(CACHE_TAGS.PAGES);
    return page;
}

export async function deletePage(pageId: string) {
    await requireAdmin();

    await db.page.delete({
        where: { id: pageId },
    });

    revalidateTag(CACHE_TAGS.PAGES);
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

    revalidateTag(CACHE_TAGS.PAGES);
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

    revalidateTag(CACHE_TAGS.PAGES);
    return pageItem;
}

export async function deletePageItem(itemId: string) {
    await requireAdmin();

    await db.pageItem.delete({
        where: { id: itemId },
    });

    revalidateTag(CACHE_TAGS.PAGES);
    return { success: true };
}