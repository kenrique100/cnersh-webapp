import { NextResponse } from "next/server";
import { utapi } from "@/lib/uploadthing";

export async function DELETE(request: Request) {
    try {
        const body = await request.json() as { url?: string; storageKey?: string };

        // UploadThing file key is mandatory
        const key = body.storageKey?.trim() || null;
        if (!key) {
            return NextResponse.json(
                { error: "Provide a valid storageKey" },
                { status: 400 }
            );
        }

        await utapi.deleteFiles(key);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[delete-blob] deletion failed:", err);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}