import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTrendingTags } from "@/lib/trending-service";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

const rateLimiter = withRateLimit(
    async (req) => handler(req),
    RATE_LIMITS.trending,
    { keyPrefix: "trending" }
);

async function handler(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({ limit: searchParams.get("limit") });

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid parameters", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const tags = await getTrendingTags(parsed.data.limit);

    return NextResponse.json(tags, {
        status: 200,
        headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            "X-Content-Type-Options": "nosniff",
        },
    });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        return await rateLimiter(req);
    } catch (error) {
        console.error("[API /trending]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}