
/**
 * Sanitize filename to prevent path traversal attacks.
 */
export function sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
        return '';
    }

    let safe = filename.replace(/\.\./g, '');
    safe = safe.replace(/[\/\\]/g, '');
    safe = safe.replace(/\0/g, '');
    safe = safe.replace(/[\x00-\x1f\x80-\x9f]/g, '');
    safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');
    safe = safe.replace(/\.{2,}/g, '.');

    return safe;
}