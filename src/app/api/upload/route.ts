import { NextRequest, NextResponse } from "next/server";
import { authSession } from "@/lib/auth-utils";

// Increase body size limit for file uploads
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const session = await authSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file size (max 4MB for images, 32MB for videos, 50MB for documents)
        let maxSize: number;
        if (file.type.startsWith("video/")) {
            maxSize = 50 * 1024 * 1024;
        } else if (file.type.startsWith("image/")) {
            maxSize = 8 * 1024 * 1024;
        } else {
            maxSize = 50 * 1024 * 1024;
        }
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString("base64");
        const dataUrl = `data:${file.type};base64,${base64}`;

        return NextResponse.json({ url: dataUrl, name: file.name });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
