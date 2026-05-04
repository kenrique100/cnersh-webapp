import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || "5", 10);
    const limit = Math.max(1, Math.min(isNaN(limitParam) ? 5 : limitParam, 20));

    try {
        const results = await db.$queryRaw<{ tag: string; count: bigint }[]>`
            SELECT LOWER(TRIM(u.tag)) AS tag, COUNT(*) AS count
            FROM post
            CROSS JOIN LATERAL unnest(tags) AS u(tag)
            WHERE deleted = false
              AND TRIM(u.tag) <> ''
            GROUP BY LOWER(TRIM(u.tag))
            ORDER BY count DESC
            LIMIT ${limit}
        `;

        const tags = results.map((r) => ({
            tag: r.tag.charAt(0).toUpperCase() + r.tag.slice(1),
            posts: Number(r.count),
        }));

        return NextResponse.json(tags);
    } catch (error) {
        console.error("Failed to fetch trending tags:", error);
        return NextResponse.json([], { status: 200 });
    }
}
