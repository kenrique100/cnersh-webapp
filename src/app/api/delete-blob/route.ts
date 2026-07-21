import { NextResponse } from "next/server";
import { deleteUploadThingFile } from "@/lib/uploadthing";

export async function DELETE(request: Request) {
    try {
        const body = await request.json() as { url?: string; storageKey?: string };

        // Use storageKey if provided, otherwise try to extract from URL
        let key = body.storageKey || null;
        if (!key && body.url) {
            // UploadThing keys are typically the last segment of the URL after /f/
            const match = body.url.match(/\/f\/([^/?]+)/);
            key = match ? match[1] : null;
        }

        if (!key) {
            return NextResponse.json(
                { error: "Provide either a valid url or storageKey" },
                { status: 400 }
            );
        }

        await deleteUploadThingFile(key);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[delete-blob] deletion failed:", err);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}