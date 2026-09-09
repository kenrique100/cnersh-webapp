import { lookup } from "node:dns/promises";
import { request as httpRequest, type RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";

/**
 * Blocks Server-Side Request Forgery: prevents this server from being used
 * to reach internal/private infrastructure (cloud metadata endpoints,
 * localhost, internal services, etc.) via user-supplied URLs.
 */

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home", ".lan"];
const BLOCKED_ADDRESSES = new BlockList();

[
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.88.99.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
].forEach(([network, prefix]) => {
    BLOCKED_ADDRESSES.addSubnet(network as string, prefix as number, "ipv4");
});

[
    ["::", 128],
    ["::1", 128],
    ["100::", 64],
    ["2001:db8::", 32],
    ["fc00::", 7],
    ["fe80::", 10],
    ["fec0::", 10],
    ["ff00::", 8],
].forEach(([network, prefix]) => {
    BLOCKED_ADDRESSES.addSubnet(network as string, prefix as number, "ipv6");
});

type SafeResolution = {
    url: URL;
    address: string;
    family: 4 | 6;
};

export interface SafeFetchOptions {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    timeoutMs?: number;
    maxBytes?: number;
}

export interface SafeFetchResult {
    status: number;
    headers: Headers;
    body: Uint8Array;
}

function isPrivateIP(address: string): boolean {
    const family = isIP(address);
    if (family === 4) return BLOCKED_ADDRESSES.check(address, "ipv4");
    if (family === 6) return BLOCKED_ADDRESSES.check(address, "ipv6");
    return true;
}

async function resolveSafeUrl(urlString: string): Promise<SafeResolution> {
    let parsed: URL;
    try {
        parsed = new URL(urlString);
    } catch {
        throw new Error("Invalid URL");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Invalid URL protocol");
    }
    if (parsed.username || parsed.password) {
        throw new Error("URL credentials are not allowed");
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
    const normalizedHostname = hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(normalizedHostname)) {
        throw new Error("Blocked hostname");
    }
    if (normalizedHostname.endsWith(".local")) {
        throw new Error("Blocked hostname (mDNS/local)");
    }
    if (BLOCKED_HOST_SUFFIXES.some((suffix) => normalizedHostname.endsWith(suffix))) {
        throw new Error("Blocked hostname");
    }

    const literalFamily = isIP(hostname);
    if (literalFamily) {
        if (isPrivateIP(hostname)) throw new Error("Blocked private IP literal");
        return { url: parsed, address: hostname, family: literalFamily as 4 | 6 };
    }

    let addresses: Array<{ address: string; family: number }>;
    try {
        addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
        throw new Error("DNS resolution failed");
    }

    if (addresses.length === 0) throw new Error("DNS resolution returned no addresses");
    for (const { address } of addresses) {
        if (isPrivateIP(address)) {
            throw new Error("Blocked: hostname resolves to private/internal address");
        }
    }

    const selected = addresses[0];
    return {
        url: parsed,
        address: selected.address,
        family: (selected.family || isIP(selected.address)) as 4 | 6,
    };
}

/**
 * Validates a URL and every DNS answer. Use fetchSafeUrl for outbound requests:
 * it additionally pins the connection to one of the addresses validated here.
 */
export async function assertSafeUrl(urlString: string): Promise<URL> {
    return (await resolveSafeUrl(urlString)).url;
}

/**
 * Makes a bounded HTTP(S) request while pinning Node's socket lookup to the
 * exact public address that was validated. This closes the DNS rebinding gap
 * between a preflight lookup and a later, independent fetch lookup.
 */
export async function fetchSafeUrl(
    urlString: string,
    options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
    const resolved = await resolveSafeUrl(urlString);
    const { url, address, family } = resolved;
    const maxBytes = options.maxBytes ?? 1024 * 1024;
    const timeoutMs = options.timeoutMs ?? 10_000;

    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
        throw new Error("Invalid response size limit");
    }

    return new Promise<SafeFetchResult>((resolve, reject) => {
        let settled = false;
        const finishReject = (error: Error) => {
            if (settled) return;
            settled = true;
            reject(error);
        };

        const requestOptions: RequestOptions = {
            protocol: url.protocol,
            hostname: url.hostname.replace(/^\[|\]$/g, ""),
            port: url.port || undefined,
            path: `${url.pathname}${url.search}`,
            method: "GET",
            headers: options.headers,
            // Do not let the HTTP client resolve the attacker-controlled name a
            // second time. TLS still verifies/SNIs against url.hostname.
            lookup: (_hostname, _lookupOptions, callback) => {
                callback(null, address, family);
            },
        };

        const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
            requestOptions,
            (response) => {
                const contentLength = Number(response.headers["content-length"]);
                if (Number.isFinite(contentLength) && contentLength > maxBytes) {
                    response.destroy();
                    finishReject(new Error("Response exceeds size limit"));
                    return;
                }

                const chunks: Buffer[] = [];
                let total = 0;
                response.on("data", (chunk: Buffer | Uint8Array | string) => {
                    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                    total += buffer.byteLength;
                    if (total > maxBytes) {
                        response.destroy();
                        finishReject(new Error("Response exceeds size limit"));
                        return;
                    }
                    chunks.push(buffer);
                });
                response.on("error", finishReject);
                response.on("end", () => {
                    if (settled) return;
                    settled = true;
                    const headers = new Headers();
                    for (const [name, value] of Object.entries(response.headers)) {
                        if (Array.isArray(value)) {
                            for (const item of value) headers.append(name, item);
                        } else if (value !== undefined) {
                            headers.set(name, String(value));
                        }
                    }
                    resolve({
                        status: response.statusCode ?? 502,
                        headers,
                        body: Buffer.concat(chunks),
                    });
                });
            }
        );

        request.setTimeout(timeoutMs, () => {
            request.destroy(new Error("Request timed out"));
        });
        request.on("error", finishReject);

        const abort = () => request.destroy(new Error("Request aborted"));
        if (options.signal?.aborted) {
            abort();
        } else {
            options.signal?.addEventListener("abort", abort, { once: true });
        }
        request.end();
    });
}
