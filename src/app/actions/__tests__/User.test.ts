/**
 * Tests for `@/app/actions/user`.
 *
 * Phase 3 change: `getProfile()` now derives its payload from the already
 * verified Better Auth session instead of running a second Prisma
 * `user.findUnique()`. The most important test in this file is the one that
 * asserts Prisma is NOT queried — that is the regression guard for the
 * duplicate-query fix.
 */

jest.mock("@/lib/auth-utils", () => ({
    verifiedAuthSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
    db: {
        user: {
            findUnique: jest.fn(),
        },
        post: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
        project: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getProfile, getUserActivity } from "../user";

const mockVerifiedAuthSession = verifiedAuthSession as unknown as jest.Mock;
const mockUserFindUnique = db.user.findUnique as unknown as jest.Mock;
const mockPostFindMany = db.post.findMany as unknown as jest.Mock;
const mockPostCount = db.post.count as unknown as jest.Mock;
const mockProjectFindMany = db.project.findMany as unknown as jest.Mock;
const mockProjectCount = db.project.count as unknown as jest.Mock;

const SESSION = {
    session: {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date("2030-01-01"),
        token: "token",
    },
    user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        image: null as string | null,
        gender: "male",
        role: "user",
        profession: "Researcher",
        title: "Dr.",
    },
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe("getProfile", () => {
    it("returns profile information directly from the verified session", async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);

        const result = await getProfile();

        expect(result).toEqual({
            email: "test@example.com",
            name: "Test User",
            image: null,
            gender: "male",
            role: "user",
            profession: "Researcher",
            title: "Dr.",
        });
    });

    it("does NOT query Prisma for the user record", async () => {
        // This is the load-bearing assertion for the Phase 3 performance fix.
        // If this ever regresses, the per-request duplicate user lookup has
        // come back.
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);

        await getProfile();

        expect(mockUserFindUnique).not.toHaveBeenCalled();
    });

    it("coerces missing optional fields to null", async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce({
            ...SESSION,
            user: {
                ...SESSION.user,
                image: undefined,
                gender: undefined,
                role: undefined,
                profession: undefined,
                title: undefined,
            },
        });

        const result = await getProfile();

        expect(result).toEqual({
            email: "test@example.com",
            name: "Test User",
            image: undefined,
            gender: null,
            role: null,
            profession: null,
            title: null,
        });
    });

    it("propagates Unauthorized from the session helper", async () => {
        mockVerifiedAuthSession.mockRejectedValueOnce(new Error("Unauthorized"));

        await expect(getProfile()).rejects.toThrow("Unauthorized");
        expect(mockUserFindUnique).not.toHaveBeenCalled();
    });
});

describe("getUserActivity", () => {
    it("returns serialized posts, projects, and totals", async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);

        const createdAt = new Date("2024-06-01T12:00:00Z");

        mockPostFindMany.mockResolvedValueOnce([
            {
                id: "post-1",
                content: "hello",
                image: null,
                createdAt,
                _count: { comments: 2, likes: 5 },
            },
        ]);
        mockProjectFindMany.mockResolvedValueOnce([
            {
                id: "project-1",
                title: "Project",
                description: "desc",
                status: "ACTIVE",
                category: "cat",
                location: "loc",
                feedback: null,
                createdAt,
            },
        ]);
        mockPostCount.mockResolvedValueOnce(1);
        mockProjectCount.mockResolvedValueOnce(1);

        const result = await getUserActivity();

        expect(result.totalPosts).toBe(1);
        expect(result.totalProjects).toBe(1);
        expect(result.posts).toHaveLength(1);
        expect(result.projects).toHaveLength(1);
        expect(result.posts[0].createdAt).toBe(createdAt.toISOString());
        expect(result.projects[0].createdAt).toBe(createdAt.toISOString());
    });

    it("returns empty results on database failure", async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);

        mockPostFindMany.mockRejectedValueOnce(new Error("db down"));
        mockProjectFindMany.mockResolvedValueOnce([]);
        mockPostCount.mockResolvedValueOnce(0);
        mockProjectCount.mockResolvedValueOnce(0);

        const result = await getUserActivity();

        expect(result).toEqual({
            posts: [],
            projects: [],
            totalPosts: 0,
            totalProjects: 0,
        });
    });

    it("requires a verified session before hitting the database", async () => {
        mockVerifiedAuthSession.mockRejectedValueOnce(new Error("Unauthorized"));

        await expect(getUserActivity()).rejects.toThrow("Unauthorized");
        expect(mockPostFindMany).not.toHaveBeenCalled();
        expect(mockProjectFindMany).not.toHaveBeenCalled();
    });
});