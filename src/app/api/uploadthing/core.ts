import { createUploadthing, type FileRouter } from "uploadthing/next";
import { authSession } from "@/lib/auth-utils";
import { UT_MAX_SIZES } from "@/lib/file-limits";

const f = createUploadthing();

export const ourFileRouter = {
    imageUploader: f({ image: { maxFileSize: UT_MAX_SIZES.image } })
        .middleware(async () => {
            const session = await authSession();
            if (!session) throw new Error("Unauthorized");
            return { userId: session.user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // Here you could save the file metadata to your database
            console.log("Upload complete for userId:", metadata.userId, "file url:", file.url);
            return { uploadedBy: metadata.userId };
        }),
    videoUploader: f({ video: { maxFileSize: UT_MAX_SIZES.video } })
        .middleware(async () => {
            const session = await authSession();
            if (!session) throw new Error("Unauthorized");
            return { userId: session.user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            return { uploadedBy: metadata.userId };
        }),
    audioUploader: f({ audio: { maxFileSize: UT_MAX_SIZES.audio } })
        .middleware(async () => {
            const session = await authSession();
            if (!session) throw new Error("Unauthorized");
            return { userId: session.user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            return { uploadedBy: metadata.userId };
        }),
    pdfUploader: f({ pdf: { maxFileSize: UT_MAX_SIZES.document } })
        .middleware(async () => {
            const session = await authSession();
            if (!session) throw new Error("Unauthorized");
            return { userId: session.user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            return { uploadedBy: metadata.userId };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;