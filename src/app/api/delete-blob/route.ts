import { NextResponse } from "next/server";
import { deleteFileFromBunny, sanitizeStorageKey, storageKeyFromUrl } from "@/lib/bunny-storage-client";

export async function DELETE(request: Request) {
    try {
        const body = await request.json() as { url?: string; storageKey?: string };

        let key: string | null = body.storageKey ? sanitizeStorageKey(body.storageKey) : null;

        if (!key && body.url) {
            key = storageKeyFromUrl(body.url);
        }

        if (!key) {
            return NextResponse.json(
                { error: "Provide either a valid url or storageKey" },
                { status: 400 }
            );
        }

        await deleteFileFromBunny(key);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[delete-blob] deletion failed:", err);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}