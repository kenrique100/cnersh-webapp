import { NextRequest, NextResponse } from "next/server";
import { authSession } from "@/lib/auth-utils";
import { validateFile, performBasicMalwareCheck } from "@/lib/file-validation";
import { sanitizeFilename } from "@/lib/sanitize";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const maxDuration = 60;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 8 * 1024 * 1024;
const MAX_UPLOAD_SIZE = Math.max(MAX_IMAGE_SIZE, MAX_VIDEO_SIZE, MAX_DOCUMENT_SIZE);
// Base64 stores 4 bytes for every 3 bytes of binary data (~33% overhead).
const BASE64_EXPANSION_RATIO = 4 / 3;
const DATA_URL_METADATA_OVERHEAD = 128;
const MAX_BASE64_DATA_URL_LENGTH =
    Math.ceil(MAX_UPLOAD_SIZE * BASE64_EXPANSION_RATIO) + DATA_URL_METADATA_OVERHEAD;

async function uploadHandler(req: NextRequest) {
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

        // Sanitize filename
        const sanitizedFilename = sanitizeFilename(file.name);
        if (!sanitizedFilename) {
            return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
        }

        // Determine file category and validate
        let allowedTypes: string[] | undefined;
        let maxSize: number;

        if (file.type.startsWith("video/")) {
            allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
            maxSize = MAX_VIDEO_SIZE;
        } else if (file.type.startsWith("image/")) {
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            maxSize = MAX_IMAGE_SIZE;
        } else {
            // Documents
            allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ];
            maxSize = MAX_DOCUMENT_SIZE;
        }

        // Comprehensive file validation
        const validation = await validateFile(file, { allowedTypes, maxSize });
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error || "File validation failed" },
                { status: 400 }
            );
        }

        // Perform basic malware check
        const malwareCheck = await performBasicMalwareCheck(file);
        if (!malwareCheck.valid) {
            return NextResponse.json(
                { error: "File failed security check" },
                { status: 400 }
            );
        }

        const mimeType = validation.detectedType || file.type || "application/octet-stream";
        const estimatedDataUrlLength =
            Math.ceil(file.size * BASE64_EXPANSION_RATIO) + `data:${mimeType};base64,`.length;
        if (estimatedDataUrlLength > MAX_BASE64_DATA_URL_LENGTH) {
            return NextResponse.json(
                { error: "File is too large for database storage. Please choose a smaller file." },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64}`;
        if (dataUrl.length > MAX_BASE64_DATA_URL_LENGTH) {
            return NextResponse.json(
                { error: "File is too large for database storage. Please choose a smaller file." },
                { status: 400 }
            );
        }

        return NextResponse.json({
            url: dataUrl,
            name: sanitizedFilename,
            type: mimeType,
            size: file.size,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Upload failed" },
            { status: 500 }
        );
    }
}

// Initialize rate-limited handler once at module level for efficiency
const rateLimitedUploadHandler = withRateLimit(
    uploadHandler,
    RATE_LIMITS.fileUpload,
    {
        keyPrefix: "upload",
        getUserId: async () => {
            const session = await authSession();
            return session?.user?.id;
        },
    }
);

// Export with rate limiting, falling back to direct handler if rate limiter throws
export async function POST(req: NextRequest) {
    try {
        return await rateLimitedUploadHandler(req);
    } catch (err) {
        // Rate limiter threw unexpectedly (e.g. environment issue); fall back so the
        // client always receives JSON instead of an HTML error page.
        console.error("Rate limiter error, falling back to direct handler:", err);
        try {
            return await uploadHandler(req);
        } catch (handlerErr) {
            console.error("Upload handler error:", handlerErr);
            return NextResponse.json({ error: "Upload failed" }, { status: 500 });
        }
    }
}
