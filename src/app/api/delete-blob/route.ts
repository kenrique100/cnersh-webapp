import { NextResponse } from "next/server";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { utapi } from "@/lib/uploadthing";

export async function DELETE(request: Request) {
    try {
        const session = await authSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json() as { storageKey?: string };
        const key = body.storageKey?.trim() || null;
        if (!key) {
            return NextResponse.json(
                { error: "Provide a valid storageKey" },
                { status: 400 }
            );
        }

        const file = await db.file.findUnique({
            where: { storageKey: key },
            select: { id: true, userId: true },
        });

        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });
        const isAdmin = user?.role === "admin" || user?.role === "superadmin";

        if (file.userId !== session.user.id && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await utapi.deleteFiles(key);
        await db.file.delete({ where: { id: file.id } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[delete-blob] deletion failed:", err);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}
