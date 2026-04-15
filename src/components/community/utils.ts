import { TopicUser } from "./types";

const VERCEL_BLOB_HOSTNAME = "public.blob.vercel-storage.com";

export async function deleteBlobUrl(url: string) {
    try {
        const parsed = new URL(url);
        if (
            parsed.hostname !== VERCEL_BLOB_HOSTNAME &&
            !parsed.hostname.endsWith("." + VERCEL_BLOB_HOSTNAME)
        ) return;
        await fetch("/api/delete-blob", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
    } catch {
        // Best-effort deletion; do not surface errors to the user
    }
}

export function formatTime(date: Date) {
    return new Date(date).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
}

export function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export function getDisplayName(user: TopicUser) {
    if (user.role === "admin" || user.role === "superadmin") {
        return "CNERSH Admin";
    }
    return user.name || "Unknown";
}
