import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { sanitizeText } from "@/lib/sanitize";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest): Promise<NextResponse> {
    const limited = await rateLimit(
        req,
        { windowMs: RATE_LIMITS.reportSubmission.windowMs, maxRequests: 5 },
        "sentry-feedback"
    );
    if (limited) return limited;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { email, message } = body as Record<string, unknown>;

    const safeEmail = sanitizeText(typeof email === "string" ? email : "");
    const safeMessage = sanitizeText(typeof message === "string" ? message : "");

    if (!safeMessage) {
        return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const superAdmins = await db.user.findMany({
        where: { role: "superadmin", banned: { not: true } },
        select: { id: true, email: true, name: true },
    });

    if (superAdmins.length === 0) {
        return NextResponse.json({ success: true });
    }

    const senderLabel = safeEmail || "Anonymous";
    const notificationMessage = `User feedback received via Sentry from ${senderLabel}: "${safeMessage}"`;

    await Promise.allSettled(
        superAdmins.map((admin) =>
            sendNotificationEmail({
                to: admin.email,
                userName: admin.name ?? "Super Admin",
                notificationMessage,
                notificationType: "USER_FEEDBACK",
                actionUrl: "/admin/reports",
            }).catch((err) => console.error("[sentry-feedback] email error:", err))
        )
    );

    return NextResponse.json({ success: true });
}