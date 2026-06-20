// lib/vercel-blob-client.ts
import { put } from '@vercel/blob';
import { sanitizeFilename } from '@/lib/sanitize';

export async function uploadFileToVercelBlob(
    file: File,
    options?: { access?: 'public' | 'private' }
) {
    const sanitized = sanitizeFilename(file.name);
    if (!sanitized) throw new Error('Invalid filename');

    const blob = await put(sanitized, file, {
        access: options?.access ?? 'private',
        contentType: file.type,
    });

    return {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
    };
}