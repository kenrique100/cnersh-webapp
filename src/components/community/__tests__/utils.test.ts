import {
    deleteBlobUrl,
    formatTime,
    formatDate,
    formatDateSeparator,
    isSameDay,
    getDisplayName,
} from "../utils";
import { TopicUser } from "../types";

describe("utils", () => {
    describe("deleteBlobUrl", () => {
        const originalFetch = global.fetch;

        // Use a cast to Record to safely allow adding/modifying environment variables
        const env = process.env as Record<string, string | undefined>;

        beforeAll(() => {
            global.fetch = jest.fn();
        });
        afterAll(() => {
            global.fetch = originalFetch;
        });
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("does nothing when pull zone URL is empty", async () => {
            env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = "";
            await deleteBlobUrl("https://example.com/file.jpg");
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it("calls delete API when host matches pull zone", async () => {
            env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = "https://storage.bunnycdn.com";
            await deleteBlobUrl("https://storage.bunnycdn.com/my-file.jpg");
            expect(global.fetch).toHaveBeenCalledWith("/api/delete-blob", expect.any(Object));
        });

        it("does not call API for a different host", async () => {
            env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = "https://cdn.example.com";
            await deleteBlobUrl("https://other.com/file.jpg");
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it("silently catches fetch errors", async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("network"));
            env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = "https://cdn.example.com";
            await expect(
                deleteBlobUrl("https://cdn.example.com/file.jpg")
            ).resolves.toBeUndefined();
        });

        it("silently handles invalid URLs", async () => {
            env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = "https://cdn.example.com";
            await expect(deleteBlobUrl("not-a-url")).resolves.toBeUndefined();
        });
    });

    describe("formatTime", () => {
        it("returns a WhatsApp-style 12-hour time string with AM/PM", () => {
            const d = new Date("2024-01-15T14:30:00");
            const result = formatTime(d);
            // Format: "2:30 PM" — no leading zero on the hour, uppercase AM/PM
            expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);
        });

        it("includes the minutes zero-padded", () => {
            const d = new Date("2024-01-15T09:05:00");
            const result = formatTime(d);
            // Minutes must always be two digits, e.g. "9:05 AM"
            expect(result).toMatch(/\d{1,2}:05\s?(AM|PM)/i);
        });

        it("uses AM for morning times and PM for afternoon/evening times", () => {
            const morning = new Date("2024-01-15T09:00:00");
            const afternoon = new Date("2024-01-15T15:00:00");
            expect(formatTime(morning)).toMatch(/AM$/i);
            expect(formatTime(afternoon)).toMatch(/PM$/i);
        });

        it("uses 12-hour hour values (no 13–23 hour numbers)", () => {
            // 14:30 should render as "2:30 PM", not "14:30"
            const d = new Date("2024-01-15T14:30:00");
            const hour = parseInt(formatTime(d).split(":")[0], 10);
            expect(hour).toBeGreaterThanOrEqual(1);
            expect(hour).toBeLessThanOrEqual(12);
        });

        it("accepts a string date", () => {
            expect(formatTime("2024-01-15T14:30:00")).toMatch(
                /^\d{1,2}:\d{2}\s?(AM|PM)$/i
            );
        });
    });

    describe("formatDate", () => {
        it("returns full locale date string", () => {
            const d = new Date("2024-01-15T14:30:00");
            const str = formatDate(d);
            expect(str).toContain("Monday");
            expect(str).toContain("January");
            expect(str).toContain("2024");
        });

        it("accepts a string date", () => {
            const str = formatDate("2024-01-15T14:30:00");
            expect(str).toContain("Monday");
        });
    });

    describe("isSameDay", () => {
        it("returns true for two timestamps on the same calendar day", () => {
            const a = new Date("2024-01-15T00:01:00");
            const b = new Date("2024-01-15T23:59:00");
            expect(isSameDay(a, b)).toBe(true);
        });

        it("returns false for two timestamps on different calendar days", () => {
            const a = new Date("2024-01-15T23:59:00");
            const b = new Date("2024-01-16T00:01:00");
            expect(isSameDay(a, b)).toBe(false);
        });

        it("returns false when days differ even within the same month", () => {
            const a = new Date("2024-01-15T12:00:00");
            const b = new Date("2024-01-16T12:00:00");
            expect(isSameDay(a, b)).toBe(false);
        });

        it("returns true for identical Date instances", () => {
            const a = new Date("2024-01-15T12:00:00");
            expect(isSameDay(a, a)).toBe(true);
        });

        it("accepts string dates", () => {
            expect(isSameDay("2024-01-15T01:00:00", "2024-01-15T22:00:00")).toBe(true);
            expect(isSameDay("2024-01-15T01:00:00", "2024-01-16T01:00:00")).toBe(false);
        });
    });

    describe("formatDateSeparator", () => {
        it('returns "Today" for the current calendar day', () => {
            const now = new Date();
            expect(formatDateSeparator(now)).toBe("Today");
        });

        it('returns "Today" for an earlier time on the current day', () => {
            const morning = new Date();
            morning.setHours(0, 5, 0, 0);
            expect(formatDateSeparator(morning)).toBe("Today");
        });

        it('returns "Yesterday" for the previous calendar day', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(formatDateSeparator(yesterday)).toBe("Yesterday");
        });

        it('returns "Yesterday" for an early time on the previous day', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 5, 0, 0);
            expect(formatDateSeparator(yesterday)).toBe("Yesterday");
        });

        it("returns an exact long-form date for older messages", () => {
            // Use a two-years-ago date so it is guaranteed not to be Today/Yesterday
            // regardless of when the suite is executed.
            const old = new Date();
            old.setFullYear(old.getFullYear() - 2);
            const result = formatDateSeparator(old);
            expect(result).not.toBe("Today");
            expect(result).not.toBe("Yesterday");
            expect(result).toMatch(/\d{4}/);
        });

        it("does not return Today/Yesterday for two days ago", () => {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            const result = formatDateSeparator(twoDaysAgo);
            expect(result).not.toBe("Today");
            expect(result).not.toBe("Yesterday");
        });

        it("accepts a string date", () => {
            const old = new Date();
            old.setFullYear(old.getFullYear() - 2);
            expect(formatDateSeparator(old.toISOString())).toMatch(/\d{4}/);
        });
    });

    describe("getDisplayName", () => {
        const baseUser = { id: "1", name: "Alice", image: null };

        it('returns "CNERSH Admin" for admin and superadmin roles', () => {
            expect(getDisplayName({ ...baseUser, role: "admin" } as TopicUser)).toBe("CNERSH Admin");
            expect(getDisplayName({ ...baseUser, role: "superadmin" } as TopicUser)).toBe("CNERSH Admin");
        });

        it("returns user name for non-admin roles", () => {
            expect(getDisplayName({ ...baseUser, role: "member" } as TopicUser)).toBe("Alice");
        });

        it('returns "Unknown" when name is null', () => {
            expect(
                getDisplayName({ id: "2", name: null, image: null, role: "member" } as TopicUser)
            ).toBe("Unknown");
        });

        it('returns "Unknown" when name is an empty string', () => {
            expect(
                getDisplayName({ id: "3", name: "", image: null, role: "member" } as TopicUser)
            ).toBe("Unknown");
        });
    });
});