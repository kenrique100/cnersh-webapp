import { TopicUser } from "./types";

export async function deleteBlobUrl(url: string) {
    try {
        const pullZoneUrl = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL ?? "";
        if (!pullZoneUrl) return;

        const parsed = new URL(url);
        const pullZoneParsed = new URL(pullZoneUrl);

        if (parsed.hostname !== pullZoneParsed.hostname) return;

        await fetch("/api/delete-blob", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
    } catch {
        // Best-effort deletion; do not surface errors to the user
    }
}

/** Format a timestamp as 24-hour HH:MM (e.g. "14:33"). */
export function formatTime(date: Date | string) {
    const d = new Date(date);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
}

/** Full human-readable date, e.g. "Monday, September 24, 2026". */
export function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function startOfDay(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
    return startOfDay(new Date(a)) === startOfDay(new Date(b));
}


export function formatDateSeparator(date: Date | string): string {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(d, today)) return "Today";
    if (isSameDay(d, yesterday)) return "Yesterday";

    return d.toLocaleDateString("en-US", {
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