jest.mock("next/headers", () => ({ headers: jest.fn(async () => new Headers()) }));
jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ auth: { api: { signOut: jest.fn() } } }));
jest.mock("@/lib/action-rate-limit", () => ({ enforceActionRateLimit: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/erasure/config", () => ({
    getErasureCapabilities: jest.fn(() => ({ configured: true, storeIsolated: true, kekId: "kek-1" })),
}));
jest.mock("@/lib/erasure/deletion-service", () => {
    class DeletionUnavailableError extends Error {}
    class DeletionRefusedError extends Error {}
    return {
        DeletionUnavailableError,
        DeletionRefusedError,
        requestAccountDeletion: jest.fn(),
        getDeletionRequestForUser: jest.fn().mockResolvedValue(null),
    };
});

import { auth } from "@/lib/auth";
import { authSession } from "@/lib/auth-utils";
import { enforceActionRateLimit } from "@/lib/action-rate-limit";
import { DeletionRefusedError, DeletionUnavailableError, requestAccountDeletion } from "@/lib/erasure/deletion-service";
import { getAccountDeletionContext, requestMyAccountDeletion } from "@/app/actions/account-deletion";

const mockedAuthSession = jest.mocked(authSession);
const mockedRequest = jest.mocked(requestAccountDeletion);
const mockedSignOut = auth.api.signOut as unknown as jest.Mock;

function session(createdAt: Date, role = "user") {
    return {
        user: { id: "user-1", email: "alice@example.org", role },
        session: { id: "s1", createdAt },
    } as unknown as Awaited<ReturnType<typeof authSession>>;
}

describe("requestMyAccountDeletion", () => {
    beforeEach(() => jest.clearAllMocks());

    it("rejects unauthenticated callers before doing anything", async () => {
        mockedAuthSession.mockResolvedValueOnce(null);
        const result = await requestMyAccountDeletion({ confirmation: "DELETE" });
        expect(result).toEqual({ ok: false, code: "UNAUTHENTICATED", error: expect.any(String) });
        expect(mockedRequest).not.toHaveBeenCalled();
    });

    it("requires the exact typed confirmation", async () => {
        mockedAuthSession.mockResolvedValue(session(new Date()));
        expect((await requestMyAccountDeletion({ confirmation: "delete" })).ok).toBe(false);
        expect((await requestMyAccountDeletion({})).ok).toBe(false);
        expect((await requestMyAccountDeletion({ confirmation: "DELETE", reason: 42 })).ok).toBe(false);
        expect(mockedRequest).not.toHaveBeenCalled();
    });

    it("requires a recent sign-in", async () => {
        mockedAuthSession.mockResolvedValueOnce(session(new Date(Date.now() - 16 * 60 * 1000)));
        const result = await requestMyAccountDeletion({ confirmation: "DELETE" });
        expect(result).toMatchObject({ ok: false, code: "REAUTH" });
        expect(mockedRequest).not.toHaveBeenCalled();
    });

    it("runs the deletion for the signed-in user only and signs the browser out", async () => {
        mockedAuthSession.mockResolvedValueOnce(session(new Date()));
        mockedRequest.mockResolvedValueOnce({ requestId: "req-1", status: "COMPLETED", completedSteps: [], lastError: null });

        const result = await requestMyAccountDeletion({ confirmation: "DELETE", reason: "<b>done</b>" });

        expect(result).toEqual({ ok: true, status: "COMPLETED" });
        expect(enforceActionRateLimit).toHaveBeenCalledWith("user-1", expect.anything(), "account-deletion", expect.any(String));
        expect(mockedRequest).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "user-1", actorId: "user-1", via: "SELF", reason: expect.not.stringContaining("<b>") })
        );
        expect(mockedSignOut).toHaveBeenCalled();
    });

    it("maps service failures to honest, non-success results", async () => {
        mockedAuthSession.mockResolvedValue(session(new Date()));
        mockedRequest.mockRejectedValueOnce(new DeletionUnavailableError("Account deletion is temporarily unavailable"));
        expect(await requestMyAccountDeletion({ confirmation: "DELETE" })).toMatchObject({ ok: false, code: "UNAVAILABLE" });

        mockedRequest.mockRejectedValueOnce(new DeletionRefusedError("Transfer the super administrator role first"));
        expect(await requestMyAccountDeletion({ confirmation: "DELETE" })).toMatchObject({ ok: false, code: "REFUSED" });

        mockedRequest.mockRejectedValueOnce(new Error("boom"));
        const unexpected = await requestMyAccountDeletion({ confirmation: "DELETE" });
        expect(unexpected).toMatchObject({ ok: false, code: "UNAVAILABLE" });
        expect(unexpected.ok === false && unexpected.error).not.toContain("boom");
        expect(mockedSignOut).not.toHaveBeenCalled();
    });

    it("reports a blocked request as not finished rather than as success", async () => {
        mockedAuthSession.mockResolvedValueOnce(session(new Date()));
        mockedRequest.mockResolvedValueOnce({ requestId: "req-1", status: "BLOCKED", completedSteps: ["revoke"], lastError: "storage" });
        expect(await requestMyAccountDeletion({ confirmation: "DELETE" })).toEqual({ ok: true, status: "BLOCKED" });
    });
});

describe("getAccountDeletionContext", () => {
    beforeEach(() => jest.clearAllMocks());

    it("returns null for anonymous callers", async () => {
        mockedAuthSession.mockResolvedValueOnce(null);
        expect(await getAccountDeletionContext()).toBeNull();
    });

    it("exposes recency, availability and isolation honestly", async () => {
        mockedAuthSession.mockResolvedValueOnce(session(new Date(Date.now() - 60 * 60 * 1000), "superadmin"));
        const context = await getAccountDeletionContext();
        expect(context).toMatchObject({
            status: "NONE",
            recentAuth: false,
            available: true,
            keyStoreIsolated: true,
            isSuperAdmin: true,
        });
    });
});
