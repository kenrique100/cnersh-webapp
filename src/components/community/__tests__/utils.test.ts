import { deleteBlobUrl, formatTime, formatDate, getDisplayName } from "../utils";
import { TopicUser } from "../types";

describe("utils", () => {
    describe("deleteBlobUrl", () => {
        const originalFetch = global.fetch;

        // Use a cast to Record to safely allow adding/modifying environment variables
        const env = process.env as Record<string, string | undefined>;

        beforeAll(() => { global.fetch = jest.fn(); });
        afterAll(() => { global.fetch = originalFetch; });
        beforeEach(() => { jest.clearAllMocks(); });

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
            // Cast to jest.Mock specifically instead of any
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("network"));
            env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = "https://cdn.example.com";
            await expect(deleteBlobUrl("https://cdn.example.com/file.jpg")).resolves.toBeUndefined();
        });
    });

    describe("formatTime", () => {
        it("returns a time string with hour and minute", () => {
            const d = new Date("2024-01-15T14:30:00");
            expect(formatTime(d)).toMatch(/\d{1,2}:\d{2}/);
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
    });

    describe("getDisplayName", () => {
        const baseUser = { id: "1", name: "Alice", image: null };
        it('returns "CNERSH Admin" for admin and superadmin roles', () => {
            expect(getDisplayName({ ...baseUser, role: "admin" } as TopicUser)).toBe("CNERSH Admin");
            expect(getDisplayName({ ...baseUser, role: "superadmin" } as TopicUser)).toBe("CNERSH Admin");
        });
        it("returns user name for non‑admin roles", () => {
            expect(getDisplayName({ ...baseUser, role: "member" } as TopicUser)).toBe("Alice");
        });
        it('returns "Unknown" when name is null', () => {
            expect(getDisplayName({ id: "2", name: null, image: null, role: "member" } as TopicUser)).toBe("Unknown");
        });
    });
});