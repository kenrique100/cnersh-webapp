import { render, screen } from "@testing-library/react";
import COIDeclarationPage from "../page";
import { authIsRequired } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

// Mock auth
jest.mock("@/lib/auth-utils", () => ({
    authIsRequired: jest.fn(),
}));

// Mock db
jest.mock("@/lib/db", () => ({
    db: {
        reviewAssignment: {
            findUnique: jest.fn(),
        },
    },
}));

// Mock navigation functions to throw (simulates Next.js behavior)
jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
    redirect: jest.fn(() => {
        throw new Error("NEXT_REDIRECT");
    }),
}));

// Mock the client component
jest.mock("../coi-client", () => ({
    __esModule: true,
    default: function MockCOIClient() {
        return <div>Mock COI Client</div>;
    },
}));

const mockSession = { user: { id: "user-1" } };

describe("COIDeclarationPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authIsRequired as jest.Mock).mockResolvedValue(mockSession);
    });

    it("redirects if assignmentId missing", async () => {
        await expect(
            COIDeclarationPage({
                params: Promise.resolve({ id: "proj-1" }),
                searchParams: Promise.resolve({}),
            })
        ).rejects.toThrow("NEXT_REDIRECT");
        expect(redirect).toHaveBeenCalledWith("/protocols/proj-1");
    });

    it("calls notFound if assignment not found", async () => {
        (db.reviewAssignment.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(
            COIDeclarationPage({
                params: Promise.resolve({ id: "proj-1" }),
                searchParams: Promise.resolve({ assignmentId: "assign-1" }),
            })
        ).rejects.toThrow("NEXT_NOT_FOUND");
        expect(notFound).toHaveBeenCalled();
    });

    it("redirects if reviewer mismatch", async () => {
        const assignment = {
            id: "assign-1",
            reviewerId: "other-user",
            project: { id: "proj-1", title: "Test", category: "Clinical" },
            coiDeclaration: null,
        };
        (db.reviewAssignment.findUnique as jest.Mock).mockResolvedValue(assignment);
        await expect(
            COIDeclarationPage({
                params: Promise.resolve({ id: "proj-1" }),
                searchParams: Promise.resolve({ assignmentId: "assign-1" }),
            })
        ).rejects.toThrow("NEXT_REDIRECT");
        expect(redirect).toHaveBeenCalledWith("/protocols/proj-1");
    });

    it("redirects if COI already declared", async () => {
        const assignment = {
            id: "assign-1",
            reviewerId: "user-1",
            project: { id: "proj-1", title: "Test", category: "Clinical" },
            coiDeclaration: { id: "coi-1" },
        };
        (db.reviewAssignment.findUnique as jest.Mock).mockResolvedValue(assignment);
        await expect(
            COIDeclarationPage({
                params: Promise.resolve({ id: "proj-1" }),
                searchParams: Promise.resolve({ assignmentId: "assign-1" }),
            })
        ).rejects.toThrow("NEXT_REDIRECT");
        expect(redirect).toHaveBeenCalledWith("/protocols/proj-1");
    });

    it("renders client when all conditions met", async () => {
        const assignment = {
            id: "assign-1",
            reviewerId: "user-1",
            project: { id: "proj-1", title: "Test Protocol", category: "Clinical" },
            coiDeclaration: null,
        };
        (db.reviewAssignment.findUnique as jest.Mock).mockResolvedValue(assignment);
        const page = await COIDeclarationPage({
            params: Promise.resolve({ id: "proj-1" }),
            searchParams: Promise.resolve({ assignmentId: "assign-1" }),
        });
        render(page);
        expect(screen.getByText("Mock COI Client")).toBeInTheDocument();
    });
});