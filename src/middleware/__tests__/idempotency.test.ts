/**
 * @jest-environment node
 */

import type { NextRequest, NextResponse } from "next/server";
import {
    claimKey,
    getClaim,
    getResponse,
    releaseKey,
    saveResponse,
} from "@/lib/idempotency-store";
import { withIdempotency } from "@/middleware/idempotency";

jest.mock("@/lib/idempotency-store", () => ({
    claimKey: jest.fn(),
    getClaim: jest.fn(),
    getResponse: jest.fn(),
    releaseKey: jest.fn(),
    saveResponse: jest.fn(),
}));

const mockedClaim = jest.mocked(claimKey);
const mockedGetClaim = jest.mocked(getClaim);
const mockedGetResponse = jest.mocked(getResponse);
const mockedRelease = jest.mocked(releaseKey);
const mockedSave = jest.mocked(saveResponse);

function request(key: string): NextRequest {
    const body = JSON.stringify({ file: "payload" });
    return {
        headers: new Headers({
            "Idempotency-Key": key,
            "Content-Type": "application/json",
        }),
        method: "POST",
        nextUrl: new URL("https://app.example/api/upload"),
        clone: () => new Request("https://app.example/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        }),
    } as unknown as NextRequest;
}

function jsonResponse(body: unknown, status = 200): NextResponse {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    }) as unknown as NextResponse;
}

describe("withIdempotency", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetResponse.mockResolvedValue(null);
        mockedClaim.mockResolvedValue(true);
        mockedRelease.mockResolvedValue(undefined);
        mockedSave.mockResolvedValue(undefined);
    });

    it("namespaces the same client key by authenticated scope", async () => {
        const handler = jest.fn(async () => jsonResponse({ ok: true }));
        const forUserA = withIdempotency(handler, { getScope: async () => "user-a" });
        const forUserB = withIdempotency(handler, { getScope: async () => "user-b" });

        await forUserA(request("same-client-key"));
        await forUserB(request("same-client-key"));

        expect(mockedSave).toHaveBeenCalledTimes(2);
        expect(mockedSave.mock.calls[0][0]).not.toBe(mockedSave.mock.calls[1][0]);
    });

    it("rejects replay when the stored response belongs to another payload", async () => {
        mockedGetResponse.mockResolvedValueOnce({
            status: 200,
            body: { ok: true },
            requestHash: "first-payload",
        });
        const handler = jest.fn(async () => jsonResponse({ ok: true }));
        const wrapped = withIdempotency(handler, {
            getScope: async () => "user-a",
            fingerprint: async () => "different-payload",
        });

        const response = await wrapped(request("client-key-123"));

        expect(response.status).toBe(409);
        expect(handler).not.toHaveBeenCalled();
    });

    it("rejects an in-flight claim for another payload without waiting", async () => {
        mockedClaim.mockResolvedValueOnce(false);
        mockedGetClaim.mockResolvedValueOnce("other-payload:owner");
        const handler = jest.fn(async () => jsonResponse({ ok: true }));
        const wrapped = withIdempotency(handler, {
            getScope: async () => "user-a",
            fingerprint: async () => "this-payload",
            pollTimeoutMs: 1,
        });

        const response = await wrapped(request("client-key-123"));

        expect(response.status).toBe(409);
        expect(handler).not.toHaveBeenCalled();
    });

    it("does not cache a server error and releases its owned lock", async () => {
        const handler = jest.fn(async () => jsonResponse({ error: "failed" }, 500));
        const wrapped = withIdempotency(handler, {
            getScope: async () => "user-a",
            fingerprint: async () => "payload",
        });

        const response = await wrapped(request("client-key-123"));

        expect(response.status).toBe(500);
        expect(mockedSave).not.toHaveBeenCalled();
        expect(mockedRelease).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringMatching(/^payload:/),
        );
    });
});
