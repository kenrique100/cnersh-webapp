import { sanitizeFilename } from '../sanitize-filename';

describe('sanitizeFilename', () => {
    describe('path traversal', () => {
        it('removes ../ sequences', () => {
            expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..');
        });

        it('removes ..\\  sequences', () => {
            expect(sanitizeFilename('..\\..\\windows\\system32')).not.toContain('..');
        });

        it('collapses multiple consecutive dots', () => {
            expect(sanitizeFilename('file....txt')).not.toMatch(/\.{2,}/);
        });
    });

    describe('path separators', () => {
        it('removes forward slashes', () => {
            expect(sanitizeFilename('path/to/file.txt')).not.toContain('/');
        });

        it('removes backslashes', () => {
            expect(sanitizeFilename('path\\to\\file.txt')).not.toContain('\\');
        });
    });

    describe('allowed characters', () => {
        it('keeps alphanumeric characters', () => {
            expect(sanitizeFilename('myfile123.txt')).toBe('myfile123.txt');
        });

        it('keeps hyphens and underscores', () => {
            expect(sanitizeFilename('my-file_name.txt')).toBe('my-file_name.txt');
        });

        it('keeps a single dot for extensions', () => {
            expect(sanitizeFilename('report.pdf')).toBe('report.pdf');
        });
    });

    describe('invalid characters', () => {
        it('replaces < and > with underscore', () => {
            const result = sanitizeFilename('file<name>.txt');
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
        });

        it('replaces spaces with underscore', () => {
            expect(sanitizeFilename('my file.txt')).not.toContain(' ');
        });

        it('replaces special characters with underscore', () => {
            const result = sanitizeFilename('file:name*?.txt');
            expect(result).not.toMatch(/[:*?]/);
        });

        it('replaces null bytes', () => {
            const result = sanitizeFilename('file\0name.txt');
            expect(result).not.toContain('\0');
        });
    });

    describe('leading dots', () => {
        it('prefixes hidden files with underscore', () => {
            const result = sanitizeFilename('.htaccess');
            expect(result).not.toMatch(/^\./);
        });
    });

    describe('length limit', () => {
        it('truncates filenames longer than 255 characters', () => {
            const long = 'a'.repeat(300) + '.txt';
            expect(sanitizeFilename(long).length).toBeLessThanOrEqual(255);
        });
    });

    describe('edge cases', () => {
        it('returns "unnamed" for empty string', () => {
            expect(sanitizeFilename('')).toBe('unnamed');
        });

        it('returns "unnamed" for null input', () => {
            expect(sanitizeFilename(null as unknown as string)).toBe('unnamed');
        });

        it('returns "unnamed" for undefined input', () => {
            expect(sanitizeFilename(undefined as unknown as string)).toBe('unnamed');
        });

        it('returns "unnamed" when result is empty after sanitization', () => {
            expect(sanitizeFilename('/')).toBe('unnamed');
        });
    });
});