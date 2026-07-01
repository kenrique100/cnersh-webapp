import { render, screen } from "@testing-library/react";
import AdminPagesPage from "../page";
import { authIsRequired } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

jest.mock("@/lib/auth-utils", () => ({
    authIsRequired: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
    db: {
        user: {
            findUnique: jest.fn(),
        },
        page: {
            findMany: jest.fn(),
        },
    },
}));
jest.mock("next/navigation", () => ({
    redirect: jest.fn(() => {
        throw new Error("NEXT_REDIRECT");
    }),
}));

// Fix L26: Component definition is missing display name
jest.mock("../pages-client", () => {
    function MockAdminPagesClient() {
        return <div>Mock AdminPagesClient</div>;
    }
    MockAdminPagesClient.displayName = "MockAdminPagesClient";
    return MockAdminPagesClient;
});

const mockSession = { user: { id: "user-1" } };

describe("AdminPagesPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authIsRequired as jest.Mock).mockResolvedValue(mockSession);
    });

    it("redirects to dashboard if user is not admin", async () => {
        (db.user.findUnique as jest.Mock).mockResolvedValue({ role: "user" });
        await expect(AdminPagesPage()).rejects.toThrow("NEXT_REDIRECT");
        expect(redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects if user not found", async () => {
        (db.user.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(AdminPagesPage()).rejects.toThrow("NEXT_REDIRECT");
        expect(redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("renders AdminPagesClient for admin", async () => {
        (db.user.findUnique as jest.Mock).mockResolvedValue({ role: "admin" });
        const mockPages = [{ id: "p1", name: "Test", items: [], children: [] }];
        (db.page.findMany as jest.Mock).mockResolvedValue(mockPages);
        const page = await AdminPagesPage();
        render(page);
        expect(screen.getByText("Mock AdminPagesClient")).toBeInTheDocument();
    });

    it("renders for superadmin", async () => {
        (db.user.findUnique as jest.Mock).mockResolvedValue({ role: "superadmin" });
        const mockPages: never[] = [];
        (db.page.findMany as jest.Mock).mockResolvedValue(mockPages);
        const page = await AdminPagesPage();
        render(page);
        expect(screen.getByText("Mock AdminPagesClient")).toBeInTheDocument();
    });
});