// src/lib/__tests__/ssrf-guard.test.ts
import { lookup } from 'node:dns/promises';
import { assertSafeUrl } from '../ssrf-guard';

jest.mock('node:dns/promises', () => ({
    lookup: jest.fn(),
}));

// Do NOT mock 'node:net' — isIP is a pure synchronous function
// with no side effects; mocking it causes the module-internal
// calls inside isPrivateIP() to break.

const mockLookup = lookup as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
    // Default: resolves to a safe public address
    mockLookup.mockResolvedValue([{ address: '93.184.216.34' }]);
});

describe('assertSafeUrl', () => {
    it('rejects non-http(s) protocols', async () => {
        await expect(assertSafeUrl('ftp://example.com'))
            .rejects.toThrow('Invalid URL protocol');
    });

    it('rejects blocked hostnames', async () => {
        await expect(assertSafeUrl('http://localhost'))
            .rejects.toThrow('Blocked hostname');
    });

    it('rejects .local hostnames', async () => {
        await expect(assertSafeUrl('http://myhost.local'))
            .rejects.toThrow('Blocked hostname (mDNS/local)');
    });

    it('rejects literal private IPv4', async () => {
        // 10.0.0.1 is a real private IPv4 — isIP('10.0.0.1') returns 4 natively
        await expect(assertSafeUrl('http://10.0.0.1'))
            .rejects.toThrow('Blocked private IP literal');
    });

    it('rejects literal private IPv6 (loopback ::1)', async () => {
        await expect(assertSafeUrl('http://[::1]'))
            .rejects.toThrow('Blocked private IP literal');
    });

    it('rejects literal private IPv4 in 172.16/12 range', async () => {
        await expect(assertSafeUrl('http://172.16.0.1'))
            .rejects.toThrow('Blocked private IP literal');
    });

    it('rejects literal private IPv4 in 192.168/16 range', async () => {
        await expect(assertSafeUrl('http://192.168.1.1'))
            .rejects.toThrow('Blocked private IP literal');
    });

    it('rejects literal link-local / cloud metadata IP', async () => {
        await expect(assertSafeUrl('http://169.254.169.254'))
            .rejects.toThrow('Blocked private IP literal');
    });

    it('resolves DNS and rejects if result is a private IPv4', async () => {
        // 172.16.0.1 is genuinely private — real isIP() returns 4,
        // real isPrivateIPv4() catches it in the 172.16–172.31 range
        mockLookup.mockResolvedValue([{ address: '172.16.0.1' }]);

        await expect(assertSafeUrl('http://internal.example.com'))
            .rejects.toThrow('Blocked: hostname resolves to private/internal address');
    });

    it('resolves DNS and rejects if ANY address is private (mixed results)', async () => {
        mockLookup.mockResolvedValue([
            { address: '93.184.216.34' }, // public
            { address: '10.0.0.1' },      // private — should trigger block
        ]);

        await expect(assertSafeUrl('http://dual-stack.example.com'))
            .rejects.toThrow('Blocked: hostname resolves to private/internal address');
    });

    it('allows a safe public URL (hostname → DNS)', async () => {
        mockLookup.mockResolvedValue([{ address: '93.184.216.34' }]);
        const result = await assertSafeUrl('https://example.com');
        expect(result.href).toBe('https://example.com/');
    });

    it('allows a literal public IPv4', async () => {
        // 93.184.216.34 is public — bypasses DNS, validated directly
        const result = await assertSafeUrl('http://93.184.216.34');
        expect(result.href).toBe('http://93.184.216.34/');
    });

    it('allows a literal public IPv6', async () => {
        // 2606:2800:220:1:248:1893:25c8:1946 is example.com's IPv6
        const result = await assertSafeUrl('http://[2606:2800:220:1:248:1893:25c8:1946]');
        expect(result.href).toBe('http://[2606:2800:220:1:248:1893:25c8:1946]/');
    });

    it('rejects when DNS resolution fails (ENOTFOUND)', async () => {
        mockLookup.mockRejectedValue(new Error('ENOTFOUND'));
        await expect(assertSafeUrl('http://unknown-host.test'))
            .rejects.toThrow('DNS resolution failed');
    });

    it('rejects when DNS returns empty array', async () => {
        mockLookup.mockResolvedValue([]);
        await expect(assertSafeUrl('http://example.com'))
            .rejects.toThrow('DNS resolution returned no addresses');
    });

    it('rejects an invalid URL string', async () => {
        await expect(assertSafeUrl('not a url'))
            .rejects.toThrow('Invalid URL');
    });
});