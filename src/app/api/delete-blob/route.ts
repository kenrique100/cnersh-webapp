import { NextResponse } from "next/server";
import { utapi } from "@/lib/uploadthing";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function DELETE(request: Request) {
    const session = await authSession();
    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: { "Cache-Control": "private, no-store" } }
        );
    }

    let body: { storageKey?: unknown };
    try {
        body = await request.json() as { storageKey?: unknown };
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON" },
            { status: 400, headers: { "Cache-Control": "private, no-store" } }
        );
    }

    const key = typeof body.storageKey === "string" ? body.storageKey.trim() : "";
    if (!key || key.length > 512) {
        return NextResponse.json(
            { error: "Provide a valid storageKey" },
            { status: 400, headers: { "Cache-Control": "private, no-store" } }
        );
    }

    try {
        const file = await db.file.findUnique({
            where: { storageKey: key },
            select: { id: true, userId: true },
        });
        const role = session.user.role;
        const isAdmin = role === "admin" || role === "superadmin";
        if (!file || (!isAdmin && file.userId !== session.user.id)) {
            // Do not reveal whether another user's storage key exists.
            return NextResponse.json(
                { error: "File not found" },
                { status: 404, headers: { "Cache-Control": "private, no-store" } }
            );
        }

        const deletion = await utapi.deleteFiles(key);
        if (!deletion.success) {
            throw new Error("Storage provider did not confirm deletion");
        }
        await db.file.delete({ where: { id: file.id } });
        return NextResponse.json(
            { success: true },
            { headers: { "Cache-Control": "private, no-store" } }
        );
    } catch (err) {
        console.error("[delete-blob] deletion failed:", err);
        return NextResponse.json(
            { error: "Failed to delete file" },
            { status: 500, headers: { "Cache-Control": "private, no-store" } }
        );
    }
}
