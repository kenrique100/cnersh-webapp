import { performBasicMalwareCheck, validateMimeType } from "@/lib/file-validation";

describe("performBasicMalwareCheck", () => {
    it("returns safe: false for an empty buffer", async () => {
        const result = await performBasicMalwareCheck(Buffer.alloc(0), "file.pdf");
        expect(result).toEqual({ safe: false, error: "Empty file" });
    });

    it("returns safe: false for a buffer that exceeds 100MB", async () => {
        const big = Buffer.alloc(101 * 1024 * 1024);
        const result = await performBasicMalwareCheck(big, "file.pdf");
        expect(result).toEqual({
            safe: false,
            error: "File too large for security check",
        });
    });

    it.each([".exe", ".bat", ".cmd", ".sh", ".php", ".ps1", ".vbs", ".jar"])(
        "returns safe: false for %s extension",
        async (ext) => {
            const result = await performBasicMalwareCheck(
                Buffer.from("content"),
                `malware${ext}`,
            );
            expect(result).toEqual({
                safe: false,
                error: "File extension not permitted",
            });
        },
    );

    // --- Dangerous pattern tests must use an extension that passes
    //     SAFE_EXTENSIONS, otherwise the pattern check never runs. ---
    it("returns safe: false when buffer contains <script> tag", async () => {
        const result = await performBasicMalwareCheck(
            Buffer.from('<script src="evil.js">'),
            "file.pdf",
        );
        expect(result).toEqual({
            safe: false,
            error: "File contains potentially dangerous content",
        });
    });

    it("returns safe: false when buffer contains javascript: pattern", async () => {
        const result = await performBasicMalwareCheck(
            Buffer.from('href="javascript:alert(1)"'),
            "file.pdf",
        );
        expect(result).toEqual({
            safe: false,
            error: "File contains potentially dangerous content",
        });
    });

    it("returns safe: false when buffer contains vbscript: pattern", async () => {
        const result = await performBasicMalwareCheck(
            Buffer.from("vbscript:MsgBox"),
            "file.pdf",
        );
        expect(result).toEqual({
            safe: false,
            error: "File contains potentially dangerous content",
        });
    });

    it("returns safe: false when buffer contains on* event handler pattern", async () => {
        const result = await performBasicMalwareCheck(
            Buffer.from("onerror=alert(1)"),
            "file.pdf",
        );
        expect(result).toEqual({
            safe: false,
            error: "File contains potentially dangerous content",
        });
    });

    it("returns safe: false when buffer contains <iframe", async () => {
        const result = await performBasicMalwareCheck(
            Buffer.from('<iframe src="evil.com">'),
            "file.pdf",
        );
        expect(result).toEqual({
            safe: false,
            error: "File contains potentially dangerous content",
        });
    });

    it("returns safe: false when buffer contains eval(", async () => {
        const result = await performBasicMalwareCheck(
            Buffer.from('eval(atob("aGVsbG8="))'),
            "file.pdf",
        );
        expect(result).toEqual({
            safe: false,
            error: "File contains potentially dangerous content",
        });
    });

    it("returns safe: false when buffer contains document.cookie", async () => {
        const result = await performBasicMalwareCheck(
            Buffer.from("document.cookie"),
            "file.pdf",
        );
        expect(result).toEqual({
            safe: false,
            error: "File contains potentially dangerous content",
        });
    });

    it("returns safe: true for a clean PDF buffer", async () => {
        const pdfHeader = Buffer.from([
            0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
        ]);
        const result = await performBasicMalwareCheck(pdfHeader, "document.pdf");
        expect(result).toEqual({ safe: true });
    });

    it("returns safe: true for clean content with an allowed extension", async () => {
        const result = await performBasicMalwareCheck(
            Buffer.from("Hello, world!"),
            "notes.pdf",
        );
        expect(result).toEqual({ safe: true });
    });
});

describe("validateMimeType", () => {
    it("returns true for a valid JPEG buffer", () => {
        const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
        expect(validateMimeType(buffer, "image/jpeg")).toBe(true);
    });

    it("returns false for a buffer that does not match JPEG magic bytes", () => {
        const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
        expect(validateMimeType(buffer, "image/jpeg")).toBe(false);
    });

    it("returns true for a valid PNG buffer", () => {
        const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
        expect(validateMimeType(buffer, "image/png")).toBe(true);
    });

    it("returns true for a valid GIF buffer", () => {
        const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38]);
        expect(validateMimeType(buffer, "image/gif")).toBe(true);
    });

    it("returns true for a valid WebP buffer", () => {
        const buffer = Buffer.from([0x52, 0x49, 0x46, 0x46]);
        expect(validateMimeType(buffer, "image/webp")).toBe(true);
    });

    it("returns true for a valid PDF buffer", () => {
        const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);
        expect(validateMimeType(buffer, "application/pdf")).toBe(true);
    });

    // FIX: implementation returns `false` when there is no signature entry.
    it("returns false for unknown mime type (no signature to check)", () => {
        const buffer = Buffer.from("anything");
        expect(validateMimeType(buffer, "application/unknown")).toBe(false);
    });

    it("returns true for a valid mp4 buffer matching first signature", () => {
        const buffer = Buffer.from([0x00, 0x00, 0x00, 0x18]);
        expect(validateMimeType(buffer, "video/mp4")).toBe(true);
    });

    it("returns true for a valid mp4 buffer matching second signature", () => {
        const buffer = Buffer.from([0x00, 0x00, 0x00, 0x20]);
        expect(validateMimeType(buffer, "video/mp4")).toBe(true);
    });

    it("returns true for a valid WebM buffer", () => {
        const buffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
        expect(validateMimeType(buffer, "video/webm")).toBe(true);
    });

    it("returns true for a valid MP3 buffer (ID3 tag)", () => {
        const buffer = Buffer.from([0x49, 0x44, 0x33]);
        expect(validateMimeType(buffer, "audio/mpeg")).toBe(true);
    });

    it("returns true for a valid WAV buffer", () => {
        const buffer = Buffer.from([0x52, 0x49, 0x46, 0x46]);
        expect(validateMimeType(buffer, "audio/wav")).toBe(true);
    });

    it("returns true for a valid OGG buffer", () => {
        const buffer = Buffer.from([0x4f, 0x67, 0x67, 0x53]);
        expect(validateMimeType(buffer, "audio/ogg")).toBe(true);
    });
});