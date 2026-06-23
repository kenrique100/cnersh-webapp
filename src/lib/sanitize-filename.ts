export function sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== "string") return "unnamed";

    let safe = filename
        .replace(/\.\./g, "")
        .replace(/[/\\]/g, "")
        .replace(/\0/g, "")
        .replace(/[\x00-\x1f\x80-\x9f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.{2,}/g, ".")
        .substring(0, 255);

    if (safe.startsWith(".") && safe.length > 1) safe = `_${safe.slice(1)}`;
    return safe || "unnamed";
}