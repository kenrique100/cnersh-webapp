import { NextRequest, NextResponse } from "next/server";
import { claimKey, getResponse, releaseKey, saveResponse } from "@/lib/idempotency-store";

export interface IdempotencyOptions {
    lockTtlSeconds?: number;
    responseTtlSeconds?: number;
    pollIntervalMs?: number;
    pollTimeoutMs?: number;
}

function extractKey(req: NextRequest): string | null {
    return req.headers.get("Idempotency-Key") || req.headers.get("idempotency-key");
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

        try {
            const existing = await getResponse(key);
            if (existing) {
                const res = NextResponse.json(existing.body, { status: existing.status });
                res.headers.set("Idempotency-Replay", "true");
                return res;
            }

            const claimed = await claimKey(key, lockTtl);

            if (!claimed) {
                const start = Date.now();
                while (Date.now() - start < pollTimeout) {
                    await new Promise((r) => setTimeout(r, pollInterval));
                    const ready = await getResponse(key);
                    if (ready) {
                        const res = NextResponse.json(ready.body, { status: ready.status });
                        res.headers.set("Idempotency-Replay", "true");
                        return res;
                    }
                }
                return NextResponse.json(
                    { error: "Conflict", message: "Request is still being processed." },
                    { status: 409 }
                );
            }

            let response: NextResponse;
            try {
                response = await handler(req);
            } catch (err) {
                await releaseKey(key);
                throw err;
            }

            let body: unknown = null;
            const ct = response.headers.get("content-type") ?? "";
            if (ct.includes("application/json")) {
                try { body = await response.clone().json(); } catch { body = null; }
            }

            try {
                await saveResponse(key, response.status, body, respTtl);
            } catch (err) {
                console.error("[idempotency] save failed:", err);
            }

            response.headers.set("Idempotency-Key", key);
            return response;
        } catch (err) {
            console.error("[idempotency] unexpected error:", err);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    };
}