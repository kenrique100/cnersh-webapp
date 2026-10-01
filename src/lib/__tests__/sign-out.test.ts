/**
 * @jest-environment jsdom
 */
import { signOutAndClearBrowserData } from "@/lib/sign-out";
import { writeUserJson } from "@/lib/browser-storage";

const mockGetSession = jest.fn();
const mockSignOut = jest.fn();

jest.mock("@/lib/auth-client", () => ({
    authClient: {
        getSession: (...args: unknown[]) => mockGetSession(...args),
        signOut: (...args: unknown[]) => mockSignOut(...args),
    },
}));

const navigate = jest.fn();

function seed(userId: string) {
    writeUserJson(userId, "feed:share-counts", { "post-1": 1 });
    localStorage.setItem(`cnersh-protocol-draft:${userId}`, "{}");
}

describe("signOutAndClearBrowserData", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        localStorage.setItem("cnersh_lang", "fr");
        localStorage.setItem("cookie-consent-choice", "accepted");
        mockSignOut.mockResolvedValue({ data: { success: true }, error: null });
    });

    it("clears the signed-out user's data, keeps preferences and other users, then reloads", async () => {
        mockGetSession.mockResolvedValue({ data: { user: { id: "user-a" } } });
        seed("user-a");
        seed("user-b");

        await signOutAndClearBrowserData("/sign-in", navigate);

        expect(mockSignOut).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem("cnersh:feed:user-a:share-counts")).toBeNull();
        expect(localStorage.getItem("cnersh-protocol-draft:user-a")).toBeNull();
        expect(localStorage.getItem("cnersh:feed:user-b:share-counts")).not.toBeNull();
        expect(localStorage.getItem("cnersh_lang")).toBe("fr");
        expect(localStorage.getItem("cookie-consent-choice")).toBe("accepted");
        expect(navigate).toHaveBeenCalledWith("/sign-in");
    });

    it("clears all user-scoped data when the user id cannot be determined", async () => {
        mockGetSession.mockResolvedValue({ data: null });
        seed("user-a");
        seed("user-b");

        await signOutAndClearBrowserData("/", navigate);

        expect(localStorage.getItem("cnersh:feed:user-a:share-counts")).toBeNull();
        expect(localStorage.getItem("cnersh:feed:user-b:share-counts")).toBeNull();
        expect(localStorage.getItem("cnersh_lang")).toBe("fr");
        expect(navigate).toHaveBeenCalledWith("/");
    });

    it("still signs out when the session lookup fails", async () => {
        mockGetSession.mockRejectedValue(new Error("network"));
        seed("user-a");

        await signOutAndClearBrowserData("/", navigate);

        expect(mockSignOut).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem("cnersh:feed:user-a:share-counts")).toBeNull();
    });

    it("keeps the draft and stays on the page when the server rejects the sign-out", async () => {
        mockGetSession.mockResolvedValue({ data: { user: { id: "user-a" } } });
        mockSignOut.mockResolvedValue({ data: null, error: { message: "Server error" } });
        seed("user-a");

        await expect(signOutAndClearBrowserData("/", navigate)).rejects.toThrow("Server error");

        expect(localStorage.getItem("cnersh-protocol-draft:user-a")).not.toBeNull();
        expect(navigate).not.toHaveBeenCalled();
    });
});