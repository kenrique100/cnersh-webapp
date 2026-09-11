import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import {
    claimKey,
    getClaim,
    getResponse,
    releaseKey,
    saveResponse,
} from "@/lib/idempotency-store";

export interface IdempotencyOptions {
    lockTtlSeconds?: number;
    responseTtlSeconds?: number;
    pollIntervalMs?: number;
    pollTimeoutMs?: number;
    getScope?: (req: NextRequest) => Promise<string | null | undefined>;
    fingerprint?: (req: NextRequest) => Promise<string>;
}

function extractKey(req: NextRequest): string | null {
    return req.headers.get("Idempotency-Key")?.trim() || null;
}

function isValidKey(key: string): boolean {
    return key.length >= 8 && key.length <= 200 && !/[\u0000-\u001f\u007f]/.test(key);
}

function scopedStorageKey(key: string, scope: string): string {
    return createHash("sha256").update(scope).update("\0").update(key).digest("hex");
}

async function defaultFingerprint(req: NextRequest): Promise<string> {
    const hash = createHash("sha256");
    const method = req.method.toUpperCase();
    const rawContentType = req.headers.get("content-type") ?? "";
    const normalizedContentType = rawContentType.split(";")[0]?.trim().toLowerCase() ?? "";

    hash.update(method);
    hash.update("\0");
    hash.update(req.nextUrl.pathname);
    hash.update(req.nextUrl.search);
    hash.update("\0");
    hash.update(normalizedContentType);
    hash.update("\0");
    hash.update(req.headers.get("content-length") ?? "");

    // Avoid buffering large/unstable bodies (notably multipart boundaries) by default.
    if (!['GET', 'HEAD'].includes(method) && normalizedContentType !== 'multipart/form-data') {
        hash.update("\0");
        hash.update(Buffer.from(await req.clone().arrayBuffer()));
    }

    return hash.digest("hex");
}

function conflict(message: string): NextResponse {
    return NextResponse.json(
        { error: "Conflict", message },
        { status: 409, headers: { "Cache-Control": "private, no-store" } }
    );
}

async function releaseClaim(storageKey: string, claimValue: string): Promise<void> {
    try {
        await releaseKey(storageKey, claimValue);
    } catch (error) {
        console.error("[idempotency] lock release failed:", error);
    }
}

export function withIdempotency(
    handler: (req: NextRequest) => Promise<NextResponse>,
    options: IdempotencyOptions = {}
) {
    const lockTtl = options.lockTtlSeconds ?? 60;
    const respTtl = options.responseTtlSeconds ?? 86_400;
    const pollInterval = options.pollIntervalMs ?? 500;
    const pollTimeout = options.pollTimeoutMs ?? 10_000;

    return async function (req: NextRequest): Promise<NextResponse> {
        const key = extractKey(req);
        if (!key) return handler(req);
        if (!isValidKey(key)) {
            return NextResponse.json(
                { error: "Invalid Idempotency-Key" },
                { status: 400, headers: { "Cache-Control": "private, no-store" } }
            );
        }

        let storageKey: string | undefined;
        let claimValue: string | undefined;
        try {
            const scope = options.getScope
                ? await options.getScope(req)
                : "global";
            // Authentication-aware callers can bypass idempotency for anonymous
            // requests so an unauthenticated response is never shared.
            if (!scope) return handler(req);

            storageKey = scopedStorageKey(key, scope);
            const requestHash = options.fingerprint
                ? await options.fingerprint(req)
                : await defaultFingerprint(req);

            const existing = await getResponse(storageKey);
            if (existing) {
                if (existing.requestHash && existing.requestHash !== requestHash) {
                    return conflict("This Idempotency-Key was already used for a different request.");
                }
                const res = NextResponse.json(existing.body, { status: existing.status });
                res.headers.set("Idempotency-Replay", "true");
                res.headers.set("Cache-Control", "private, no-store");
                return res;
            }

            claimValue = `${requestHash}:${randomUUID()}`;
            const claimed = await claimKey(storageKey, lockTtl, claimValue);

            if (!claimed) {
                const activeClaim = await getClaim(storageKey);
                if (activeClaim && !activeClaim.startsWith(`${requestHash}:`)) {
                    return conflict("This Idempotency-Key is processing a different request.");
                }

                const start = Date.now();
                while (Date.now() - start < pollTimeout) {
                    await new Promise((r) => setTimeout(r, pollInterval));
                    const ready = await getResponse(storageKey);
                    if (ready) {
                        if (ready.requestHash && ready.requestHash !== requestHash) {
                            return conflict(
                                "This Idempotency-Key was already used for a different request."
                            );
                        }
                        const res = NextResponse.json(ready.body, { status: ready.status });
                        res.headers.set("Idempotency-Replay", "true");
                        res.headers.set("Cache-Control", "private, no-store");
                        return res;
                    }
                }
                return conflict("Request is still being processed.");
            }

            let response: NextResponse;
            try {
                response = await handler(req);
            } catch (err) {
                await releaseClaim(storageKey, claimValue);
                throw err;
            }

            let body: unknown = null;
            const ct = response.headers.get("content-type") ?? "";
            if (ct.includes("application/json")) {
                try { body = await response.clone().json(); } catch { body = null; }
            }

            if (ct.includes("application/json") && response.status < 500) {
                try {
                    await saveResponse(storageKey, response.status, body, respTtl, requestHash);
                } catch (err) {
                    console.error("[idempotency] save failed:", err);
                }
            }

            await releaseClaim(storageKey, claimValue);
            response.headers.set("Idempotency-Key", key);
            response.headers.set("Cache-Control", "private, no-store");
            return response;
        } catch (err) {
            if (storageKey && claimValue) {
                await releaseClaim(storageKey, claimValue);
            }
            console.error("[idempotency] unexpected error:", err);
            return NextResponse.json(
                { error: "Internal Server Error" },
                { status: 500, headers: { "Cache-Control": "private, no-store" } }
            );
        }
    };
}
