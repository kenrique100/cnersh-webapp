import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Blocks Server-Side Request Forgery: prevents this server from being used
 * to reach internal/private infrastructure (cloud metadata endpoints,
 * localhost, internal services, etc.) via a user-supplied "preview this link"
 * request.
 */

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

function ipv4ToLong(ip: string): number {
    return ip
        .split(".")
        .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
    const long = ipv4ToLong(ip);
    const ranges: [string, string][] = [
        ["0.0.0.0", "0.255.255.255"],
        ["10.0.0.0", "10.255.255.255"],
        ["100.64.0.0", "100.127.255.255"], // CGNAT
        ["127.0.0.0", "127.255.255.255"], // loopback
        ["169.254.0.0", "169.254.255.255"], // link-local incl. cloud metadata
        ["172.16.0.0", "172.31.255.255"],
        ["192.0.0.0", "192.0.0.255"],
        ["192.168.0.0", "192.168.255.255"],
        ["198.18.0.0", "198.19.255.255"],
        ["224.0.0.0", "255.255.255.255"], // multicast + reserved
    ];
    return ranges.some(
        ([start, end]) => long >= ipv4ToLong(start) && long <= ipv4ToLong(end)
    );
}

function isPrivateIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local fc00::/7
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
        normalized.startsWith("fea") || normalized.startsWith("feb")) return true; // link-local fe80::/10
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — check the embedded IPv4
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIPv4(mapped[1]);
    return false;
}

function isPrivateIP(ip: string): boolean {
    const version = isIP(ip);
    if (version === 4) return isPrivateIPv4(ip);
    if (version === 6) return isPrivateIPv6(ip);
    return true; // unknown format → fail closed
}

/**
 * Throws if the URL points at (or its DNS resolves to) private/internal
 * infrastructure. Call this on the original URL AND on every redirect hop.
 */
export async function assertSafeUrl(urlString: string): Promise<URL> {
    let parsed: URL;
    try {
        parsed = new URL(urlString);
    } catch {
        throw new Error("Invalid URL");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Invalid URL protocol");
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets

    if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
        throw new Error("Blocked hostname");
    }
    if (hostname.toLowerCase().endsWith(".local")) {
        throw new Error("Blocked hostname (mDNS/local)");
    }

    // If the hostname is already a literal IP, validate directly.
    if (isIP(hostname)) {
        if (isPrivateIP(hostname)) throw new Error("Blocked private IP literal");
        return parsed;
    }

    // Otherwise resolve DNS and validate every returned address
    // (defends against DNS rebinding — checking the hostname string alone isn't enough).
    let addresses: { address: string }[];
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

    return parsed;
}