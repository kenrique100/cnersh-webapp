import { put, del, head } from "@vercel/blob";

export interface BlobUploadOptions {
    access?: "public" | "private";
    contentType?: string;
    folder?: string;
}

export interface BlobUploadResult {
    url: string;
    pathname: string;
    contentType: string;
    contentDisposition: string;
}

export async function uploadFileToVercelBlob(
    file: File,
    options: BlobUploadOptions = {}
): Promise<BlobUploadResult> {
    const { access = "private", folder = "uploads" } = options;
    const pathname = `${folder}/${Date.now()}-${file.name}`;

    const blob = await put(pathname, file, {
        access,
        contentType: file.type || "application/octet-stream",
    });

    return {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        contentDisposition: blob.contentDisposition,
    };
}

export async function deleteFileFromVercelBlob(url: string): Promise<void> {
    await del(url);
}

export async function getFileMeta(url: string) {
    return head(url);
}