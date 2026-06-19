import { NextRequest, NextResponse } from "next/server";
import { claimKey, getResponse, saveResponse } from "@/lib/idempotency-store";

export interface IdempotencyOptions {
    lockTtlSeconds?: number;
    responseTtlSeconds?: number;
    pollIntervalMs?: number;
    pollTimeoutMs?: number;
}

export function withIdempotency(
    handler: (req: NextRequest) => Promise<NextResponse>,
    options: IdempotencyOptions = {}
) {
    const lockTtl = options.lockTtlSeconds ?? 60;
    const respTtl = options.responseTtlSeconds ?? 24 * 60 * 60; // 24h
    const pollInterval = options.pollIntervalMs ?? 500;
    const pollTimeout = options.pollTimeoutMs ?? 10_000; // 10s

    return async function (req: NextRequest): Promise<NextResponse> {
        try {
            const key = req.headers.get("Idempotency-Key") || req.headers.get("Idempotency-Key".toLowerCase());
            if (!key) return await handler(req);

            // If there's already a stored response, return it
            const existing = await getResponse(key);
            if (existing) {
                return NextResponse.json(existing.body as any, { status: existing.status });
            }

            // Try to claim the key (setnx)
            const claimed = await claimKey(key, lockTtl);
            if (!claimed) {
                const start = Date.now();
                while (Date.now() - start < pollTimeout) {
                    const r = await getResponse(key);
                    if (r) return NextResponse.json(r.body as any, { status: r.status });
                    await new Promise((r) => setTimeout(r, pollInterval));
                }
            }

            // We are the owner (or timed out). Process request.
            const res = await handler(req);

            // Try to parse the JSON body from the response
            let body: unknown = null;
            try {

                if (typeof res.json === "function") {
                    body = await res.json();
                }
            } catch {
                body = null;
            }

            // Save response for future idempotent calls
            try {
                await saveResponse(key, res.status, body, respTtl);
            } catch (err) {
                // non-fatal: log and continue
                console.error("[idempotency] failed to save response:", err);
            }

            return res;
        } catch (err) {
            console.error("[idempotency] unexpected error:", err);
            return NextResponse.json({ error: "Idempotency handling failed" }, { status: 500 });
        }
    };
}